/** Compile-checked preparation entry points; importing this file runs nothing. */
import { query, startup, prewarm, type Options } from '@anthropic-ai/claude-agent-sdk';
export const runNow = (prompt: string, options: Options) => query({ prompt, options });
export const prepareKnownSession = (options: Options) => startup({ options }); // Promise<WarmQuery>
export const prepareUnclaimedProcess = (options: Options) => prewarm({ options }); // alpha Promise<SpareProcess>
// WarmQuery.query(prompt) sends to its known session. SpareProcess.claim(...) binds later.
// Callers own handle cleanup and must handle spare.claimed rejections.
// The UI explains these lifecycles; it does not execute or benchmark preparation.
