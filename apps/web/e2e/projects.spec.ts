import { test, expect } from '@playwright/test';

test.describe('Projects Page', () => {
  test('renders projects page with New Project button', async ({ page }) => {
    await page.goto('/projects');

    await expect(page.getByText('Projects')).toBeVisible();
    await expect(page.getByText('New Project')).toBeVisible();
  });

  test('shows empty state for first-time users', async ({ page }) => {
    await page.goto('/projects');

    // Should show onboarding banner when no projects
    await expect(page.getByText(/welcome to cortex/i)).toBeVisible();
    await expect(page.getByText('Get Started')).toBeVisible();
  });

  test('opens project creation wizard', async ({ page }) => {
    await page.goto('/projects');

    await page.getByText('New Project').click();

    await expect(page.getByText('Create New Project')).toBeVisible();
    await expect(page.getByText('Device Information')).toBeVisible();
    await expect(page.getByLabel('Project Name')).toBeVisible();
  });

  test('validates step 1 before advancing', async ({ page }) => {
    await page.goto('/projects');
    await page.getByText('New Project').click();

    await page.getByText('Next').click();

    await expect(page.getByText(/at least 3 characters/i)).toBeVisible();
    await expect(page.getByText(/device name is required/i)).toBeVisible();
  });

  test('navigates through 3-step wizard', async ({ page }) => {
    await page.goto('/projects');
    await page.getByText('New Project').click();

    // Step 1
    await page.getByLabel('Project Name').fill('CSpine Evaluation');
    await page.getByLabel('Device Name').fill('CINA CSpine');
    await page.getByLabel('Device Class').selectOption('IIa');
    await page.getByLabel('Regulatory Context').selectOption('CE_MDR');
    await page.getByText('Next').click();

    // Step 2 - CEP
    await expect(page.getByLabel('Scope')).toBeVisible();
    await page.getByText('Next').click();

    // Step 3 - Team
    await expect(page.getByText('Create Project')).toBeVisible();
  });
});
