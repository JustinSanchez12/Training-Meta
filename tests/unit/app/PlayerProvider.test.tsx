import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PlayerProvider } from '@/app/PlayerProvider';
import { usePlayer } from '@/app/playerContext';
import type { SaveRepository } from '@/lib/storage';
import { legacySave } from '../fixtures/saves';

function Status() {
  const { status, save } = usePlayer();
  return <p>{status === 'loading' ? 'loading' : (save?.player.name ?? 'no save')}</p>;
}

function repositoryWith(load: SaveRepository['load']): SaveRepository {
  return { load, save: vi.fn(async () => {}), clear: vi.fn(async () => {}) };
}

describe('PlayerProvider', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('exposes the loaded save once ready', async () => {
    render(
      <PlayerProvider repository={repositoryWith(async () => legacySave())}>
        <Status />
      </PlayerProvider>,
    );
    expect(await screen.findByText('Aragorn')).toBeInTheDocument();
  });

  it('treats a failed load as "no save" instead of hanging on loading', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    render(
      <PlayerProvider repository={repositoryWith(async () => Promise.reject(new Error('boom')))}>
        <Status />
      </PlayerProvider>,
    );
    expect(await screen.findByText('no save')).toBeInTheDocument();
    expect(error).toHaveBeenCalled();
  });
});
