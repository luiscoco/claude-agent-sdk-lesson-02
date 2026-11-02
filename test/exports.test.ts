import { test } from 'node:test';
import assert from 'node:assert/strict';
import { filterEscalatingDefaultMode, type ResolvedSettings } from '@anthropic-ai/claude-agent-sdk';
import { inspectExports } from '../src/server/exports.js';
import { inspectSettings } from '../src/server/settings.js';
test('the version-pinned catalog contains seven actual functions and two actual constants', async () => {
  const data = await inspectExports();
  assert.equal(data.version, '0.3.310');
  assert.equal(data.exports.filter((x) => x.kind === 'function').length, 7);
  assert.equal(data.exports.filter((x) => x.kind === 'constant').length, 2);
  assert.ok(
    data.exports.filter((x) => x.kind === 'function').every((x) => x.runtimeType === 'function'),
  );
});
test('alpha labels distinguish preparation and configuration helpers', async () => {
  const data = await inspectExports();
  assert.deepEqual(
    data.exports.filter((x) => x.status === 'alpha').map((x) => x.name),
    ['prewarm', 'resolveSettings', 'filterEscalatingDefaultMode'],
  );
  assert.equal(data.exports.find((x) => x.name === 'startup')?.status, 'stable');
});
test('constants support names and legacy aliases without calling a function', async () => {
  const data = await inspectExports();
  assert.ok(data.builtinNames.includes('Read'));
  assert.equal(data.aliases.Task, 'Agent');
  assert.equal(data.builtinNames.includes('mcp__course__lookup_lesson'), false);
});
function settings(source: 'project' | 'user'): ResolvedSettings {
  return {
    effective: { permissions: { defaultMode: 'acceptEdits' } },
    provenance: { permissions: { source } },
    sources: [{ source, settings: { permissions: { defaultMode: 'acceptEdits' } } }],
  };
}
test('actual trust filter drops escalating modes from the project tier', () => {
  const resolved = settings('project');
  const filtered = filterEscalatingDefaultMode(resolved);
  assert.equal(filtered.permissions?.defaultMode, undefined);
  assert.equal(resolved.effective.permissions?.defaultMode, 'acceptEdits');
});
test('actual trust filter preserves the trusted user-tier mode', () => {
  assert.equal(
    filterEscalatingDefaultMode(settings('user')).permissions?.defaultMode,
    'acceptEdits',
  );
});
test('actual settings resolution exposes only the whitelisted teaching fields', async () => {
  const result = await inspectSettings();
  assert.equal(result.projectFixtureLoaded, true);
  assert.deepEqual(
    Object.keys(result).sort(),
    ['rawMode', 'filteredMode', 'sources', 'projectFixtureLoaded', 'explanation'].sort(),
  );
  assert.ok(result.sources.includes('project'));
  assert.equal(typeof result.rawMode, 'string');
  assert.equal(typeof result.filteredMode, 'string');
});
