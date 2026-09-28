import { expect, test } from '@playwright/test';

const SAVE_KEY = 'ape-storage-the-training-meta';

test.describe('character creation', () => {
  test('creates a character, lands on the Hub and survives a reload @smoke', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'The Training Meta' })).toBeVisible();
    await page.getByRole('button', { name: 'START' }).click();

    await expect(page).toHaveURL(/\/create$/);
    await expect(page.getByText('Step 1 of 4')).toBeVisible();
    await page.getByLabel('What is your name, adventurer?').fill('Aragorn');
    await page.getByRole('button', { name: /continue/i }).click();

    await expect(page.getByText('Step 2 of 4')).toBeVisible();
    await page.getByRole('button', { name: 'Male', exact: true }).click();
    await page.getByRole('button', { name: /continue/i }).click();

    await expect(page.getByText('Step 3 of 4')).toBeVisible();
    await page.getByLabel('How old are you?').fill('30');
    await page.getByRole('button', { name: /continue/i }).click();

    await expect(page.getByText('Step 4 of 4')).toBeVisible();
    await page.getByLabel('Starting weight').fill('180');
    await page.getByLabel('Weight unit').selectOption('lbs');
    await page.getByRole('button', { name: /create character/i }).click();

    const overlay = page.getByRole('dialog');
    await expect(overlay).toBeVisible();
    await expect(overlay).toContainText('CHARACTER CREATED');
    await expect(overlay).toContainText('Welcome, Aragorn!');
    await expect(page).toHaveURL(/\/create$/);

    await expect(overlay.getByRole('button', { name: 'Enter the Hub' })).toBeFocused();
    await overlay.getByRole('button', { name: 'Enter the Hub' }).click();
    await expect(page).toHaveURL(/\/hub$/);
    // Focus lands on the Hub name, not <body> (restored after the route transition commits).
    await expect(page.getByRole('heading', { level: 1, name: 'Aragorn' })).toBeFocused();
    await expect(page.locator('[inert]')).toHaveCount(0);
    await expect(page.getByText('Aragorn', { exact: true })).toBeVisible();
    await expect(page.getByText('Level 1', { exact: true })).toBeVisible();
    await expect(page.getByText('Total Level: 12')).toBeVisible();
    await expect(page.getByText('0 day streak')).toBeVisible();

    await page.reload();
    await expect(page).toHaveURL(/\/hub$/);
    await expect(page.getByText('Aragorn', { exact: true })).toBeVisible();

    // A returning player who opens the root is sent straight to the Hub.
    await page.goto('/');
    await expect(page).toHaveURL(/\/hub$/);
    await expect(page.getByText('Aragorn', { exact: true })).toBeVisible();
  });

  test('Escape on the CHARACTER CREATED overlay enters the Hub with its h1 focused', async ({ page }) => {
    await page.goto('/create');
    await page.getByLabel('What is your name, adventurer?').fill('Legolas');
    await page.getByRole('button', { name: /continue/i }).click();
    await page.getByRole('button', { name: 'Male', exact: true }).click();
    await page.getByRole('button', { name: /continue/i }).click();
    await page.getByLabel('How old are you?').fill('30');
    await page.getByRole('button', { name: /continue/i }).click();
    await page.getByLabel('Starting weight').fill('160');
    await page.getByRole('button', { name: /create character/i }).click();

    const overlay = page.getByRole('dialog', { name: '⚔️ CHARACTER CREATED ⚔️' });
    await expect(overlay).toBeVisible();
    await expect(overlay.getByRole('button', { name: 'Enter the Hub' })).toBeFocused();
    await page.keyboard.press('Escape');

    await expect(page).toHaveURL(/\/hub$/);
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(page.getByRole('heading', { level: 1, name: 'Legolas' })).toBeFocused();
    await expect(page.locator('[inert]')).toHaveCount(0);
  });

  test('an empty name blocks step 1', async ({ page }) => {
    await page.goto('/create');
    await expect(page.getByText('Step 1 of 4')).toBeVisible();
    await page.getByRole('button', { name: /continue/i }).click();

    await expect(page.getByRole('alert')).toHaveText('Please enter your name.');
    await expect(page.getByText('Step 1 of 4')).toBeVisible();
    await expect(page.getByLabel('What is your name, adventurer?')).toBeVisible();
  });

  test('visiting /hub with no save redirects to Start', async ({ page }) => {
    await page.goto('/hub');
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByRole('button', { name: 'START' })).toBeVisible();
  });

  test('a corrupt save shows Start without crashing', async ({ page }) => {
    const pageErrors: Error[] = [];
    page.on('pageerror', (error) => pageErrors.push(error));
    await page.addInitScript((key) => {
      window.localStorage.setItem(key, '{"player": corrupt');
    }, SAVE_KEY);

    await page.goto('/hub');
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByRole('heading', { name: 'The Training Meta' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'START' })).toBeVisible();
    expect(pageErrors).toEqual([]);
  });
});
