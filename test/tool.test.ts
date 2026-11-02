import { test } from 'node:test';
import assert from 'node:assert/strict';
import { invokeTool } from '../src/server/invoke.js';
import { LESSONS } from '../src/server/catalog.js';
test('actual SDK tool returns an MCP envelope and optional structured practice data', async () => {
  const result = await invokeTool({ lessonId: 2, includePractice: true });
  assert.equal(result.ok, true);
  assert.equal(result.handlerCalls, 1);
  const output = result.output as {
    structuredContent: { title: string; practice: string };
    content: { type: string; text: string }[];
    isError: boolean;
  };
  assert.equal(output.structuredContent.title, 'Core Exports and Main APIs');
  assert.match(output.structuredContent.practice, /read-only tool/);
  assert.equal(output.content[0]?.type, 'text');
  assert.equal(output.isError, false);
  assert.deepEqual(
    result.steps.map((x) => x.name),
    ['initialize', 'tools/list', 'tools/call', 'execute', 'result'],
  );
});
test('the Zod default reaches the actual handler through MCP', async () => {
  const result = await invokeTool({ lessonId: 1 });
  const output = result.output as { structuredContent: Record<string, unknown> };
  assert.equal(result.ok, true);
  assert.equal(Object.hasOwn(output.structuredContent, 'practice'), false);
});
for (const [name, input] of Object.entries({
  string: { lessonId: '2' },
  missing: {},
  low: { lessonId: 0 },
  high: { lessonId: 10 },
  fraction: { lessonId: 1.5 },
  boolean: { lessonId: 2, includePractice: 'yes' },
  null: { lessonId: null },
})) {
  test(`schema rejects ${name} input before executing the handler`, async () => {
    const result = await invokeTool(input);
    assert.equal(result.ok, false);
    assert.equal(result.handlerCalls, 0);
    assert.equal(
      result.steps.some((x) => x.name === 'execute'),
      false,
    );
    assert.match(JSON.stringify(result.output), /validation|invalid/i);
  });
}
test('every bounded catalog ID is implemented', async () => {
  for (const lesson of LESSONS) {
    const result = await invokeTool({ lessonId: lesson.id });
    assert.equal(result.ok, true);
    assert.equal(result.handlerCalls, 1);
  }
});
test('separate MCP sessions do not share handler counters', async () => {
  const [a, b] = await Promise.all([
    invokeTool({ lessonId: 2 }),
    invokeTool({ lessonId: 'wrong' }),
  ]);
  assert.equal(a.handlerCalls, 1);
  assert.equal(b.handlerCalls, 0);
});
test('discovered JSON schema matches the executable contract', async () => {
  const result = await invokeTool({ lessonId: 3 });
  const schema = result.tool.inputSchema as {
    properties: {
      lessonId: { type: string; minimum: number; maximum: number };
      includePractice: { default: boolean };
    };
    required: string[];
  };
  assert.equal(schema.properties.lessonId.type, 'integer');
  assert.equal(schema.properties.lessonId.minimum, 1);
  assert.equal(schema.properties.lessonId.maximum, 9);
  assert.equal(schema.properties.includePractice.default, false);
  assert.deepEqual(schema.required, ['lessonId']);
});
