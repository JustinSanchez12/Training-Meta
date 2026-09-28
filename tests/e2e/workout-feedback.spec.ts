import { expect, test, type Page } from '@playwright/test';
import { legacySave } from '../unit/fixtures/saves';

const SAVE_KEY = 'ape-storage-the-training-meta';
const SESSION_KEY = 'the-training-meta-workout-session';

/** Seeds the legacy save once per tab, so reloads keep what the app wrote. */
async function seed(page: Page) {
  await page.addInitScript(
    ({ key, save }) => {
      if (window.sessionStorage.getItem('seeded')) return;
      window.sessionStorage.setItem('seeded', '1');
      window.localStorage.setItem(key, save);
    },
    { key: SAVE_KEY, save: JSON.stringify(legacySave()) },
  );
}

async function logBench(page: Page) {
  const chooser = page.getByRole('region', { name: /choose exercise/i });
  await chooser.getByRole('button', { name: 'Bench Press', exact: true }).click();
  await expect(page).toHaveURL(/\/workout\/benchPress$/);
  await page.getByLabel(/^sets/i).fill('3');
  await page.getByLabel(/^reps/i).fill('10');
  await page.getByRole('button', { name: /log exercise/i }).click();
  await expect(page).toHaveURL(/\/workout$/);
}

// The popup is decorative and aria-hidden (the status region announces it), so it has no role to select by.
const xpPopup = (page: Page) => page.locator('.xp-popup');

test.describe('workout feedback', () => {
  test('XP popup → reload keeps the session → Finish → level-up dialog → Escape → Hub h1 focused @smoke', async ({
    page,
  }) => {
    await seed(page);
    await page.goto('/workout');
    await expect(page.getByRole('heading', { name: /log workout/i })).toBeVisible();

    await logBench(page);
    await expect(xpPopup(page)).toBeVisible();
    await expect(xpPopup(page)).toContainText('+30 XP');
    await expect(xpPopup(page)).toContainText('Bench Press');
    await expect(xpPopup(page)).toHaveAttribute('aria-hidden', 'true');
    await expect(page.getByRole('status')).toHaveText('Added Bench Press, +30 XP. Session total 30 XP.');
    // Gone after 2 s.
    await expect(xpPopup(page)).toHaveCount(0);

    // The draft survives a reload (this tab's sessionStorage).
    await page.reload();
    await expect(page.getByRole('heading', { name: /log workout/i })).toBeVisible();
    await expect(page.getByText('Total: +30 XP (1 exercise)')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Remove Bench Press, 3×10 @ — lbs', exact: true })).toBeVisible();

    await page.getByRole('button', { name: /finish workout/i }).click();
    await expect(page).toHaveURL(/\/hub$/);

    const dialog = page.getByRole('dialog', { name: '⚔️ LEVEL UP! ⚔️' });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole('listitem')).toHaveCount(1);
    await expect(dialog.getByRole('listitem')).toContainText('Bench Press');
    await expect(dialog.getByRole('listitem')).toContainText('2 → 4');
    const continueButton = dialog.getByRole('button', { name: 'Continue' });
    await expect(continueButton).toBeFocused();

    // Focus is trapped on Continue.
    for (const key of ['Tab', 'Shift+Tab', 'Tab']) {
      await page.keyboard.press(key);
      await expect(continueButton, `focus left Continue after ${key}`).toBeFocused();
    }

    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(page.getByRole('heading', { level: 1, name: 'Aragorn' })).toBeFocused();
    await expect(page.locator('[inert]')).toHaveCount(0);

    // The saved session is gone: a fresh visit starts empty.
    expect(await page.evaluate((key) => window.sessionStorage.getItem(key), SESSION_KEY)).toBeNull();
    await page.getByRole('link', { name: /log workout/i }).click();
    await expect(page.getByText('Total: +0 XP (0 exercises)')).toBeVisible();
  });

  test('reduced motion: the popup and dialog appear without transitions or movement', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await seed(page);
    await page.goto('/workout');

    await logBench(page);
    await expect(xpPopup(page)).toBeVisible();
    await expect(xpPopup(page)).toContainText('+30 XP');
    await expect(xpPopup(page)).toHaveCSS('transition-duration', '0s');
    // No scale or slide: only the centring translate.
    const transform = await xpPopup(page).evaluate((el) => getComputedStyle(el).transform);
    expect(transform).toMatch(/^matrix\(1, 0, 0, 1, /);

    await page.getByRole('button', { name: /finish workout/i }).click();
    const dialog = page.getByRole('dialog', { name: '⚔️ LEVEL UP! ⚔️' });
    await expect(dialog).toBeVisible();
    await expect(dialog).toHaveCSS('transition-duration', '0s');
    await expect(dialog.locator('#level-up-title')).toHaveCSS('animation-name', 'none');
    await dialog.getByRole('button', { name: 'Continue' }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
  });

  test("a draft from another character (or a corrupt one) is discarded, not shown", async ({ page }) => {
    const pageErrors: Error[] = [];
    page.on('pageerror', (error) => pageErrors.push(error));
    await seed(page);
    await page.addInitScript(
      ({ key, value }) => {
        if (window.sessionStorage.getItem('draft-seeded')) return;
        window.sessionStorage.setItem('draft-seeded', '1');
        window.sessionStorage.setItem(key, value);
      },
      {
        key: SESSION_KEY,
        value: JSON.stringify({
          version: 1,
          owner: '1999-01-01T00:00:00.000Z',
          items: [
            {
              id: 'foreign',
              entry: {
                stat: 'squat',
                name: 'Squat',
                icon: '🦵',
                data: { sets: 5, reps: 5 },
                xpGained: 25,
                timestamp: '2026-09-28T12:00:00.000Z',
              },
            },
          ],
        }),
      },
    );

    await page.goto('/workout');
    await expect(page.getByRole('heading', { name: /log workout/i })).toBeVisible();
    await expect(page.getByText(/no exercises added yet/i)).toBeVisible();
    await expect(page.getByText('Total: +0 XP (0 exercises)')).toBeVisible();
    await expect(page.getByRole('button', { name: /^Remove Squat/ })).toHaveCount(0);
    expect(await page.evaluate((key) => window.sessionStorage.getItem(key), SESSION_KEY)).toBeNull();

    // Corrupt JSON is handled the same way.
    await page.evaluate((key) => window.sessionStorage.setItem(key, '{"version":1,'), SESSION_KEY);
    await page.reload();
    await expect(page.getByText('Total: +0 XP (0 exercises)')).toBeVisible();
    expect(await page.evaluate((key) => window.sessionStorage.getItem(key), SESSION_KEY)).toBeNull();
    expect(pageErrors).toEqual([]);
  });
});
