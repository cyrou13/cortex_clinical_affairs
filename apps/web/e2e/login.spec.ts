import { test, expect } from '@playwright/test';

test.describe('Login Page', () => {
  test('displays CORTEX branding and Google sign-in button', async ({ page }) => {
    await page.goto('/login');

    // Verify branding
    await expect(page.getByText('CORTEX')).toBeVisible();
    await expect(page.getByText('Clinical Affairs')).toBeVisible();
    await expect(page.getByText('Regulatory Compliance, Simplified')).toBeVisible();

    // Verify Google sign-in button
    const googleButton = page.getByText('Sign in with Google');
    await expect(googleButton).toBeVisible();
    await expect(googleButton).toBeEnabled();
  });

  test('displays security footer message', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByText(/encrypted at rest and in transit/i)).toBeVisible();
  });
});
