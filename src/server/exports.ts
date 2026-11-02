import * as sdk from '@anthropic-ai/claude-agent-sdk';
import { readFile } from 'node:fs/promises';
import { SDK_VERSION, type ExportInfo, type Metadata } from '../shared/lesson.js';

const entries: Omit<ExportInfo, 'runtimeType'>[] = [
  {
    name: 'query',
    kind: 'function',
    group: 'Run',
    status: 'stable',
    purpose: 'Start an agent query and consume its streamed SDK messages.',
    example:
      'const q = query({ prompt, options });\ntry {\n  for await (const msg of q) console.log(msg.type);\n} finally { q.close(); }',
  },
  {
    name: 'startup',
    kind: 'function',
    group: 'Prepare',
    status: 'stable',
    purpose: 'Prepare a known session and receive a WarmQuery; send its prompt later.',
    example:
      'const warm = await startup({ options });\nconst q = warm.query(prompt);\n// Consume q, then close q and warm.',
  },
  {
    name: 'prewarm',
    kind: 'function',
    group: 'Prepare',
    status: 'alpha',
    purpose:
      'Park a spare process before its session is known, then claim it later. This is a different handle from startup().',
    example:
      'const spare = await prewarm({ options });\n// Handle spare.claimed rejection and close unused spares.\nconst q = spare.claim({ prompt, options: { cwd } });',
  },
  {
    name: 'tool',
    kind: 'function',
    group: 'Extend',
    status: 'stable',
    purpose: 'Define a named capability, its description, input schema, and async handler.',
    example: 'const lookup = tool(name, description, schema, handler);',
  },
  {
    name: 'createSdkMcpServer',
    kind: 'function',
    group: 'Extend',
    status: 'stable',
    purpose:
      'Group tool definitions in an SDK-hosted MCP server. Creating it does not start a model query.',
    example:
      "const server = createSdkMcpServer({\n  name: 'course-catalog', version: '1.0.0', tools: [lookup]\n});",
  },
  {
    name: 'resolveSettings',
    kind: 'function',
    group: 'Configure',
    status: 'alpha',
    purpose:
      'Inspect the merged configuration without starting a model query. Raw settings are not a permission decision.',
    example: "const resolved = await resolveSettings({ cwd, settingSources: ['project'] });",
  },
  {
    name: 'filterEscalatingDefaultMode',
    kind: 'function',
    group: 'Configure',
    status: 'alpha',
    purpose:
      'Apply the SDK trust-tier filter to an escalating default permission mode from project settings.',
    example: 'const effective = filterEscalatingDefaultMode(resolved);',
  },
  {
    name: 'BUILTIN_TOOL_NAMES',
    kind: 'constant',
    group: 'Look up',
    status: 'stable',
    purpose:
      'Look up built-in tool names. The table does not prove availability in a particular session.',
    example: "BUILTIN_TOOL_NAMES.includes('Read');",
  },
  {
    name: 'LEGACY_TOOL_NAME_ALIASES',
    kind: 'constant',
    group: 'Look up',
    status: 'stable',
    purpose: 'Map earlier tool names to their canonical names for compatibility.',
    example: "const canonical = LEGACY_TOOL_NAME_ALIASES['Task'];",
  },
];
export async function inspectExports(): Promise<
  Pick<Metadata, 'version' | 'exports' | 'builtinNames' | 'aliases'>
> {
  const manifest = JSON.parse(
    await readFile(
      new URL('./package.json', import.meta.resolve('@anthropic-ai/claude-agent-sdk')),
      'utf8',
    ),
  ) as { version: string };
  if (manifest.version !== SDK_VERSION)
    throw new Error('Install the course-pinned SDK with npm ci.');
  const namespace = sdk as unknown as Record<string, unknown>;
  return {
    version: manifest.version,
    exports: entries.map((entry) => {
      const runtimeType = typeof namespace[entry.name];
      if (runtimeType === 'undefined') throw new Error(`Expected export missing: ${entry.name}`);
      return { ...entry, runtimeType };
    }),
    builtinNames: [...sdk.BUILTIN_TOOL_NAMES],
    aliases: { ...sdk.LEGACY_TOOL_NAME_ALIASES },
  };
}
