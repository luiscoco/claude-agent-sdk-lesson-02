import type { IncomingMessage, ServerResponse } from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { inspectExports } from './exports.js';
import { inspectSettings } from './settings.js';
import { invokeTool } from './invoke.js';
import { runLive } from './live.js';
import { safeError } from './messages.js';
import { PROJECT_ROOT } from './paths.js';
import {
  TOOL_NAME,
  TOOL_DESCRIPTION,
  SDK_TOOL_NAME,
  type LabEvent,
  type Metadata,
} from '../shared/lesson.js';
export function json(response: ServerResponse, status: number, value: unknown) {
  response.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
  });
  response.end(JSON.stringify(value));
}
async function readBody(request: IncomingMessage): Promise<Record<string, unknown>> {
  const chunks: Buffer[] = [];
  let bytes = 0;
  for await (const chunk of request) {
    bytes += Buffer.byteLength(chunk);
    if (bytes > 8192) throw new Error('Input is too large.');
    chunks.push(Buffer.from(chunk));
  }
  const input: unknown = JSON.parse(Buffer.concat(chunks).toString('utf8'));
  if (typeof input !== 'object' || input === null || Array.isArray(input))
    throw new Error('Provide a JSON object.');
  return input as Record<string, unknown>;
}
export interface AppOptions {
  liveAvailable?: boolean;
  liveRunner?: typeof runLive;
  timeoutMs?: number;
}
export function createApiHandler(options: AppOptions = {}) {
  let active = false;
  return async (request: IncomingMessage, response: ServerResponse): Promise<boolean> => {
    const pathname = new URL(request.url ?? '/', 'http://127.0.0.1').pathname;
    if (!pathname.startsWith('/api/')) return false;
    if (request.method === 'GET' && pathname === '/api/meta') {
      const metadata: Metadata = {
        ...(await inspectExports()),
        liveAvailable: options.liveAvailable ?? Boolean(process.env.ANTHROPIC_API_KEY?.trim()),
        toolName: TOOL_NAME,
        toolDescription: TOOL_DESCRIPTION,
        sdkToolName: SDK_TOOL_NAME,
      };
      json(response, 200, metadata);
      return true;
    }
    if (request.method === 'GET' && pathname === '/api/source') {
      json(response, 200, {
        filename: 'src/server/course-tool.ts',
        content: await readFile(path.join(PROJECT_ROOT, 'src/server/course-tool.ts'), 'utf8'),
      });
      return true;
    }
    if (
      request.method !== 'POST' ||
      !['/api/invoke', '/api/settings', '/api/live'].includes(pathname)
    ) {
      json(response, 404, { error: 'Unknown API endpoint.' });
      return true;
    }
    if (request.headers.origin && request.headers.origin !== `http://${request.headers.host}`) {
      json(response, 403, { error: 'Cross-origin requests are not allowed.' });
      return true;
    }
    if (!request.headers['content-type']?.startsWith('application/json')) {
      json(response, 415, { error: 'Send application/json.' });
      return true;
    }
    let input: Record<string, unknown>;
    try {
      input = await readBody(request);
    } catch {
      json(response, 400, { error: 'Provide a JSON object no larger than 8 KB.' });
      return true;
    }
    if (pathname === '/api/invoke') {
      const args = input.arguments;
      if (typeof args !== 'object' || args === null || Array.isArray(args)) {
        json(response, 400, {
          error: 'Tool arguments must be a JSON object. Fields are validated by the tool’s schema.',
        });
        return true;
      }
      json(response, 200, await invokeTool(args as Record<string, unknown>));
      return true;
    }
    if (pathname === '/api/settings') {
      json(response, 200, await inspectSettings());
      return true;
    }
    if (!(options.liveAvailable ?? Boolean(process.env.ANTHROPIC_API_KEY?.trim()))) {
      json(response, 409, {
        error:
          'Live agent mode requires ANTHROPIC_API_KEY in the server .env file. The tool workshop works without a model key.',
      });
      return true;
    }
    const prompt = typeof input.prompt === 'string' ? input.prompt.trim() : '';
    if (prompt.length < 10 || prompt.length > 2000) {
      json(response, 400, { error: 'Use a prompt between 10 and 2,000 characters.' });
      return true;
    }
    if (active) {
      json(response, 409, { error: 'A live query is already running. Stop it first.' });
      return true;
    }
    active = true;
    const controller = new AbortController();
    const disconnected = () => controller.abort();
    response.on('close', disconnected);
    const timer = setTimeout(() => controller.abort(), options.timeoutMs ?? 90000);
    response.writeHead(200, {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-store',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    });
    response.flushHeaders();
    const send = (event: LabEvent) => {
      if (!response.destroyed) response.write(`data: ${JSON.stringify(event)}\n\n`);
    };
    const heartbeat = setInterval(() => {
      if (!response.destroyed) response.write(': waiting\n\n');
    }, 10000);
    let status: 'success' | 'error' | 'cancelled' = 'error';
    try {
      for await (const event of (options.liveRunner ?? runLive)({
        prompt,
        signal: controller.signal,
      })) {
        if (event.kind === 'message' && event.message.final)
          status = event.message.final.ok ? 'success' : 'error';
        send(event);
      }
    } catch (error) {
      status = controller.signal.aborted ? 'cancelled' : 'error';
      send({
        kind: 'error',
        text:
          status === 'cancelled' ? 'The live query was cancelled or timed out.' : safeError(error),
      });
    } finally {
      clearTimeout(timer);
      clearInterval(heartbeat);
      controller.abort();
      active = false;
      send({ kind: 'done', status });
      response.off('close', disconnected);
      response.end();
    }
    return true;
  };
}
