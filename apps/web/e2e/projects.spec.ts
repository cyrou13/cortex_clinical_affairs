import { test, expect } from '@playwright/test';

test.describe('Projects Page', () => {
  test('renders projects page with New Project button', async ({ page }) => {
    await page.goto('/projects');

    await expect(page.getByRole('heading', { name: 'Projects' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'New Project' })).toBeVisible();
  });

  test('shows empty state or project cards', async ({ page }) => {
    await page.goto('/projects');

    // Wait for loading to finish
    await expect(page.getByRole('heading', { name: 'Projects' })).toBeVisible();

    // Either shows onboarding banner (empty) or project cards (has data)
    const welcome = page.getByRole('heading', { name: 'Welcome to CORTEX' });
    const projectCard = page.locator('article').first();

    await expect(welcome.or(projectCard).first()).toBeVisible();
  });

  test('opens project creation wizard', async ({ page }) => {
    await page.goto('/projects');

    await page.getByRole('button', { name: 'New Project' }).click();

    await expect(page.getByText('Create New Project')).toBeVisible();
    await expect(page.getByText('Device Information')).toBeVisible();
    await expect(page.getByLabel('Project Name')).toBeVisible();
  });

  test('validates step 1 before advancing', async ({ page }) => {
    await page.goto('/projects');
    await page.getByRole('button', { name: 'New Project' }).click();

    await page.getByRole('button', { name: 'Next' }).click();

    await expect(page.getByText(/at least 3 characters/i)).toBeVisible();
    await expect(page.getByText(/device name is required/i)).toBeVisible();
  });

  test('navigates through 3-step wizard', async ({ page }) => {
    await page.goto('/projects');
    await page.getByRole('button', { name: 'New Project' }).click();

    // Step 1
    await page.getByLabel('Project Name').fill('CSpine Evaluation');
    await page.getByLabel('Device Name').fill('CINA CSpine');
    await page.getByLabel('Device Class').selectOption('IIa');
    await page.getByLabel('Regulatory Context').selectOption('CE_MDR');
    await page.getByRole('button', { name: 'Next' }).click();

    // Step 2 - CEP
    await expect(page.getByLabel('Scope')).toBeVisible();
    await page.getByRole('button', { name: 'Next' }).click();

    // Step 3 - Team
    await expect(page.getByRole('button', { name: 'Create Project' })).toBeVisible();
  });
});
