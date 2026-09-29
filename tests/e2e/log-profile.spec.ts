import { expect, test, type Page } from '@playwright/test';

const SAVE_KEY = 'ape-storage-the-training-meta';

async function createCharacter(page: Page, name: string) {
  await page.goto('/create');
  await page.getByLabel('What is your name, adventurer?').fill(name);
  await page.getByRole('button', { name: /continue/i }).click();
  await page.getByRole('button', { name: 'Male', exact: true }).click();
  await page.getByRole('button', { name: /continue/i }).click();
  await page.getByLabel('How old are you?').fill('30');
  await page.getByRole('button', { name: /continue/i }).click();
  await page.getByLabel('Starting weight').fill('180');
  await page.getByLabel('Weight unit').selectOption('lbs');
  await page.getByRole('button', { name: /create character/i }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Enter the Hub' }).click();
  await expect(page).toHaveURL(/\/hub$/);
}

test.describe('quest log and profile', () => {
  test('log a workout → Quest Log → goal Gain survives reload → Reset → Start @smoke', async ({ page }) => {
    await createCharacter(page, 'Gimli');

    // Log Bench 3×10 and finish.
    await page.getByRole('link', { name: /log workout train/i }).click();
    await page.getByRole('region', { name: /choose exercise/i }).getByRole('button', { name: 'Bench Press', exact: true }).click();
    await page.getByLabel(/^sets/i).fill('3');
    await page.getByLabel(/^reps/i).fill('10');
    await page.getByRole('button', { name: /log exercise/i }).click();
    await page.getByRole('button', { name: /finish workout/i }).click();
    await expect(page).toHaveURL(/\/hub$/);
    const levelUp = page.getByRole('dialog', { name: '⚔️ LEVEL UP! ⚔️' });
    await levelUp.getByRole('button').click();
    await expect(levelUp).toBeHidden();

    // Quest Log shows it.
    await page.getByRole('link', { name: /quest log/i }).click();
    await expect(page).toHaveURL(/\/log$/);
    await expect(page.getByRole('heading', { name: '📜 Quest Log' })).toBeVisible();
    const today = await page.evaluate(() =>
      new Date().toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' }),
    );
    await expect(page.getByText(`📅 ${today}`)).toBeVisible();
    await expect(page.getByText('3×10 @ — lbs')).toBeVisible();
    await expect(page.getByText('+30 XP').first()).toBeVisible();

    // Profile: switch the goal to Gain; it survives a reload.
    await page.getByRole('link', { name: '← Hub' }).click();
    await page.getByRole('link', { name: /profile/i }).click();
    await expect(page).toHaveURL(/\/profile$/);
    await expect(page.getByRole('radio', { name: 'Lose' })).toBeChecked();
    await page.getByRole('radio', { name: 'Gain' }).check();
    await expect(page.getByRole('radio', { name: 'Gain' })).toBeChecked();
    await page.reload();
    await expect(page.getByRole('radio', { name: 'Gain' })).toBeChecked();

    // Reset → confirm → Start, with focus on its heading; a reload stays on Start.
    await page.getByRole('button', { name: 'Reset Character' }).click();
    const confirm = page.getByRole('dialog', { name: 'Reset character?' });
    await confirm.getByRole('button', { name: 'Reset' }).click();
    await expect(page).toHaveURL(/\/$/);
    const startHeading = page.getByRole('heading', { level: 1, name: 'The Training Meta' });
    await expect(startHeading).toBeFocused();
    expect(await page.evaluate((key) => window.localStorage.getItem(key), SAVE_KEY)).toBeNull();
    await page.reload();
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByRole('button', { name: 'START' })).toBeVisible();
  });

  test('Cancel and Escape on the reset dialog keep the character', async ({ page }) => {
    await createCharacter(page, 'Legolas');
    await page.getByRole('link', { name: /profile/i }).click();

    const resetButton = page.getByRole('button', { name: 'Reset Character' });
    const confirm = page.getByRole('dialog', { name: 'Reset character?' });
    await resetButton.click();
    await expect(confirm.getByRole('button', { name: 'Cancel' })).toBeFocused();
    await confirm.getByRole('button', { name: 'Cancel' }).click();
    await expect(confirm).toBeHidden();
    await expect(resetButton).toBeFocused();

    await resetButton.click();
    await page.keyboard.press('Escape');
    await expect(confirm).toBeHidden();

    await page.reload();
    await expect(page).toHaveURL(/\/profile$/);
    await expect(page.getByText('Legolas', { exact: true })).toBeVisible();
  });
});
