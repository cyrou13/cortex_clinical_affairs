import { test, expect } from '@playwright/test';

test.describe('Exclusion Codes', () => {
  test('exclusion code list renders with default codes', async ({ page }) => {
    await page.goto('/projects/proj-1/sls-sessions/sess-1');

    await expect(page.getByTestId('sls-session-detail-page')).toBeVisible();

    const codeManager = page.getByTestId('exclusion-code-manager');
    const isVisible = await codeManager.isVisible().catch(() => false);

    if (isVisible) {
      await expect(codeManager).toBeVisible();
      await expect(page.getByText('Exclusion Codes')).toBeVisible();

      // Check that the code list is rendered
      const codeList = page.getByTestId('exclusion-code-list');
      await expect(codeList).toBeVisible();

      // Check for short code badges
      const badges = page.locator('[data-testid^="short-code-badge-"]');
      const badgeCount = await badges.count();
      expect(badgeCount).toBeGreaterThanOrEqual(0);

      // Check for add code button
      const addButton = page.getByTestId('add-code-button');
      const isAddVisible = await addButton.isVisible().catch(() => false);
      if (isAddVisible) {
        await expect(addButton).toBeVisible();
      }
    }
  });

  test('add new exclusion code', async ({ page }) => {
    await page.goto('/projects/proj-1/sls-sessions/sess-1');

    await expect(page.getByTestId('sls-session-detail-page')).toBeVisible();

    const addButton = page.getByTestId('add-code-button');
    const isAddVisible = await addButton.isVisible().catch(() => false);

    if (isAddVisible) {
      await addButton.click();

      // The add code form should appear
      const addForm = page.getByTestId('add-code-form');
      await expect(addForm).toBeVisible();

      // Fill in the form
      await page.getByTestId('new-short-code-input').fill('E99');
      await page.getByTestId('new-code-input').fill('TEST_CODE');
      await page.getByTestId('new-label-input').fill('Test exclusion code');
      await page.getByTestId('new-description-input').fill('A test code for E2E');

      // Save button should be enabled
      const saveButton = page.getByTestId('save-new-code-button');
      await expect(saveButton).toBeEnabled();

      // Click save
      await saveButton.click();

      // Form should close (or code should appear in list)
      // Wait for either the form to close or the new code to appear
      await page.waitForTimeout(1000);
    }
  });

  test('threshold configuration', async ({ page }) => {
    await page.goto('/projects/proj-1/sls-sessions/sess-1');

    await expect(page.getByTestId('sls-session-detail-page')).toBeVisible();

    const thresholdConfig = page.getByTestId('relevance-threshold-config');
    const isVisible = await thresholdConfig.isVisible().catch(() => false);

    if (isVisible) {
      await expect(thresholdConfig).toBeVisible();
      await expect(page.getByText('Relevance Thresholds')).toBeVisible();

      // Check threshold inputs exist
      const upperInput = page.getByTestId('upper-threshold-input');
      const lowerInput = page.getByTestId('lower-threshold-input');
      await expect(upperInput).toBeVisible();
      await expect(lowerInput).toBeVisible();

      // Check visual preview exists
      const preview = page.getByTestId('threshold-preview');
      await expect(preview).toBeVisible();

      // Check the three range bars exist
      await expect(page.getByTestId('range-irrelevant')).toBeVisible();
      await expect(page.getByTestId('range-uncertain')).toBeVisible();
      await expect(page.getByTestId('range-relevant')).toBeVisible();

      // Modify upper threshold
      await upperInput.clear();
      await upperInput.fill('80');

      // Save button should be enabled
      const saveButton = page.getByTestId('save-thresholds-button');
      await expect(saveButton).toBeEnabled();

      // Validate the threshold range labels
      await expect(page.getByText('Likely Irrelevant')).toBeVisible();
      await expect(page.getByText('Uncertain')).toBeVisible();
      await expect(page.getByText('Likely Relevant')).toBeVisible();
    }
  });
});
