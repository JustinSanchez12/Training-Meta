import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { XP_POPUP_DONE_MS, XP_POPUP_FADE_MS, XpPopup } from '@/features/workout/XpPopup';

const popup = () => screen.getByText('+30 XP', { exact: false });

describe('XpPopup', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date', 'setTimeout', 'clearTimeout', 'requestAnimationFrame', 'cancelAnimationFrame'] });
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('uses the legacy timings', () => {
    expect(XP_POPUP_FADE_MS).toBe(1500);
    expect(XP_POPUP_DONE_MS).toBe(2000);
  });

  it('shows "+N XP" and the exercise name, hidden from assistive tech', () => {
    render(<XpPopup xp={30} name="Bench Press" onDone={vi.fn()} />);
    expect(popup()).toHaveTextContent('+30 XPBench Press');
    expect(popup()).toHaveAttribute('aria-hidden', 'true');
    expect(screen.queryByText('Bench Press', { selector: 'small' })).toBeInTheDocument();
  });

  it('goes enter → show (next frame) → show fade (1500 ms), and calls onDone once at 2000 ms', () => {
    const onDone = vi.fn();
    const start = Date.now();
    render(<XpPopup xp={30} name="Bench Press" onDone={onDone} />);
    expect(popup()).toHaveClass('xp-popup', { exact: true });

    act(() => vi.advanceTimersToNextFrame());
    expect(popup()).toHaveClass('xp-popup show', { exact: true });

    // Track absolute time: the frame above already advanced the clock.
    const elapsed = Date.now() - start;
    act(() => vi.advanceTimersByTime(XP_POPUP_FADE_MS - elapsed - 1));
    expect(popup()).toHaveClass('xp-popup show', { exact: true });
    act(() => vi.advanceTimersByTime(1));
    expect(popup()).toHaveClass('xp-popup show fade', { exact: true });

    act(() => vi.advanceTimersByTime(XP_POPUP_DONE_MS - XP_POPUP_FADE_MS - 1));
    expect(onDone).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(1));
    expect(onDone).toHaveBeenCalledTimes(1);

    act(() => vi.advanceTimersByTime(10_000));
    expect(onDone).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('calls the latest onDone if the prop changes mid-way', () => {
    const first = vi.fn();
    const second = vi.fn();
    const { rerender } = render(<XpPopup xp={30} name="Bench Press" onDone={first} />);
    act(() => vi.advanceTimersByTime(1000));
    rerender(<XpPopup xp={30} name="Bench Press" onDone={second} />);
    act(() => vi.advanceTimersByTime(1000));
    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['before the first frame', 0],
    ['while showing', 1000],
    ['while fading', 1800],
  ])('leaves no pending timers when unmounted %s', (_label, elapsed) => {
    const onDone = vi.fn();
    const { unmount } = render(<XpPopup xp={30} name="Bench Press" onDone={onDone} />);
    expect(vi.getTimerCount()).toBeGreaterThan(0);
    if (elapsed > 0) act(() => vi.advanceTimersByTime(elapsed));
    unmount();
    expect(vi.getTimerCount()).toBe(0);
    vi.advanceTimersByTime(5000);
    expect(onDone).not.toHaveBeenCalled();
  });
});
