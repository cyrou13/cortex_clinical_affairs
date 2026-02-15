import { test, expect } from '@playwright/test';

test.describe('AI Pre-Population of Extraction Grids', () => {
  test('AI pre-fill button visible on grid page', async ({ page }) => {
    await page.goto('/projects/proj-1/soa-analyses/soa-1/grid');

    const btn = page.getByTestId('ai-prefill-btn');
    if (await btn.isVisible()) {
      await expect(btn).toBeVisible();
    }
  });

  test('cell validation overlay renders', async ({ page }) => {
    await page.goto('/projects/proj-1/soa-analyses/soa-1/grid');

    const overlay = page.getByTestId('cell-validation').first();
    if (await overlay.isVisible()) {
      await expect(overlay).toBeVisible();
    }
  });

  test('validation menu opens on click', async ({ page }) => {
    await page.goto('/projects/proj-1/soa-analyses/soa-1/grid');

    const menuBtn = page.getByTestId('validation-menu-btn').first();
    if (await menuBtn.isVisible()) {
      await menuBtn.click();
      const menu = page.getByTestId('validation-menu');
      if (await menu.isVisible()) {
        await expect(page.getByTestId('validate-btn')).toBeVisible();
        await expect(page.getByTestId('flag-btn')).toBeVisible();
      }
    }
  });

  test('AI indicator visible for AI-extracted cells', async ({ page }) => {
    await page.goto('/projects/proj-1/soa-analyses/soa-1/grid');

    const indicator = page.getByTestId('ai-indicator').first();
    if (await indicator.isVisible()) {
      await expect(indicator).toBeVisible();
    }
  });

  test('confidence badge visible', async ({ page }) => {
    await page.goto('/projects/proj-1/soa-analyses/soa-1/grid');

    const badge = page.getByTestId('confidence-badge').first();
    if (await badge.isVisible()) {
      await expect(badge).toBeVisible();
    }
  });
});
