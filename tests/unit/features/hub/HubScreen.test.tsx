import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { PlayerProvider } from '@/app/PlayerProvider';
import { usePlayer } from '@/app/playerContext';
import { HubScreen } from '@/features/hub/HubScreen';
import type { SaveData } from '@/lib/game/schema';
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

function renderHub(save: SaveData | null) {
  const user = userEvent.setup();
  render(
    <PlayerProvider repository={createMemoryRepository(save)}>
      <MemoryRouter initialEntries={['/hub']}>
        <WaitForLoad>
          <Routes>
            <Route path="/" element={<h1>Start stub</h1>} />
            <Route path="/hub" element={<HubScreen />} />
            <Route path="/stats" element={<h1>Stats stub</h1>} />
            <Route path="/workout" element={<h1>Workout stub</h1>} />
          </Routes>
          <LocationProbe />
        </WaitForLoad>
      </MemoryRouter>
    </PlayerProvider>,
  );
  return user;
}

describe('HubScreen', () => {
  it('shows the player summary', async () => {
    renderHub(legacySave());
    expect(await screen.findByText('Aragorn')).toBeInTheDocument();
    expect(screen.getByText('Level 1')).toBeInTheDocument();
    expect(screen.getByText('Total Level: 13')).toBeInTheDocument();
    expect(screen.getByText(/1 day streak/)).toBeInTheDocument();
  });

  it('renders the player name as a programmatically focusable h1 (focus target after dialogs)', async () => {
    renderHub(legacySave());
    const heading = await screen.findByRole('heading', { level: 1, name: 'Aragorn' });
    expect(heading).toHaveClass('hub-player-name');
    expect(heading).toHaveAttribute('tabindex', '-1');
    expect(heading.closest('.screen.active')).not.toBeNull();
  });

  it('enables the Stats panel as a link to /stats', async () => {
    renderHub(legacySave());
    const stats = await screen.findByRole('link', { name: /stats/i });
    expect(stats).toHaveAttribute('href', '/stats');
    expect(stats).toHaveTextContent('View your skills');
    expect(stats).not.toHaveTextContent('Coming soon');
  });

  it('enables the Log Workout panel as a link to /workout', async () => {
    renderHub(legacySave());
    const workout = await screen.findByRole('link', { name: /log workout/i });
    expect(workout).toHaveAttribute('href', '/workout');
    expect(workout).toHaveTextContent('Train & earn XP');
    expect(workout).not.toHaveTextContent('Coming soon');
  });

  it('keeps Quest Log and Profile disabled with "Coming soon"', async () => {
    renderHub(legacySave());
    await screen.findByRole('link', { name: /stats/i });
    for (const title of ['Quest Log', 'Profile']) {
      const panel = screen.getByRole('button', { name: new RegExp(title) });
      expect(panel).toBeDisabled();
      expect(panel).toHaveTextContent('Coming soon');
    }
    expect(screen.getAllByText('Coming soon')).toHaveLength(2);
    expect(screen.getAllByRole('button')).toHaveLength(2);
    expect(screen.getAllByRole('link')).toHaveLength(2);
  });

  it('navigates to /workout when the Log Workout panel is clicked', async () => {
    const user = renderHub(legacySave());
    await user.click(await screen.findByRole('link', { name: /log workout/i }));
    expect(await screen.findByRole('heading', { name: 'Workout stub' })).toBeInTheDocument();
    expect(screen.getByTestId('location')).toHaveTextContent('/workout');
  });

  it('navigates to /stats when the Stats panel is clicked', async () => {
    const user = renderHub(legacySave());
    await user.click(await screen.findByRole('link', { name: /stats/i }));
    expect(await screen.findByRole('heading', { name: 'Stats stub' })).toBeInTheDocument();
    expect(screen.getByTestId('location')).toHaveTextContent('/stats');
  });

  it('redirects to Start when there is no save', async () => {
    renderHub(null);
    expect(await screen.findByRole('heading', { name: 'Start stub' })).toBeInTheDocument();
  });
});
