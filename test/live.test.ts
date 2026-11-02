import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { SDKMessage } from '@anthropic-ai/claude-agent-sdk';
import { runLive, type QueryFactory } from '../src/server/live.js';
import { LIVE_PROMPT } from '../src/shared/lesson.js';
async function drain(stream: ReturnType<typeof runLive>) {
  const values = [];
  for await (const x of stream) values.push(x);
  return values;
}
test('query registers the SDK-hosted server and the precise MCP tool name', async () => {
  let closed = 0;
  const events = await drain(
    runLive({
      prompt: LIVE_PROMPT,
      signal: new AbortController().signal,
      queryFactory(request) {
        assert.equal(request.prompt, LIVE_PROMPT);
        assert.deepEqual(request.options?.tools, []);
        assert.deepEqual(request.options?.allowedTools, ['mcp__course__lookup_lesson']);
        assert.equal(request.options?.mcpServers?.course?.type, 'sdk');
        assert.deepEqual(request.options?.settingSources, []);
        assert.equal(request.options?.maxBudgetUsd, 0.25);
        return Object.assign(
          (async function* () {
            yield {
              type: 'result',
              subtype: 'success',
              is_error: false,
              result: 'Lesson 2',
            } as SDKMessage;
          })(),
          {
            close() {
              closed++;
            },
          },
        );
      },
    }),
  );
  assert.equal(closed, 1);
  assert.ok(events.some((x) => x.kind === 'message' && x.message.final?.ok));
});
test('a failed model stream still closes its query handle', async () => {
  let closed = 0;
  const factory: QueryFactory = () =>
    Object.assign(
      (async function* (): AsyncGenerator<SDKMessage> {
        throw new Error('Model unavailable');
      })(),
      {
        close() {
          closed++;
        },
      },
    );
  await assert.rejects(
    drain(
      runLive({ prompt: LIVE_PROMPT, signal: new AbortController().signal, queryFactory: factory }),
    ),
    /Model unavailable/,
  );
  assert.equal(closed, 1);
});
test('a stream without a result is not silently successful', async () => {
  const factory: QueryFactory = () =>
    Object.assign(
      (async function* (): AsyncGenerator<SDKMessage> {
        yield { type: 'system', subtype: 'init' } as SDKMessage;
      })(),
      { close() {} },
    );
  await assert.rejects(
    drain(
      runLive({ prompt: LIVE_PROMPT, signal: new AbortController().signal, queryFactory: factory }),
    ),
    /without a result/,
  );
});
test('a pre-aborted live request never starts query()', async () => {
  const controller = new AbortController();
  controller.abort();
  let calls = 0;
  await assert.rejects(
    drain(
      runLive({
        prompt: LIVE_PROMPT,
        signal: controller.signal,
        queryFactory() {
          calls++;
          throw new Error('must not run');
        },
      }),
    ),
    /abort/i,
  );
  assert.equal(calls, 0);
});
