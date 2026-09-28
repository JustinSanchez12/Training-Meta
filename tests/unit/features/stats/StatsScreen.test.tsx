import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { PlayerProvider } from '@/app/PlayerProvider';
import { usePlayer } from '@/app/playerContext';
import { StatsScreen } from '@/features/stats/StatsScreen';
import type { SaveData } from '@/lib/game/schema';
import { STAT_DEFINITIONS, STAT_ORDER } from '@/lib/game/stats';
import type { SaveRepository } from '@/lib/storage';
import { legacySave } from '../../fixtures/saves';

function createMemoryRepository(initial: SaveData | null = null) {
  let stored = initial;
  return {
    load: vi.fn(async () => stored),
    save: vi.fn(async (data: SaveData) => {
      stored = data;
    }),
    clear: vi.fn(async () => {
      stored = null;
    }),
  } satisfies SaveRepository;
}

/** Mirrors App: render nothing until the save has loaded. */
function WaitForLoad({ children }: { children: ReactNode }) {
  const { status } = usePlayer();
  return status === 'loading' ? null : <>{children}</>;
}

function LocationProbe() {
  return <div data-testid="location">{useLocation().pathname}</div>;
}

function renderStats(save: SaveData | null) {
  const user = userEvent.setup();
  render(
    <PlayerProvider repository={createMemoryRepository(save)}>
      <MemoryRouter initialEntries={['/stats']}>
        <WaitForLoad>
          <Routes>
            <Route path="/" element={<h1>Start stub</h1>} />
            <Route path="/hub" element={<h1>Hub stub</h1>} />
            <Route path="/stats" element={<StatsScreen />} />
          </Routes>
          <LocationProbe />
        </WaitForLoad>
      </MemoryRouter>
    </PlayerProvider>,
  );
  return user;
}

function maxedSave(): SaveData {
  const save = legacySave();
  save.stats.deadlift = { level: 99, xp: 11573 };
  return save;
}

/** The value cell next to an info-row label in the detail panel. */
function infoValue(dialog: HTMLElement, label: string) {
  return within(dialog).getByText(label).nextElementSibling;
}

describe('StatsScreen', () => {
  it('renders the header with the Total Level and a link back to the Hub', async () => {
    renderStats(legacySave());
    expect(await screen.findByRole('heading', { name: /stats/i })).toBeInTheDocument();
    expect(screen.getByText('Total Level: 13')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /hub/i })).toHaveAttribute('href', '/hub');
  });

  it('renders 12 stat cell buttons in STAT_ORDER named "<Name>, level N"', async () => {
    renderStats(legacySave());
    await screen.findByRole('heading', { name: /stats/i });
    const cells = screen.getAllByRole('button', { name: /, level \d+$/ });
    expect(cells).toHaveLength(12);
    const expected = STAT_ORDER.map((key) => `${STAT_DEFINITIONS[key].name}, level ${key === 'benchPress' ? 2 : 1}`);
    expect(cells.map((cell) => cell.getAttribute('aria-label'))).toEqual(expected);
  });

  it('does not show the detail panel until a cell is clicked', async () => {
    renderStats(legacySave());
    await screen.findByRole('heading', { name: /stats/i });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('opens a dialog with the stat details when a cell is clicked', async () => {
    const user = renderStats(legacySave());
    await user.click(await screen.findByRole('button', { name: 'Bench Press, level 2' }));

    const dialog = screen.getByRole('dialog', { name: 'Bench Press' });
    expect(within(dialog).getByText('Level').nextElementSibling).toHaveTextContent(/^2$/);
    expect(within(dialog).getByText('10 / 13 XP')).toBeInTheDocument();
    expect(infoValue(dialog, 'Total XP')).toHaveTextContent(/^30$/);
    expect(infoValue(dialog, 'Category')).toHaveTextContent('Strength');
    expect(infoValue(dialog, 'XP Rule')).toHaveTextContent('sets × reps = XP');
  });

  it('floors float XP in the detail panel', async () => {
    const user = renderStats(legacySave());
    await user.click(await screen.findByRole('button', { name: 'Mile Run, level 1' }));
    const dialog = screen.getByRole('dialog', { name: 'Mile Run' });
    expect(within(dialog).getByText('3 / 20 XP')).toBeInTheDocument();
    expect(infoValue(dialog, 'Total XP')).toHaveTextContent(/^3$/);
    expect(infoValue(dialog, 'Category')).toHaveTextContent('Cardio');
    expect(infoValue(dialog, 'XP Rule')).toHaveTextContent('1 mile = 10 XP');
  });

  it('moves focus to Back when the panel opens', async () => {
    const user = renderStats(legacySave());
    await user.click(await screen.findByRole('button', { name: 'Bench Press, level 2' }));
    expect(screen.getByRole('button', { name: /back/i })).toHaveFocus();
  });

  it('closes the dialog with Back and returns focus to the cell', async () => {
    const user = renderStats(legacySave());
    const cell = await screen.findByRole('button', { name: 'Squat, level 1' });
    await user.click(cell);
    expect(screen.getByRole('dialog', { name: 'Squat' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /back/i }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(cell).toHaveFocus();
  });

  it('closes the dialog with Escape and returns focus to the cell that opened it', async () => {
    const user = renderStats(legacySave());
    const cell = await screen.findByRole('button', { name: 'Bench Press, level 2' });
    await user.click(cell);
    expect(screen.getByRole('dialog', { name: 'Bench Press' })).toBeInTheDocument();

    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(cell).toHaveFocus();
  });

  it('opens a different stat after closing the first', async () => {
    const user = renderStats(legacySave());
    await user.click(await screen.findByRole('button', { name: 'Bench Press, level 2' }));
    await user.keyboard('{Escape}');
    const yoga = screen.getByRole('button', { name: 'Yoga, level 1' });
    await user.click(yoga);
    const dialog = screen.getByRole('dialog', { name: 'Yoga' });
    expect(infoValue(dialog, 'Category')).toHaveTextContent('Flexibility');
    await user.keyboard('{Escape}');
    expect(yoga).toHaveFocus();
  });

  it('shows MAX LEVEL for a stat at 11573 XP', async () => {
    const user = renderStats(maxedSave());
    expect(await screen.findByText('Total Level: 111')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Deadlift, level 99' }));
    const dialog = screen.getByRole('dialog', { name: 'Deadlift' });
    expect(within(dialog).getByText('MAX LEVEL')).toBeInTheDocument();
    expect(within(dialog).queryByText(/\d+ \/ \d+ XP/)).not.toBeInTheDocument();
    expect(infoValue(dialog, 'Total XP')).toHaveTextContent(/^11573$/);
  });

  it('goes to the Hub from "← Hub"', async () => {
    const user = renderStats(legacySave());
    await user.click(await screen.findByRole('link', { name: /hub/i }));
    expect(await screen.findByRole('heading', { name: 'Hub stub' })).toBeInTheDocument();
    expect(screen.getByTestId('location')).toHaveTextContent('/hub');
  });

  it('redirects to Start when there is no save', async () => {
    renderStats(null);
    expect(await screen.findByRole('heading', { name: 'Start stub' })).toBeInTheDocument();
    expect(screen.getByTestId('location')).toHaveTextContent(/^\/$/);
  });
});
