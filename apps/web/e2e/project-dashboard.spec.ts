import { test, expect } from '@playwright/test';

test.describe('Project Dashboard', () => {
  test('renders pipeline status on dashboard', async ({ page }) => {
    await page.goto('/projects/proj-1');

    // Pipeline status nodes should be visible
    await expect(page.getByTestId('pipeline-node-sls')).toBeVisible();
    await expect(page.getByTestId('pipeline-node-soa')).toBeVisible();
    await expect(page.getByTestId('pipeline-node-validation')).toBeVisible();
    await expect(page.getByTestId('pipeline-node-cer')).toBeVisible();
    await expect(page.getByTestId('pipeline-node-pms')).toBeVisible();
  });

  test('shows metrics section on dashboard', async ({ page }) => {
    await page.goto('/projects/proj-1');

    // Metrics labels should be visible
    await expect(page.getByText('Total Articles')).toBeVisible();
    await expect(page.getByText('Included')).toBeVisible();
    await expect(page.getByText('SOA Sections')).toBeVisible();
    await expect(page.getByText('CER Sections')).toBeVisible();
  });
});
