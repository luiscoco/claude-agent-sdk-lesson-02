export const SDK_VERSION = '0.3.310';
export const SERVER_KEY = 'course';
export const TOOL_NAME = 'lookup_lesson';
export const TOOL_DESCRIPTION =
  'Look up one of the nine course lessons by numeric ID. Return its title and summary, optionally including a practice task.';
export const SDK_TOOL_NAME = `mcp__${SERVER_KEY}__${TOOL_NAME}`;
export const LIVE_PROMPT =
  'Use lookup_lesson to look up Lesson 2 with practice included. Explain the returned lesson title, summary, and practice task.';
export interface CourseLesson {
  id: number;
  title: string;
  summary: string;
  practice: string;
}
export interface Invocation {
  ok: boolean;
  handlerCalls: number;
  arguments: Record<string, unknown>;
  tool: { name: string; description?: string; inputSchema: unknown };
  output: unknown;
  steps: { name: string; detail: string; state: 'success' | 'error' }[];
}
export interface ExportInfo {
  name: string;
  kind: 'function' | 'constant';
  group: string;
  status: 'stable' | 'alpha';
  runtimeType: string;
  purpose: string;
  example: string;
}
export interface Metadata {
  version: string;
  liveAvailable: boolean;
  toolName: string;
  toolDescription: string;
  sdkToolName: string;
  exports: ExportInfo[];
  builtinNames: string[];
  aliases: Record<string, string>;
}
export interface SettingsView {
  rawMode: string;
  filteredMode: string;
  sources: string[];
  projectFixtureLoaded: boolean;
  explanation: string;
}
export type Stage = 'host' | 'agent' | 'stream' | 'result';
export interface MessageView {
  type: string;
  subtype?: string;
  text: string;
  toolName?: string;
  envelope: Record<string, unknown>;
  final?: { ok: boolean; text: string };
}
export type LabEvent =
  | { kind: 'stage'; stage: Stage; text: string }
  | { kind: 'message'; message: MessageView }
  | { kind: 'done'; status: 'success' | 'error' | 'cancelled' }
  | { kind: 'error'; text: string };
export const QUESTIONS = [
  {
    question: 'Which part of a tool contract describes valid arguments?',
    answers: ['The input schema', 'The final result', 'The server configuration key'],
    correct: 0,
    explanation:
      'The schema describes input fields and types. Invalid input should not reach the execute handler.',
  },
  {
    question: 'What does createSdkMcpServer() do in this sample?',
    answers: [
      'It calls a model by itself',
      'It groups the custom tool behind an SDK-hosted MCP server',
      'It replaces the input schema',
    ],
    correct: 1,
    explanation: 'Creating a tool server does not start an agent or make a model request.',
  },
  {
    question: 'How do startup() and prewarm() differ in 0.3.310?',
    answers: [
      'They return the same handle',
      'Both are constants',
      'startup returns a WarmQuery; alpha prewarm returns a spare that is claimed later',
    ],
    correct: 2,
    explanation:
      'Preparation and querying are separate responsibilities; the returned handles and stability labels differ.',
  },
  {
    question: 'What can BUILTIN_TOOL_NAMES tell you?',
    answers: [
      'Which tools every running session can use',
      'Names in a lookup table, not the current session’s availability',
      'Whether every MCP server is connected',
    ],
    correct: 1,
    explanation:
      'Constants are lookup data. Inspect a session and its configuration to determine actual availability.',
  },
] as const;
