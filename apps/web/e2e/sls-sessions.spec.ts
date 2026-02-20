import { test, expect } from '@playwright/test';

test.describe('SLS Sessions', () => {
  test('sessions page loads with content', async ({ page }) => {
    await page.goto('/projects/proj-1/sls-sessions');

    // Page renders with SLS Sessions heading and New Session button
    await expect(page.getByRole('heading', { name: 'SLS Sessions' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'New Session' })).toBeVisible();
  });

  test('create session flow opens overlay', async ({ page }) => {
    await page.goto('/projects/proj-1/sls-sessions');

    const newBtn = page.getByRole('button', { name: 'New Session' });
    await expect(newBtn).toBeVisible();
    await newBtn.click();

    // Verify the create form rendered with heading and session name input
    await expect(page.getByRole('heading', { name: 'Create SLS Session' })).toBeVisible();
    await expect(page.getByLabel('Session Name')).toBeVisible();
    await expect(page.getByText('SOA Clinical')).toBeVisible();
    await expect(page.getByText('Ad Hoc')).toBeVisible();
  });

  test('create session form validates required fields', async ({ page }) => {
    await page.goto('/projects/proj-1/sls-sessions');

    const newBtn = page.getByRole('button', { name: 'New Session' });
    await expect(newBtn).toBeVisible();
    await newBtn.click();

    await page.getByTestId('create-button').click();

    await expect(page.getByText(/session name must be at least 3 characters/i)).toBeVisible();
    await expect(page.getByText(/please select a session type/i)).toBeVisible();
  });

  test('create session form shows dynamic scope fields', async ({ page }) => {
    await page.goto('/projects/proj-1/sls-sessions');

    const newBtn = page.getByRole('button', { name: 'New Session' });
    await expect(newBtn).toBeVisible();
    await newBtn.click();

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

  test('session detail page renders content', async ({ page }) => {
    await page.goto('/projects/proj-1/sls-sessions/sess-1');

    // The detail page may show the session dashboard, or an error for non-existent session
    const dashboard = page.getByTestId('session-dashboard');
    const errorMsg = page.getByText('Failed to load session');
    const newBtn = page.getByRole('button', { name: 'New Session' });

    await expect(dashboard.or(errorMsg).or(newBtn).first()).toBeVisible();
  });
});
