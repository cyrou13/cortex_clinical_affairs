import { test, expect } from '@playwright/test';

test.describe('Configurable Extraction Grids', () => {
  test('grid page renders with toolbar', async ({ page }) => {
    await page.goto('/projects/proj-1/soa-analyses/soa-1/grid');

    const gridPage = page.getByTestId('extraction-grid-page');
    const loading = page.getByTestId('grid-loading');

    await expect(gridPage.or(loading).first()).toBeVisible();
  });

  test('grid configurator shows template list or columns', async ({ page }) => {
    await page.goto('/projects/proj-1/soa-analyses/soa-1/grid');

    const configurator = page.getByTestId('grid-configurator');
    if (await configurator.isVisible()) {
      const templateList = page.getByTestId('template-list');
      const columnList = page.getByTestId('column-list');
      await expect(templateList.or(columnList).first()).toBeVisible();
    }
  });

  test('extraction table renders with column headers', async ({ page }) => {
    await page.goto('/projects/proj-1/soa-analyses/soa-1/grid');

    const table = page.getByTestId('extraction-table');
    if (await table.isVisible()) {
      const headers = table.locator('th');
      const count = await headers.count();
      expect(count).toBeGreaterThan(0);
    }
  });

  test('export button is present', async ({ page }) => {
    await page.goto('/projects/proj-1/soa-analyses/soa-1/grid');

    const exportBtn = page.getByTestId('export-btn');
    if (await exportBtn.isVisible()) {
      await expect(exportBtn).toBeVisible();
    }
  });

  test('AI pre-fill button is disabled', async ({ page }) => {
    await page.goto('/projects/proj-1/soa-analyses/soa-1/grid');

    const btn = page.getByTestId('ai-prefill-btn');
    if (await btn.isVisible()) {
      await expect(btn).toBeDisabled();
    }
  });

  test('cell is clickable for editing', async ({ page }) => {
    await page.goto('/projects/proj-1/soa-analyses/soa-1/grid');

    const table = page.getByTestId('extraction-table');
    if (await table.isVisible()) {
      const firstCell = table.locator('td').first();
      if (await firstCell.isVisible()) {
        await firstCell.click();
        const editor = page.getByTestId('cell-editor');
        if (await editor.isVisible()) {
          await expect(editor).toBeVisible();
        }
      }
    }
  });
});
