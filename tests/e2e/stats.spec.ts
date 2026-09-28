import { expect, test } from '@playwright/test';
import { legacySave } from '../unit/fixtures/saves';

const SAVE_KEY = 'ape-storage-the-training-meta';

test.describe('stats screen', () => {
  test('seeded save: Hub → Stats → Bench Press detail → Back → Hub @smoke', async ({ page }) => {
    await page.addInitScript(
      ({ key, save }) => {
        window.localStorage.setItem(key, save);
      },
      { key: SAVE_KEY, save: JSON.stringify(legacySave()) },
    );

    await page.goto('/hub');
    await expect(page.getByText('Aragorn', { exact: true })).toBeVisible();
    await page.getByRole('link', { name: /stats/i }).click();

    await expect(page).toHaveURL(/\/stats$/);
    await expect(page.getByRole('heading', { name: /stats/i })).toBeVisible();
    await expect(page.getByText('Total Level: 13')).toBeVisible();
    await expect(page.getByRole('button', { name: /, level \d+$/ })).toHaveCount(12);

    const bench = page.getByRole('button', { name: 'Bench Press, level 2' });
    await expect(bench).toBeVisible();
    await bench.click();

    const dialog = page.getByRole('dialog', { name: 'Bench Press' });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText('10 / 13 XP')).toBeVisible();
    await expect(dialog.getByText('Strength', { exact: true })).toBeVisible();
    await expect(dialog.getByText('sets × reps = XP')).toBeVisible();
    await expect(dialog.getByRole('button', { name: /back/i })).toBeFocused();

    await dialog.getByRole('button', { name: /back/i }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(bench).toBeFocused();

    // Escape closes the panel too.
    await bench.click();
    await expect(dialog).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(bench).toBeFocused();

    await page.getByRole('link', { name: /hub/i }).click();
    await expect(page).toHaveURL(/\/hub$/);
    await expect(page.getByText('Aragorn', { exact: true })).toBeVisible();
  });

  test('keyboard focus cannot reach the grid behind an open detail panel', async ({ page }) => {
    await page.addInitScript(
      ({ key, save }) => {
        window.localStorage.setItem(key, save);
      },
      { key: SAVE_KEY, save: JSON.stringify(legacySave()) },
    );
    await page.goto('/stats');
    await page.getByRole('button', { name: 'Bench Press, level 2' }).click();
    await expect(page.getByRole('dialog', { name: 'Bench Press' })).toBeVisible();

    // The grid and "← Hub" link behind the panel are inert: the browser refuses to focus them.
    const cellTookFocus = await page.evaluate(() => {
      const cell = document.querySelector<HTMLButtonElement>('.stat-cell');
      cell?.focus();
      return document.activeElement === cell;
    });
    expect(cellTookFocus).toBe(false);
    await expect(page.locator('[inert]')).toHaveCount(1);

    for (const key of ['Shift+Tab', 'Tab', 'Tab']) {
      await page.keyboard.press(key);
      // Focus must stay in the dialog, or leave the page entirely (body / browser UI), never reach the grid.
      const focusOk = await page.evaluate(
        () => document.activeElement === document.body || !!document.activeElement?.closest('[role="dialog"]'),
      );
      expect(focusOk, `focus escaped the panel after ${key}`).toBe(true);
    }
    await expect(page.getByRole('dialog', { name: 'Bench Press' })).toBeVisible();
  });

  test('visiting /stats with no save redirects to Start', async ({ page }) => {
    await page.goto('/stats');
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByRole('button', { name: 'START' })).toBeVisible();
  });
});
