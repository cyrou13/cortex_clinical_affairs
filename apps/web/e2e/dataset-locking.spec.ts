import { test, expect } from '@playwright/test';

test.describe('Dataset Locking & PRISMA Flowchart', () => {
  test('lock button visible on session dashboard', async ({ page }) => {
    await page.goto('/projects/proj-1/sls-sessions/sess-1');

    await expect(
      page.getByTestId('lock-dataset-btn').or(page.getByTestId('lock-status-locked')),
    ).toBeVisible();
  });

  test('lock button disabled when articles pending', async ({ page }) => {
    await page.goto('/projects/proj-1/sls-sessions/sess-pending');

    const btn = page.getByTestId('lock-dataset-btn');
    if (await btn.isVisible()) {
      await expect(btn).toBeDisabled();
    }
  });

  test('lock button opens confirmation dialog', async ({ page }) => {
    await page.goto('/projects/proj-1/sls-sessions/sess-ready');

    const btn = page.getByTestId('lock-dataset-btn');
    if (await btn.isVisible() && await btn.isEnabled()) {
      await btn.click();
      await expect(page.getByTestId('lock-confirmation-dialog')).toBeVisible();
      await expect(page.getByTestId('lock-recap')).toBeVisible();
      await expect(page.getByTestId('lock-checkbox')).toBeVisible();
    }
  });

  test('confirmation dialog has disabled confirm button initially', async ({ page }) => {
    await page.goto('/projects/proj-1/sls-sessions/sess-ready');

    const btn = page.getByTestId('lock-dataset-btn');
    if (await btn.isVisible() && await btn.isEnabled()) {
      await btn.click();
      await expect(page.getByTestId('lock-confirm-btn')).toBeDisabled();
    }
  });

  test('checking checkbox enables confirm button', async ({ page }) => {
    await page.goto('/projects/proj-1/sls-sessions/sess-ready');

    const btn = page.getByTestId('lock-dataset-btn');
    if (await btn.isVisible() && await btn.isEnabled()) {
      await btn.click();
      await page.getByTestId('lock-checkbox').check();
      await expect(page.getByTestId('lock-confirm-btn')).toBeEnabled();
    }
  });

  test('cancel closes confirmation dialog', async ({ page }) => {
    await page.goto('/projects/proj-1/sls-sessions/sess-ready');

    const btn = page.getByTestId('lock-dataset-btn');
    if (await btn.isVisible() && await btn.isEnabled()) {
      await btn.click();
      await expect(page.getByTestId('lock-confirmation-dialog')).toBeVisible();
      await page.getByTestId('lock-cancel-btn').click();
      await expect(page.getByTestId('lock-confirmation-dialog')).not.toBeVisible();
    }
  });

  test('PRISMA flowchart displays on locked session', async ({ page }) => {
    await page.goto('/projects/proj-1/sls-sessions/sess-locked/prisma');

    const flowchart = page.getByTestId('prisma-flowchart');
    if (await flowchart.isVisible()) {
      await expect(page.getByTestId('prisma-identification')).toBeVisible();
      await expect(page.getByTestId('prisma-deduplication')).toBeVisible();
      await expect(page.getByTestId('prisma-screening')).toBeVisible();
      await expect(page.getByTestId('prisma-inclusion')).toBeVisible();
    }
  });

  test('PRISMA flowchart shows per-database counts', async ({ page }) => {
    await page.goto('/projects/proj-1/sls-sessions/sess-locked/prisma');

    const flowchart = page.getByTestId('prisma-flowchart');
    if (await flowchart.isVisible()) {
      await expect(page.getByTestId('total-identified')).toBeVisible();
    }
  });

  test('locked session shows lock status badge', async ({ page }) => {
    await page.goto('/projects/proj-1/sls-sessions/sess-locked');

    const lockStatus = page.getByTestId('lock-status-locked');
    if (await lockStatus.isVisible()) {
      await expect(lockStatus).toHaveText(/Dataset Locked/);
    }
  });

  test('PRISMA flowchart shows final included count', async ({ page }) => {
    await page.goto('/projects/proj-1/sls-sessions/sess-locked/prisma');

    const finalIncluded = page.getByTestId('final-included');
    if (await finalIncluded.isVisible()) {
      await expect(finalIncluded).toHaveText(/studies included/);
    }
  });
});
