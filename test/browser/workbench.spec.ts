import { test, expect } from '@playwright/test';
test('a student can call the real SDK-hosted tool and export its trace', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Call the tool' }).click();
  await expect(page.locator('#call-status')).toHaveText('Tool returned');
  await expect(page.locator('#handler-count')).toHaveText('1 handler call');
  await expect(page.locator('#lesson-title')).toHaveText('Core Exports and Main APIs');
  await expect(page.locator('#call-steps')).toContainText('execute');
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export trace' }).click();
  expect((await download).suggestedFilename()).toBe('lesson-02-tool-trace.json');
});
test('an invalid type is rejected before the handler runs', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Wrong type' }).click();
  await page.getByRole('button', { name: 'Call the tool' }).click();
  await expect(page.locator('#call-status')).toHaveText('Input rejected');
  await expect(page.locator('#handler-count')).toHaveText('0 handler calls');
  await expect(page.locator('#validation-summary')).toContainText('Rejected before execution');
  await page.getByText('Inspect the actual input schema and MCP envelope').click();
  await expect(page.locator('#tool-output')).toContainText('isError');
});
test('malformed JSON clears a previous result without calling a handler', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Call the tool' }).click();
  await expect(page.locator('#call-status')).toHaveText('Tool returned');
  await page.locator('#arguments').fill('{');
  await page.getByRole('button', { name: 'Call the tool' }).click();
  await expect(page.locator('#notice')).toContainText('not valid JSON');
  await expect(page.locator('#lesson-result')).toBeHidden();
  await expect(page.locator('#handler-count')).toHaveText('0 handler calls');
  await expect(page.getByRole('button', { name: 'Export trace' })).toBeDisabled();
});
test('core export filters separate extension APIs from constants', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('tab', { name: /Core exports/ }).click();
  await page.getByRole('button', { name: 'Extend', exact: true }).click();
  await expect(page.locator('#exports-grid .package-card')).toHaveCount(2);
  await expect(page.getByRole('heading', { name: 'tool()', exact: true })).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'createSdkMcpServer()', exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Look up', exact: true }).click();
  await expect(page.locator('#exports-grid')).toContainText('LEGACY_TOOL_NAME_ALIASES');
});
test('settings helpers inspect the fixture and constants resolve a real compatibility alias', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('tab', { name: /Settings & constants/ }).click();
  await expect(page.locator('#name-result')).toContainText('Task → Agent');
  await page.getByRole('button', { name: 'Inspect settings fixture' }).click();
  await expect(page.locator('#settings-json')).toContainText('"projectFixtureLoaded": true');
  await expect(page.locator('#filtered-mode')).not.toBeEmpty();
  await page.locator('#name-lookup').fill('toString');
  await expect(page.locator('#name-result')).toContainText('No match');
});
test('quiz checks the four Lesson 2 concepts', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('tab', { name: /Check your understanding/ }).click();
  for (const [i, value] of [0, 1, 2, 1].entries())
    await page.locator(`input[name=q${i}][value="${value}"]`).check();
  await page.getByRole('button', { name: 'Check my answers' }).click();
  await expect(page.locator('#quiz-score')).toHaveText('4 / 4 correct');
});
test('phone viewport fits the workshop, export cards, and settings', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  for (const name of [/Tool workshop/, /Core exports/, /Settings & constants/]) {
    await page.getByRole('tab', { name }).click();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
  }
});
test('the optional agent UI handles a selected-field SDK stream without executing HTML', async ({
  page,
}) => {
  await page.route('**/api/meta', async (route) => {
    const response = await route.fetch();
    const data = await response.json();
    await route.fulfill({ json: { ...data, liveAvailable: true } });
  });
  await page.route('**/api/live', (route) =>
    route.fulfill({
      contentType: 'text/event-stream',
      body: [
        {
          kind: 'message',
          message: {
            type: 'assistant',
            text: 'Tool selected',
            toolName: 'mcp__course__lookup_lesson',
            envelope: {},
          },
        },
        {
          kind: 'message',
          message: {
            type: 'result',
            text: '<script>window.injected=true</script>',
            final: { ok: true, text: '<script>window.injected=true</script>' },
            envelope: {},
          },
        },
        { kind: 'done', status: 'success' },
      ]
        .map((item) => 'data: ' + JSON.stringify(item) + '\n\n')
        .join(''),
    }),
  );
  await page.goto('/');
  await page.getByText('Let an agent choose the tool', { exact: false }).click();
  await page.getByRole('button', { name: 'Run live query' }).click();
  await expect(page.locator('#live-status')).toHaveText('Live query: success');
  await expect(page.locator('#live-events')).toContainText('mcp__course__lookup_lesson');
  await expect(page.locator('#live-result')).toHaveText('<script>window.injected=true</script>');
  expect(await page.evaluate(() => Object.hasOwn(window, 'injected'))).toBe(false);
});
