import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { createCourseServer } from './course-tool.js';
import { TOOL_NAME, type Invocation } from '../shared/lesson.js';
import { safeError } from './messages.js';

/** Real MCP initialize/list/call round trip; no model or query() involved. */
export async function invokeTool(args: Record<string, unknown>): Promise<Invocation> {
  let handlerCalls = 0;
  const steps: Invocation['steps'] = [];
  const hosted = createCourseServer(() => {
    handlerCalls++;
    steps.push({
      name: 'execute',
      detail: 'The typed handler ran and read the local course catalog.',
      state: 'success',
    });
  });
  const client = new Client({ name: 'lesson-02-workshop', version: '1.0.0' });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  try {
    await hosted.instance.connect(serverTransport);
    await client.connect(clientTransport);
    steps.push({
      name: 'initialize',
      detail: 'A real MCP client connected to the SDK-hosted server in memory.',
      state: 'success',
    });
    const listing = await client.listTools();
    const definition = listing.tools.find((item) => item.name === TOOL_NAME);
    if (!definition) throw new Error('The hosted server did not expose lookup_lesson.');
    steps.push({
      name: 'tools/list',
      detail: 'The client discovered the tool description and JSON input schema.',
      state: 'success',
    });
    let output: unknown;
    let ok = false;
    steps.push({
      name: 'tools/call',
      detail:
        'Arguments were sent through MCP; the server validates its Zod contract before dispatch.',
      state: 'success',
    });
    try {
      const result = await client.callTool({ name: TOOL_NAME, arguments: args });
      output = result;
      ok = result.isError !== true;
    } catch (error) {
      output = { isError: true, error: safeError(error) };
    }
    steps.push({
      name: 'result',
      detail: ok
        ? 'The tool returned an MCP content envelope with structured lesson data.'
        : handlerCalls === 0
          ? 'Input was rejected before the handler ran.'
          : 'The handler reported an execution error.',
      state: ok ? 'success' : 'error',
    });
    return {
      ok,
      handlerCalls,
      arguments: args,
      tool: {
        name: definition.name,
        description: definition.description,
        inputSchema: definition.inputSchema,
      },
      output,
      steps,
    };
  } finally {
    await client.close();
    await hosted.instance.close();
  }
}
