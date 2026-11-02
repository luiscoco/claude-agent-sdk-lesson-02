import { query, type Query, type SDKMessage } from '@anthropic-ai/claude-agent-sdk';
import { createCourseServer } from './course-tool.js';
import { presentMessage } from './messages.js';
import { SETTINGS_FIXTURE } from './paths.js';
import { SERVER_KEY, SDK_TOOL_NAME, type LabEvent } from '../shared/lesson.js';
export type QueryFactory = (
  input: Parameters<typeof query>[0],
) => AsyncIterable<SDKMessage> & Pick<Query, 'close'>;

export async function* runLive({
  prompt,
  signal,
  queryFactory = query,
}: {
  prompt: string;
  signal: AbortSignal;
  queryFactory?: QueryFactory;
}): AsyncGenerator<LabEvent> {
  const hosted = createCourseServer();
  const controller = new AbortController();
  const abort = () => controller.abort();
  signal.addEventListener('abort', abort, { once: true });
  let handle: ReturnType<QueryFactory> | undefined;
  let sawResult = false;
  try {
    signal.throwIfAborted();
    yield {
      kind: 'stage',
      stage: 'host',
      text: `The host registers the server under "${SERVER_KEY}".`,
    };
    handle = queryFactory({
      prompt,
      options: {
        cwd: SETTINGS_FIXTURE,
        tools: [],
        mcpServers: { [SERVER_KEY]: hosted },
        allowedTools: [SDK_TOOL_NAME],
        permissionMode: 'dontAsk',
        settingSources: [],
        persistSession: false,
        maxTurns: 4,
        maxBudgetUsd: 0.25,
        abortController: controller,
        ...(process.env.ANTHROPIC_MODEL ? { model: process.env.ANTHROPIC_MODEL } : {}),
        systemPrompt:
          'Use the course lookup tool to answer course questions. Do not invent lesson details. Keep the answer concise.',
      },
    });
    yield {
      kind: 'stage',
      stage: 'agent',
      text: 'Claude can discover the registered custom tool; no built-in file or command tools are enabled.',
    };
    for await (const message of handle) {
      signal.throwIfAborted();
      const view = presentMessage(message);
      yield { kind: 'message', message: view };
      if (view.final) {
        sawResult = true;
        break;
      }
    }
    if (!sawResult) throw new Error('The SDK stream ended without a result.');
  } finally {
    controller.abort();
    handle?.close();
    signal.removeEventListener('abort', abort);
    await hosted.instance.close();
  }
}
