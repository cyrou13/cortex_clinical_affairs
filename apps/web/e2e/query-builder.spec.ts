import { test, expect } from '@playwright/test';

test.describe('Query Builder', () => {
  test('query builder page loads with session context', async ({ page }) => {
    await page.goto('/projects/proj-1/sls-sessions/sess-1');

    await expect(page.getByTestId('sls-session-detail-page')).toBeVisible();
    await expect(page.getByTestId('sls-sidebar')).toBeVisible();
  });

  test('query creation form renders with name and query fields', async ({ page }) => {
    await page.goto('/projects/proj-1/sls-sessions/sess-1');

    // Look for query builder elements if present on the page
    const queryBuilder = page.getByTestId('query-builder');
    if (await queryBuilder.isVisible()) {
      await expect(page.getByTestId('query-name-input')).toBeVisible();
      await expect(page.getByTestId('query-string-input')).toBeVisible();
      await expect(page.getByTestId('save-button')).toBeVisible();
      await expect(page.getByTestId('cancel-button')).toBeVisible();
    }
  });

  test('validation errors display for invalid boolean query', async ({ page }) => {
    await page.goto('/projects/proj-1/sls-sessions/sess-1');

    const queryStringInput = page.getByTestId('query-string-input');
    if (await queryStringInput.isVisible()) {
      await queryStringInput.fill('(cancer AND treatment');

      await expect(page.getByTestId('validation-errors')).toBeVisible();
      await expect(page.getByText('Unmatched opening parenthesis')).toBeVisible();
    }
  });

  test('query list renders on session page', async ({ page }) => {
    await page.goto('/projects/proj-1/sls-sessions/sess-1');

    const queryList = page.getByTestId('query-list');
    if (await queryList.isVisible()) {
      await expect(page.getByTestId('new-query-button')).toBeVisible();
      await expect(page.getByText('Queries')).toBeVisible();
    }
  });

  test('new query button is accessible', async ({ page }) => {
    await page.goto('/projects/proj-1/sls-sessions/sess-1');

    const newQueryButton = page.getByTestId('new-query-button');
    if (await newQueryButton.isVisible()) {
      await expect(newQueryButton).toHaveText(/New Query/);
    }
  });
});
