import { test, expect } from '@playwright/test';

test('compiler workflow, token filters, tree inspection, diff, and settings', async ({ page }) => {
  const errors = [];
  page.on('pageerror', e => errors.push(e.stack || e.message));
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Messy code. Clear thinking.' })).toBeVisible();
  await expect(page.locator('.monaco-editor').first()).toBeVisible();
  await page.getByRole('button', { name: 'Format Code', exact: false }).click();
  await expect(page.getByText('Source structure verified', { exact: true })).toBeVisible();
  await expect(page.locator('.stat-card').nth(1).locator('strong')).not.toHaveText('—');
  await page.getByRole('tab', { name: /Token Analyzer/ }).click();
  await expect(page.locator('tbody tr')).not.toHaveCount(0);
  await page.getByRole('textbox', { name: 'Search tokens' }).fill('return');
  await expect(page.locator('tbody tr')).toHaveCount(2);
  await page.getByRole('textbox', { name: 'Search tokens' }).fill('');
  await page.getByLabel('Filter token type').selectOption('INT');
  await expect(page.locator('tbody tr')).toHaveCount(6);
  const csv = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export CSV' }).click();
  expect((await csv).suggestedFilename()).toBe('codecraft-tokens.csv');
  await page.getByRole('tab', { name: 'Syntax Tree' }).click();
  await expect(page.locator('.react-flow__node').first()).toBeVisible();
  await page.locator('.react-flow__node').first().click();
  await expect(page.locator('.node-detail')).toContainText('Program');
  await page.getByRole('button', { name: /Reveal source/ }).click();
  await expect(page.getByRole('textbox', { name: 'Original C source', exact: true })).toBeVisible();
  await page.getByRole('tab', { name: 'Comparison' }).click();
  await expect(page.locator('.monaco-diff-editor')).toBeVisible();
  await page.getByLabel('Inline comparison').check();
  await page.getByRole('tab', { name: 'Formatter', exact: true }).click();
  await page.getByRole('combobox', { name: 'Brace style', exact: true }).selectOption('next-line');
  await expect(page.getByText('Source structure verified', { exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Format Code', exact: false }).click();
  await expect(page.getByText('Source structure verified', { exact: true })).toBeVisible();
  const file = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download formatted code' }).click();
  expect((await file).suggestedFilename()).toBe('formatted.c');
  await page.screenshot({ path: 'tests/desktop.png', fullPage: true });
  await page.getByRole('button', { name: 'Toggle color theme' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await page.getByRole('tab', { name: 'Documentation' }).click();
  await expect(page.getByRole('heading', { name: 'Formatting is a compiler problem.' })).toBeVisible();
  expect(errors).toEqual([]);
});

test('uploaded invalid source produces navigable diagnostics, reset and clear work', async ({ page }) => {
  await page.goto('/');
  await page.locator('input[type=file]').setInputFiles({ name: 'invalid.c', mimeType: 'text/plain', buffer: Buffer.from('int main(){\nreturn 0\n}') });
  await page.getByRole('button', { name: 'Format Code', exact: false }).click();
  await expect(page.locator('.error-row')).toContainText('Line 3:1');
  await page.locator('.error-row').click();
  await expect(page.locator('.monaco-editor').first()).toBeVisible();
  await page.getByRole('button', { name: 'Reset', exact: true }).click();
  await expect(page.locator('.error-row')).toHaveCount(0);
  await page.getByRole('button', { name: 'Clear source' }).click();
  await expect(page.getByRole('button', { name: 'Format Code', exact: false })).toBeDisabled();
});

test('mobile layout fits the viewport and navigation works', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Format Code', exact: false })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole('tab', { name: 'Token Analyzer' }).click();
  await expect(page.getByRole('heading', { name: 'Lexical analysis' })).toBeVisible();
  await page.screenshot({ path: 'tests/mobile.png', fullPage: true });
});

test('clipboard, keyboard formatting, tab indentation and defaults use current source', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto('/');
  await page.evaluate(() => navigator.clipboard.writeText('int main(){return 7;}'));
  await page.getByRole('button', { name: 'Paste code', exact: true }).click();
  await page.getByRole('combobox', { name: 'Indentation', exact: true }).selectOption('tab');
  await page.keyboard.press('Control+Enter');
  await expect(page.getByText('Source structure verified', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Copy formatted code', exact: true }).click();
  expect((await page.evaluate(() => navigator.clipboard.readText())).replaceAll('\r\n', '\n')).toBe('int main() {\n\treturn 7;\n}\n');
  await page.getByRole('button', { name: 'Defaults', exact: true }).click();
  await expect(page.getByRole('combobox', { name: 'Indentation', exact: true })).toHaveValue('4');
  await expect(page.getByText('Source structure verified', { exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Format Code', exact: false }).click();
  await expect(page.getByText('Source structure verified', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Copy formatted code', exact: true }).click();
  expect((await page.evaluate(() => navigator.clipboard.readText())).replaceAll('\r\n', '\n')).toBe('int main() {\n    return 7;\n}\n');
});
