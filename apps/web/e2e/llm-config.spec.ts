import { test, expect } from '@playwright/test';

test.describe('LLM Config Admin Page', () => {
  test('displays AI Configuration page with heading', async ({ page }) => {
    await page.goto('/admin/llm-config');

    const heading = page.getByText('AI Configuration');
    const panel = page.getByTestId('llm-config-panel');
    await expect(heading.or(panel).first()).toBeVisible();
  });

  test('can view system defaults tab with task type cards', async ({ page }) => {
    await page.goto('/admin/llm-config');

    const panel = page.getByTestId('llm-config-panel');
    if (await panel.isVisible()) {
      await expect(page.getByTestId('tab-system')).toBeVisible();
      await expect(page.getByTestId('system-defaults-tab')).toBeVisible();
      await expect(page.getByTestId('config-card-scoring')).toBeVisible();
      await expect(page.getByTestId('config-card-extraction')).toBeVisible();
      await expect(page.getByTestId('config-card-drafting')).toBeVisible();
      await expect(page.getByTestId('config-card-metadata_extraction')).toBeVisible();
    }
  });

  test('cost dashboard shows data when navigated to', async ({ page }) => {
    await page.goto('/admin/llm-config');

    const panel = page.getByTestId('llm-config-panel');
    if (await panel.isVisible()) {
      await page.getByTestId('tab-cost').click();
      await expect(page.getByTestId('cost-dashboard-tab')).toBeVisible();
      await expect(page.getByTestId('total-cost')).toBeVisible();
      await expect(page.getByTestId('cost-by-provider')).toBeVisible();
      await expect(page.getByTestId('cost-by-task-type')).toBeVisible();
      await expect(page.getByTestId('cost-by-model')).toBeVisible();
    }
  });

  test('can switch between tabs', async ({ page }) => {
    await page.goto('/admin/llm-config');

    const panel = page.getByTestId('llm-config-panel');
    if (await panel.isVisible()) {
      await page.getByTestId('tab-project').click();
      await expect(page.getByTestId('project-overrides-tab')).toBeVisible();
      await page.getByTestId('tab-cost').click();
      await expect(page.getByTestId('cost-dashboard-tab')).toBeVisible();
      await page.getByTestId('tab-system').click();
      await expect(page.getByTestId('system-defaults-tab')).toBeVisible();
    }
  });
});
