import { expect, test, type Page } from '@playwright/test';
import type { SaveData } from '../../src/lib/game/schema';
import { legacySave } from '../unit/fixtures/saves';

const SAVE_KEY = 'ape-storage-the-training-meta';

async function seed(page: Page, save: SaveData, lastWorkoutIsYesterday = false) {
  await page.addInitScript(
    ({ key, save, lastWorkoutIsYesterday }) => {
      // Only seed once, so a later reload/navigation keeps what the app saved.
      if (window.sessionStorage.getItem('seeded')) return;
      window.sessionStorage.setItem('seeded', '1');
      const data = JSON.parse(save) as { lastWorkoutDate: string };
      if (lastWorkoutIsYesterday) {
        // "Yesterday" in the page's local time zone, same as the app computes it.
        const now = new Date();
        const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
        const pad = (n: number) => String(n).padStart(2, '0');
        data.lastWorkoutDate = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
      }
      window.localStorage.setItem(key, JSON.stringify(data));
    },
    { key: SAVE_KEY, save: JSON.stringify(save), lastWorkoutIsYesterday },
  );
}

async function logExercise(page: Page, exercise: string, fields: Record<string, string>) {
  const chooser = page.getByRole('region', { name: /choose exercise/i });
  await chooser.getByRole('button', { name: exercise, exact: true }).click();
  await expect(page).toHaveURL(/\/workout\/\w+$/);
  for (const [label, value] of Object.entries(fields)) {
    await page.getByLabel(new RegExp(label, 'i')).fill(value);
  }
  await page.getByRole('button', { name: /log exercise/i }).click();
  await expect(page).toHaveURL(/\/workout$/);
}

test.describe('log workout', () => {
  test('seeded save: Hub → Log Workout → Bench 3×10 + Mile Run 0.3 → Finish → streak and level up @smoke', async ({
    page,
  }) => {
    await seed(page, { ...legacySave(), dailyStreak: 0, lastWorkoutDate: '' });

    await page.goto('/hub');
    await expect(page.getByText('🔥 0 day streak')).toBeVisible();
    await page.getByRole('link', { name: /log workout/i }).click();

    await expect(page).toHaveURL(/\/workout$/);
    await expect(page.getByRole('heading', { name: /log workout/i })).toBeVisible();
    await expect(page.getByText(/no exercises added yet/i)).toBeVisible();

    await logExercise(page, 'Bench Press', { '^sets': '3', '^reps': '10' });
    await expect(page.getByText('Total: +30 XP (1 exercise)')).toBeVisible();

    await logExercise(page, 'Mile Run', { distance: '0.3' });
    const session = page.getByRole('region', { name: /current session/i });
    await expect(session.getByText(/Bench Press — 3×10/)).toBeVisible();
    await expect(session.getByText(/Mile Run — 0\.3 miles/)).toBeVisible();
    await expect(page.getByText('Total: +33 XP (2 exercises)')).toBeVisible();

    await page.getByRole('button', { name: /finish workout/i }).click();

    await expect(page).toHaveURL(/\/hub$/);
    await expect(page.getByText('🔥 1 day streak')).toBeVisible();

    await page.getByRole('link', { name: /stats/i }).click();
    await expect(page).toHaveURL(/\/stats$/);
    // Bench: 30 + 30 = 60 XP → level 4 (was 2).
    await expect(page.getByRole('button', { name: 'Bench Press, level 4' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Mile Run, level 1' })).toBeVisible();

    // Persisted: survives a reload.
    await page.reload();
    await expect(page.getByRole('button', { name: 'Bench Press, level 4' })).toBeVisible();
  });

  test('finishing an empty session shows an inline alert and saves nothing', async ({ page }) => {
    await seed(page, legacySave());
    await page.goto('/workout');
    await expect(page.getByRole('heading', { name: /log workout/i })).toBeVisible();
    const before = await page.evaluate((key) => window.localStorage.getItem(key), SAVE_KEY);

    await page.getByRole('button', { name: /finish workout/i }).click();

    await expect(page.getByRole('alert')).toHaveText('Add at least one exercise before finishing!');
    await expect(page).toHaveURL(/\/workout$/);
    expect(await page.evaluate((key) => window.localStorage.getItem(key), SAVE_KEY)).toBe(before);
  });

  test('invalid input shows inline errors and stays on the form', async ({ page }) => {
    await seed(page, legacySave());
    await page.goto('/workout/benchPress');
    await page.getByLabel(/^sets/i).fill('0');
    await page.getByRole('button', { name: /log exercise/i }).click();
    await expect(page.getByText('Sets must be between 1 and 100.')).toBeVisible();
    await expect(page.getByText('Please enter reps.')).toBeVisible();
    await expect(page).toHaveURL(/\/workout\/benchPress$/);
  });

  test('the session survives visiting a form and going back; ✕ removes an entry', async ({ page }) => {
    await seed(page, legacySave());
    await page.goto('/workout');
    await logExercise(page, 'Swimming', { laps: '4' });
    await logExercise(page, 'Yoga', { '^sessions': '1' });
    await expect(page.getByText('Total: +30 XP (2 exercises)')).toBeVisible();

    await page.getByRole('button', { name: 'Cycling', exact: true }).click();
    await expect(page.getByRole('heading', { name: /cycling/i })).toBeVisible();
    await page.getByRole('button', { name: /back/i }).click();
    await expect(page.getByText('Total: +30 XP (2 exercises)')).toBeVisible();

    await page.getByRole('button', { name: 'Remove Swimming' }).click();
    await expect(page.getByRole('button', { name: 'Remove Swimming' })).toHaveCount(0);
    await expect(page.getByText('Total: +10 XP (1 exercise)')).toBeVisible();
  });

  test('a workout the day after the last one extends the streak (local dates)', async ({ page }) => {
    await seed(page, { ...legacySave(), dailyStreak: 4 }, true);
    await page.goto('/hub');
    await expect(page.getByText('🔥 4 day streak')).toBeVisible();
    await page.goto('/workout');
    await logExercise(page, 'Nutrition', { 'healthy meals': '2' });
    await page.getByRole('button', { name: /finish workout/i }).click();
    await expect(page).toHaveURL(/\/hub$/);
    await expect(page.getByText('🔥 5 day streak')).toBeVisible();
  });

  test('/workout/notAStat redirects to /workout', async ({ page }) => {
    await seed(page, legacySave());
    await page.goto('/workout/notAStat');
    await expect(page).toHaveURL(/\/workout$/);
    await expect(page.getByRole('heading', { name: /log workout/i })).toBeVisible();
  });

  test('/workout with no save redirects to Start', async ({ page }) => {
    await page.goto('/workout');
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByRole('button', { name: 'START' })).toBeVisible();
  });

  test('/workout/squat with no save redirects to Start', async ({ page }) => {
    await page.goto('/workout/squat');
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByRole('button', { name: 'START' })).toBeVisible();
  });
});
