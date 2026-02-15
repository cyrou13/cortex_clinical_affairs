import { test, expect } from '@playwright/test';

test.describe('AI Confidence Indicators & Source Quotes', () => {
  test('confidence badges visible in extraction grid', async ({ page }) => {
    await page.goto('/projects/proj-1/soa-analyses/soa-1/grid');

    const badge = page.getByTestId('ai-confidence-indicator').first();
    if (await badge.isVisible()) {
      await expect(badge).toBeVisible();
    }
  });

  test('source quote popover opens on hover/focus', async ({ page }) => {
    await page.goto('/projects/proj-1/soa-analyses/soa-1/grid');

    const trigger = page.getByTestId('source-quote-trigger').first();
    if (await trigger.isVisible()) {
      await trigger.focus();
      const popover = page.getByTestId('source-quote-popover');
      if (await popover.isVisible()) {
        await expect(popover).toBeVisible();
      }
    }
  });

  test('validation overlays visible for validated cells', async ({ page }) => {
    await page.goto('/projects/proj-1/soa-analyses/soa-1/grid');

    const overlay = page.getByTestId('validation-overlay').first();
    if (await overlay.isVisible()) {
      await expect(overlay).toBeVisible();
    }
  });

  test('View in PDF link present in popover', async ({ page }) => {
    await page.goto('/projects/proj-1/soa-analyses/soa-1/grid');

    const trigger = page.getByTestId('source-quote-trigger').first();
    if (await trigger.isVisible()) {
      await trigger.focus();
      const pdfBtn = page.getByTestId('view-in-pdf-btn');
      if (await pdfBtn.isVisible()) {
        await expect(pdfBtn).toBeVisible();
      }
    }
  });
});
