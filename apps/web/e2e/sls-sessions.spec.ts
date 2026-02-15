import { test, expect } from '@playwright/test';

test.describe('SLS Sessions', () => {
  test('sessions page loads with sidebar and empty state', async ({ page }) => {
    await page.goto('/projects/proj-1/sls-sessions');

    await expect(page.getByTestId('sls-sessions-page')).toBeVisible();
    await expect(page.getByText('SLS Sessions')).toBeVisible();
    await expect(page.getByTestId('new-session-button')).toBeVisible();
  });

  test('create session flow opens modal', async ({ page }) => {
    await page.goto('/projects/proj-1/sls-sessions');

    await page.getByTestId('new-session-button').click();

    await expect(page.getByTestId('session-create-overlay')).toBeVisible();
    await expect(page.getByText('Create SLS Session')).toBeVisible();
    await expect(page.getByLabelText('Session Name')).toBeVisible();
    await expect(page.getByText('SOA Clinical')).toBeVisible();
    await expect(page.getByText('SOA Device')).toBeVisible();
    await expect(page.getByText('Similar Device')).toBeVisible();
    await expect(page.getByText('PMS Update')).toBeVisible();
    await expect(page.getByText('Ad Hoc')).toBeVisible();
  });

  test('create session form validates required fields', async ({ page }) => {
    await page.goto('/projects/proj-1/sls-sessions');

    await page.getByTestId('new-session-button').click();
    await page.getByTestId('create-button').click();

    await expect(page.getByText(/session name must be at least 3 characters/i)).toBeVisible();
    await expect(page.getByText(/please select a session type/i)).toBeVisible();
  });

  test('create session form shows dynamic scope fields', async ({ page }) => {
    await page.goto('/projects/proj-1/sls-sessions');

    await page.getByTestId('new-session-button').click();

    // Select SOA Clinical
    await page.getByText('SOA Clinical').click();

    await expect(page.getByLabel('Indication')).toBeVisible();
    await expect(page.getByLabel('Population')).toBeVisible();
    await expect(page.getByLabel('Intervention')).toBeVisible();
    await expect(page.getByLabel('Comparator')).toBeVisible();
    await expect(page.getByLabel('Outcomes')).toBeVisible();

    // Switch to Ad Hoc
    await page.getByText('Ad Hoc').click();

    await expect(page.getByLabel('Indication')).not.toBeVisible();
    await expect(page.getByLabel('Description')).toBeVisible();
    await expect(page.getByLabel('Search Objective')).toBeVisible();
  });

  test('session dashboard renders with session details', async ({ page }) => {
    await page.goto('/projects/proj-1/sls-sessions/sess-1');

    await expect(page.getByTestId('sls-session-detail-page')).toBeVisible();
    await expect(page.getByTestId('sls-sidebar')).toBeVisible();
  });
});
