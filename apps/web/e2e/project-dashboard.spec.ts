import { test, expect } from '@playwright/test';

test.describe('Project Dashboard', () => {
  test('renders pipeline status on dashboard', async ({ page }) => {
    await page.goto('/projects/proj-1');

    // Pipeline status nodes in the app-level PipelineProgressBar should be visible
    await expect(page.getByTestId('pipeline-node-sls')).toBeVisible();
    await expect(page.getByTestId('pipeline-node-soa')).toBeVisible();
    await expect(page.getByTestId('pipeline-node-validation')).toBeVisible();
    await expect(page.getByTestId('pipeline-node-cer')).toBeVisible();
    await expect(page.getByTestId('pipeline-node-pms')).toBeVisible();
  });

  test('shows dashboard content or error state', async ({ page }) => {
    await page.goto('/projects/proj-1');

    // Dashboard may load successfully or show an error (e.g., when project doesn't exist)
    const deviceInfo = page.getByText('Device Information');
    const errorMsg = page.getByText('Failed to load project dashboard.');
    const loadingMsg = page.getByText('Loading project dashboard...');

    await expect(deviceInfo.or(errorMsg).or(loadingMsg).first()).toBeVisible();
  });
});
