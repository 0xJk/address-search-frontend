import { test, expect } from '@playwright/test';

test.describe('Address search flow', () => {
  test('homepage loads with search bar', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByPlaceholderText(/Australian property address/i)).toBeVisible();
  });

  test('search with valid address navigates to property page', async ({ page }) => {
    await page.goto('/');
    await page.getByPlaceholderText(/Australian property address/i).fill('746 New South Head Road Rose Bay NSW 2029');
    await page.getByRole('button', { name: /search/i }).click();

    // Should navigate to property page
    await expect(page).toHaveURL(/\/property\?address=/, { timeout: 15000 });
  });

  test('property page displays GNAF fields', async ({ page }) => {
    await page.goto('/property?address=746+NEW+SOUTH+HEAD+ROAD+ROSE+BAY+NSW+2029');

    await expect(page.getByText('Property Information')).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('GNAF PID')).toBeVisible();
    await expect(page.getByText('GNAF Matched')).toBeVisible();
  });

  test('property page displays suburb in similar properties', async ({ page }) => {
    await page.goto('/property?address=746+NEW+SOUTH+HEAD+ROAD+ROSE+BAY+NSW+2029');
    await expect(page.getByText('Nearby Similar Properties')).toBeVisible({ timeout: 15000 });
  });

  test('property page displays suburb in nearby schools', async ({ page }) => {
    await page.goto('/property?address=746+NEW+SOUTH+HEAD+ROAD+ROSE+BAY+NSW+2029');
    await expect(page.getByText('Nearby Schools')).toBeVisible({ timeout: 15000 });
  });

  test('invalid address shows validation error', async ({ page }) => {
    await page.goto('/');
    await page.getByPlaceholderText(/Australian property address/i).fill('xyzzy123nonsense');
    await page.getByRole('button', { name: /search/i }).click();

    await expect(page.getByText(/could not be validated/i)).toBeVisible({ timeout: 10000 });
  });
});
