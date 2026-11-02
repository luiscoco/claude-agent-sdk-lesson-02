import './style.css';
import './course-theme.css';
import './course-theme.js';
import {
  QUESTIONS,
  LIVE_PROMPT,
  type Invocation,
  type Metadata,
  type SettingsView,
  type LabEvent,
} from '../shared/lesson.js';
import { observeCode } from './highlight.js';
import { renderMarkdown } from './markdown.js';
import { createEventParser } from '../shared/sse.js';
const el = <T extends HTMLElement = HTMLElement>(s: string): T => {
  const x = document.querySelector<T>(s);
  if (!x) throw new Error(`Missing element ${s}`);
  return x;
};
function node<K extends keyof HTMLElementTagNameMap>(tag: K, text?: string, className?: string) {
  const x = document.createElement(tag);
  if (text !== undefined) x.textContent = text;
  if (className) x.className = className;
  return x;
}
let metadata: Metadata;
let lastInvocation: Invocation | undefined;
let liveController: AbortController | undefined;
observeCode();
const tabs = [...document.querySelectorAll<HTMLButtonElement>('[role=tab]')];
function selectTab(tab: HTMLButtonElement) {
  for (const x of tabs) {
    const active = x === tab;
    x.setAttribute('aria-selected', String(active));
    x.tabIndex = active ? 0 : -1;
    el(`#panel-${x.dataset.tab}`).hidden = !active;
  }
}
for (const tab of tabs) {
  tab.addEventListener('click', () => selectTab(tab));
  tab.addEventListener('keydown', (event) => {
    let next: HTMLButtonElement | undefined;
    const i = tabs.indexOf(tab);
    if (event.key === 'ArrowRight') next = tabs[(i + 1) % tabs.length];
    if (event.key === 'ArrowLeft') next = tabs[(i - 1 + tabs.length) % tabs.length];
    if (event.key === 'Home') next = tabs[0];
    if (event.key === 'End') next = tabs.at(-1);
    if (next) {
      event.preventDefault();
      selectTab(next);
      next.focus();
    }
  });
}
function notice(text = '') {
  el('#notice').textContent = text;
  el('#notice').hidden = !text;
}
async function post<T>(url: string, body: unknown): Promise<T> {
  const r = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await r.json();
  if (!r.ok) throw new Error(data.error ?? 'The local host could not complete the request.');
  return data as T;
}
const presets: Record<string, unknown> = {
  valid: { lessonId: 2, includePractice: true },
  wrong: { lessonId: '2' },
  missing: { includePractice: true },
};
for (const button of document.querySelectorAll<HTMLButtonElement>('[data-preset]'))
  button.addEventListener('click', () => {
    el<HTMLTextAreaElement>('#arguments').value = JSON.stringify(
      presets[button.dataset.preset ?? 'valid'],
      null,
      2,
    );
  });
el<HTMLFormElement>('#invoke-form').addEventListener('submit', (event) => {
  event.preventDefault();
  void callTool();
});
async function callTool() {
  const button = el<HTMLButtonElement>('#invoke');
  if (button.disabled) return;
  notice();
  button.disabled = true;
  const status = el('#call-status');
  status.textContent = 'Calling';
  status.className = 'status running';
  lastInvocation = undefined;
  el<HTMLButtonElement>('#export').disabled = true;
  el('#lesson-result').hidden = true;
  el('#call-steps').replaceChildren();
  el('#handler-count').textContent = '0 handler calls';
  el('#validation-summary').textContent = 'Preparing the request…';
  el('#empty-state').hidden = false;
  let sent = false;
  try {
    let args: unknown;
    try {
      args = JSON.parse(el<HTMLTextAreaElement>('#arguments').value);
    } catch {
      throw new Error('The arguments are not valid JSON. Fix the syntax before sending them.');
    }
    sent = true;
    const result = await post<Invocation>('/api/invoke', { arguments: args });
    lastInvocation = result;
    el('#empty-state').hidden = true;
    el('#handler-count').textContent =
      `${result.handlerCalls} handler call${result.handlerCalls === 1 ? '' : 's'}`;
    status.textContent = result.ok ? 'Tool returned' : 'Input rejected';
    status.className = `status ${result.ok ? 'success' : 'error'}`;
    for (const step of document.querySelectorAll<HTMLElement>('[data-stage]'))
      step.classList.toggle('active', step.dataset.stage === (result.ok ? 'result' : 'schema'));
    el('#validation-summary').textContent = result.ok
      ? 'The schema accepted the input; the typed handler returned data.'
      : result.handlerCalls === 0
        ? 'Rejected before execution: the handler was not called.'
        : 'The handler returned an error.';
    el('#schema-output').textContent = JSON.stringify(result.tool.inputSchema, null, 2);
    el('#tool-output').textContent = JSON.stringify(result.output, null, 2);
    const list = el('#call-steps');
    list.replaceChildren();
    for (const step of result.steps) {
      const li = node('li', undefined, step.state);
      li.append(node('code', step.name), node('span', step.detail));
      list.append(li);
    }
    const output = result.output as {
      structuredContent?: { id?: number; title?: string; summary?: string; practice?: string };
    };
    el('#lesson-result').hidden = !result.ok;
    if (result.ok && output.structuredContent) {
      const lesson = output.structuredContent;
      el('#lesson-id').textContent = `LESSON ${lesson.id ?? ''}`;
      el('#lesson-title').textContent = lesson.title ?? '';
      el('#lesson-summary').textContent = lesson.summary ?? '';
      el('#lesson-practice').textContent = lesson.practice ? `Practice: ${lesson.practice}` : '';
    }
    el<HTMLButtonElement>('#export').disabled = false;
  } catch (error) {
    status.textContent = 'Request error';
    status.className = 'status error';
    el('#validation-summary').textContent = sent
      ? 'No tool result was received.'
      : 'The request was not sent; fix the JSON syntax.';
    el('#handler-count').textContent = sent ? 'handler count unavailable' : '0 handler calls';
    notice(error instanceof Error ? error.message : 'The call failed.');
  } finally {
    button.disabled = false;
  }
}
el('#export').addEventListener('click', () => {
  if (!lastInvocation) return;
  const blob = new Blob(
    [
      JSON.stringify(
        {
          sdkVersion: metadata.version,
          transport: 'real in-memory MCP',
          modelQuery: false,
          ...lastInvocation,
        },
        null,
        2,
      ),
    ],
    { type: 'application/json' },
  );
  const url = URL.createObjectURL(blob);
  const link = node('a');
  link.href = url;
  link.download = 'lesson-02-tool-trace.json';
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
});
function exportsView(group = 'all') {
  const grid = el('#exports-grid');
  grid.replaceChildren();
  for (const item of metadata.exports.filter((x) => group === 'all' || x.group === group)) {
    const card = node('article', undefined, 'card package-card');
    const top = node('div', undefined, 'package-top');
    top.append(
      node('h3', item.name + (item.kind === 'function' ? '()' : '')),
      node(
        'span',
        item.status === 'alpha' ? 'alpha' : 'stable',
        `tag ${item.status === 'alpha' ? 'alpha' : ''}`,
      ),
    );
    card.append(
      node('p', item.group.toUpperCase(), 'eyebrow'),
      top,
      node('span', `${item.kind} · typeof ${item.runtimeType}`, 'runtime-kind'),
      node('p', item.purpose),
    );
    const code = node('pre', undefined, 'code-light');
    code.dataset.lang = 'ts';
    code.append(node('code', item.example));
    card.append(code);
    grid.append(card);
  }
}
for (const button of document.querySelectorAll<HTMLButtonElement>('[data-filter]'))
  button.addEventListener('click', () => {
    for (const x of document.querySelectorAll<HTMLElement>('[data-filter]'))
      x.setAttribute('aria-pressed', String(x === button));
    exportsView(button.dataset.filter);
  });
function nameLookup() {
  const value = el<HTMLInputElement>('#name-lookup').value.trim();
  const alias = Object.hasOwn(metadata.aliases, value);
  const canonical = alias ? metadata.aliases[value]! : value;
  const builtin = metadata.builtinNames.includes(canonical);
  const target = el('#name-result');
  target.replaceChildren();
  target.append(
    node(
      'p',
      alias
        ? `Compatibility alias: ${value} → ${canonical}`
        : canonical === metadata.sdkToolName
          ? 'Registered MCP tool in this sample'
          : builtin
            ? 'Known built-in name'
            : 'No match in these lookup tables',
      'lookup-summary',
    ),
  );
  const pre = node('pre', undefined, 'code-light');
  pre.dataset.lang = 'json';
  pre.append(
    node(
      'code',
      JSON.stringify(
        {
          input: value,
          canonical,
          builtinName: builtin,
          legacyAlias: alias,
          sessionAvailability: 'inspect the session',
        },
        null,
        2,
      ),
    ),
  );
  target.append(pre);
}
el('#name-lookup').addEventListener('input', () => {
  if (metadata) nameLookup();
});
el('#settings-run').addEventListener('click', () => {
  void settings();
});
async function settings() {
  const button = el<HTMLButtonElement>('#settings-run');
  button.disabled = true;
  try {
    const data = await post<SettingsView>('/api/settings', {});
    el('#settings-results').hidden = false;
    el('#raw-mode').textContent = data.rawMode;
    el('#filtered-mode').textContent = data.filteredMode;
    el('#settings-explanation').textContent = data.explanation;
    el('#settings-json').textContent = JSON.stringify(data, null, 2);
  } catch (error) {
    el('#settings-results').hidden = false;
    el('#settings-explanation').textContent =
      error instanceof Error ? error.message : 'Settings inspection failed.';
  } finally {
    button.disabled = false;
  }
}
el('#live-run').addEventListener('click', () => {
  void runLive();
});
el('#live-stop').addEventListener('click', () => liveController?.abort());
async function runLive() {
  if (liveController) return;
  liveController = new AbortController();
  el<HTMLButtonElement>('#live-run').disabled = true;
  el<HTMLButtonElement>('#live-stop').disabled = false;
  el('#live-events').textContent = '';
  el('#live-result').textContent = '';
  el('#live-result').classList.remove('markdown');
  el('#live-status').textContent = 'Starting real SDK query…';
  let gotDone = false;
  try {
    const response = await fetch('/api/live', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: el<HTMLTextAreaElement>('#live-prompt').value }),
      signal: liveController.signal,
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error ?? 'The live query could not start.');
    }
    if (!response.body) throw new Error('Response streaming is unavailable.');
    const parse = createEventParser((value) => {
      const item = value as LabEvent;
      if (item.kind === 'stage') el('#live-status').textContent = item.text;
      if (item.kind === 'message') {
        el('#live-events').textContent +=
          `${item.message.type}${item.message.subtype ? ' / ' + item.message.subtype : ''}${item.message.toolName ? ' / ' + item.message.toolName : ''}\n`;
        const final = item.message.final;
        if (final) {
          // Successful results are model Markdown; error text stays literal.
          if (final.ok) renderMarkdown(el('#live-result'), final.text);
          else el('#live-result').textContent = final.text;
          el('#live-result').classList.toggle('markdown', final.ok);
        }
      }
      if (item.kind === 'error') el('#live-status').textContent = item.text;
      if (item.kind === 'done') {
        gotDone = true;
        el('#live-status').textContent = `Live query: ${item.status}`;
      }
    });
    const decoder = new TextDecoder();
    const reader = response.body.getReader();
    for (;;) {
      const chunk = await reader.read();
      if (chunk.done) break;
      parse(decoder.decode(chunk.value, { stream: true }));
    }
    parse(decoder.decode());
    if (!gotDone) throw new Error('The connection ended before completion.');
  } catch (error) {
    el('#live-status').textContent = liveController.signal.aborted
      ? 'Live query cancelled.'
      : error instanceof Error
        ? error.message
        : 'Live query failed.';
  } finally {
    liveController = undefined;
    el<HTMLButtonElement>('#live-run').disabled = !metadata.liveAvailable;
    el<HTMLButtonElement>('#live-stop').disabled = true;
  }
}
function quiz() {
  for (const [i, q] of QUESTIONS.entries()) {
    const field = node('fieldset');
    field.append(node('legend', `${i + 1}. ${q.question}`));
    for (const [j, answer] of q.answers.entries()) {
      const label = node('label');
      const input = node('input');
      input.type = 'radio';
      input.name = `q${i}`;
      input.value = String(j);
      input.required = true;
      label.append(input, node('span', answer));
      field.append(label);
    }
    const feedback = node('p', undefined, 'quiz-feedback');
    feedback.id = `feedback-${i}`;
    feedback.hidden = true;
    field.append(feedback);
    el('#quiz-questions').append(field);
  }
  el<HTMLFormElement>('#quiz').addEventListener('submit', (e) => {
    e.preventDefault();
    const data = new FormData(el<HTMLFormElement>('#quiz'));
    let score = 0;
    QUESTIONS.forEach((q, i) => {
      const correct = data.get(`q${i}`) === String(q.correct);
      if (correct) score++;
      const feedback = el(`#feedback-${i}`);
      feedback.hidden = false;
      feedback.textContent = `${correct ? 'Correct.' : 'Review this one.'} ${q.explanation}`;
      feedback.className = `quiz-feedback ${correct ? 'correct' : 'incorrect'}`;
    });
    el('#quiz-score').textContent = `${score} / ${QUESTIONS.length} correct`;
  });
  el('#quiz').addEventListener('reset', () => {
    el('#quiz-score').textContent = '';
    for (const item of document.querySelectorAll<HTMLElement>('.quiz-feedback')) item.hidden = true;
  });
}
quiz();
async function boot() {
  const response = await fetch('/api/meta');
  if (!response.ok) throw new Error('Could not load the pinned SDK exports. Check the local host.');
  metadata = (await response.json()) as Metadata;
  el('#version').textContent = `SDK ${metadata.version}`;
  el('#tool-description').textContent = metadata.toolDescription;
  exportsView();
  nameLookup();
  el('#constants-json').textContent = JSON.stringify(
    { BUILTIN_TOOL_NAMES: metadata.builtinNames, LEGACY_TOOL_NAME_ALIASES: metadata.aliases },
    null,
    2,
  );
  el<HTMLButtonElement>('#invoke').disabled = false;
  el<HTMLTextAreaElement>('#live-prompt').value = LIVE_PROMPT;
  el<HTMLTextAreaElement>('#live-prompt').readOnly = !metadata.liveAvailable;
  el<HTMLButtonElement>('#live-run').disabled = !metadata.liveAvailable;
  if (metadata.liveAvailable)
    el('#live-help').textContent =
      'Real model requests use the server key. SDK limits: four turns, $0.25 budget setting, and a 90-second host timeout. Charges may apply.';
  const source = (await (await fetch('/api/source')).json()) as { content: string };
  el('#tool-source').textContent = source.content;
}
void boot().catch((error) =>
  notice(error instanceof Error ? error.message : 'The workbench could not load.'),
);
