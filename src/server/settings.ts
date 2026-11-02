import { resolveSettings, filterEscalatingDefaultMode } from '@anthropic-ai/claude-agent-sdk';
import { SETTINGS_FIXTURE } from './paths.js';
import type { SettingsView } from '../shared/lesson.js';

export async function inspectSettings(): Promise<SettingsView> {
  const resolved = await resolveSettings({ cwd: SETTINGS_FIXTURE, settingSources: ['project'] });
  const filtered = filterEscalatingDefaultMode(resolved);
  // Whitelist teaching fields: do not send raw settings, paths, or env values.
  return {
    rawMode: resolved.effective.permissions?.defaultMode ?? 'default (implicit)',
    filteredMode: filtered.permissions?.defaultMode ?? 'default (implicit)',
    sources: [...new Set(resolved.sources.map((item) => item.source))],
    projectFixtureLoaded: resolved.sources.some((item) => item.source === 'project'),
    explanation:
      'resolveSettings reports a raw cascade. filterEscalatingDefaultMode removes escalating modes sourced from a repo-committed project tier. Machine-managed policy can affect the result; this preview does not change a running query.',
  };
}
