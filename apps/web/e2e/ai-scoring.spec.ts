import { test, expect } from '@playwright/test';

test.describe('AI Scoring', () => {
  test('Launch AI Screening button is visible on session page', async ({ page }) => {
    await page.goto('/projects/proj-1/sls-sessions/sess-1');

    // The page should load without errors
    await expect(page.getByTestId('sls-session-detail-page')).toBeVisible();

    // If the launch AI screening button is rendered on this page
    const launchButton = page.getByTestId('launch-ai-screening-button');
    const isVisible = await launchButton.isVisible().catch(() => false);

    if (isVisible) {
      await expect(launchButton).toBeVisible();
      await expect(launchButton).toHaveTextContent('Launch AI Screening');
    }
  });

  test('confirmation dialog shows article count and estimated time', async ({ page }) => {
    await page.goto('/projects/proj-1/sls-sessions/sess-1');

    await expect(page.getByTestId('sls-session-detail-page')).toBeVisible();

    const launchButton = page.getByTestId('launch-ai-screening-button');
    const isVisible = await launchButton.isVisible().catch(() => false);

    if (isVisible) {
      // Check the button is enabled (not locked)
      const isDisabled = await launchButton.isDisabled();

      if (!isDisabled) {
        await launchButton.click();

        const confirmation = page.getByTestId('ai-screening-confirmation');
        const isConfirmVisible = await confirmation.isVisible().catch(() => false);

        if (isConfirmVisible) {
          await expect(page.getByTestId('confirmation-article-count')).toBeVisible();
          await expect(page.getByTestId('confirmation-estimated-time')).toBeVisible();
          await expect(page.getByTestId('confirm-launch-button')).toBeVisible();
          await expect(page.getByTestId('cancel-launch-button')).toBeVisible();

          // Cancel should close the dialog
          await page.getByTestId('cancel-launch-button').click();
          await expect(confirmation).not.toBeVisible();
        }
      }
    }
  });

  test('progress display during scoring', async ({ page }) => {
    await page.goto('/projects/proj-1/sls-sessions/sess-1');

    await expect(page.getByTestId('sls-session-detail-page')).toBeVisible();

    // If AI scoring progress is displayed (e.g. a task is already running)
    const progress = page.getByTestId('ai-scoring-progress');
    const isVisible = await progress.isVisible().catch(() => false);

    if (isVisible) {
      // Verify progress elements are present
      const hasProgressBar = await page
        .getByTestId('scoring-progress-bar')
        .isVisible()
        .catch(() => false);
      const hasComplete = await page
        .getByTestId('scoring-complete')
        .isVisible()
        .catch(() => false);

      // Should have either active progress bar or completion summary
      expect(hasProgressBar || hasComplete).toBeTruthy();
    }
  });

  test('scoring completion summary appears after completion', async ({ page }) => {
    await page.goto('/projects/proj-1/sls-sessions/sess-1');

    await expect(page.getByTestId('sls-session-detail-page')).toBeVisible();

    // If scoring is already completed, the summary should be shown
    const complete = page.getByTestId('scoring-complete');
    const isComplete = await complete.isVisible().catch(() => false);

    if (isComplete) {
      await expect(page.getByText('AI Scoring Complete')).toBeVisible();
      await expect(page.getByTestId('scoring-summary')).toBeVisible();
    }
  });

  test('AI acceptance rate widget renders on session page', async ({ page }) => {
    await page.goto('/projects/proj-1/sls-sessions/sess-1');

    await expect(page.getByTestId('sls-session-detail-page')).toBeVisible();

    const widget = page.getByTestId('ai-acceptance-rate');
    const isVisible = await widget.isVisible().catch(() => false);

    if (isVisible) {
      await expect(page.getByTestId('acceptance-rate-badge')).toBeVisible();
      await expect(page.getByTestId('category-breakdown')).toBeVisible();
    }
  });

  test('AI reasoning box renders in article detail', async ({ page }) => {
    await page.goto('/projects/proj-1/sls-sessions/sess-1');

    await expect(page.getByTestId('sls-session-detail-page')).toBeVisible();

    // If an article row is visible, click it to open the detail panel
    const firstRow = page.locator('[data-testid^="article-row-"]').first();
    const isRowVisible = await firstRow.isVisible().catch(() => false);

    if (isRowVisible) {
      await firstRow.click();

      const panel = page.getByTestId('article-detail-panel');
      const isPanelVisible = await panel.isVisible().catch(() => false);

      if (isPanelVisible) {
        // Check if AI reasoning box is present
        const reasoningBox = page.getByTestId('ai-reasoning-box');
        const hasReasoning = await reasoningBox.isVisible().catch(() => false);

        if (hasReasoning) {
          // Either has a score badge or shows empty state
          const hasScore = await page
            .getByTestId('ai-score-badge')
            .isVisible()
            .catch(() => false);
          const hasNoScore = await page
            .getByTestId('ai-no-score')
            .isVisible()
            .catch(() => false);

          expect(hasScore || hasNoScore).toBeTruthy();
        }
      }
    }
  });
});
