import { render } from '@testing-library/react';
import type { ReactElement } from 'react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useWorkoutSession, useXpFeedback } from '@/features/workout/sessionContext';

function BareSession() {
  useWorkoutSession();
  return null;
}

function BareFeedback() {
  useXpFeedback();
  return null;
}

/** React rethrows render errors; stop jsdom from also printing them as uncaught. */
function expectRenderToThrow(ui: ReactElement, message: string) {
  vi.spyOn(console, 'error').mockImplementation(() => {});
  const swallow = (event: ErrorEvent) => event.preventDefault();
  window.addEventListener('error', swallow);
  try {
    expect(() => render(ui)).toThrow(message);
  } finally {
    window.removeEventListener('error', swallow);
  }
}

describe('useWorkoutSession', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('throws a clear error outside WorkoutSessionProvider', () => {
    expectRenderToThrow(
      <MemoryRouter>
        <BareSession />
      </MemoryRouter>,
      'useWorkoutSession must be used inside <WorkoutSessionProvider>',
    );
  });
});

describe('useXpFeedback', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('throws a clear error outside WorkoutLayout (no outlet context)', () => {
    expectRenderToThrow(
      <MemoryRouter initialEntries={['/workout']}>
        <Routes>
          <Route path="/workout" element={<BareFeedback />} />
        </Routes>
      </MemoryRouter>,
      'useXpFeedback must be used inside <WorkoutLayout>',
    );
  });
});
