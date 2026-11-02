import { existsSync } from 'node:fs';
import { loadEnvFile } from 'node:process';
import path from 'node:path';
import { runLive } from '../server/live.js';
import { PROJECT_ROOT } from '../server/paths.js';
import { LIVE_PROMPT } from '../shared/lesson.js';
if (existsSync(path.join(PROJECT_ROOT, '.env'))) loadEnvFile(path.join(PROJECT_ROOT, '.env'));
if (!process.env.ANTHROPIC_API_KEY?.trim())
  throw new Error('Set your server ANTHROPIC_API_KEY, or use npm run tool:demo without a model.');
const controller = new AbortController();
const stop = () => controller.abort();
process.once('SIGINT', stop);
try {
  for await (const event of runLive({ prompt: LIVE_PROMPT, signal: controller.signal })) {
    if (event.kind === 'message') {
      console.log(event.message.type, event.message.subtype ?? '');
      if (event.message.final) {
        console.log(event.message.final.text);
        if (!event.message.final.ok) process.exitCode = 1;
      }
    }
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : 'Query failed.');
  process.exitCode = 1;
} finally {
  process.off('SIGINT', stop);
}
