import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { usePomodoro } from '@/hooks/usePomodoro';

describe('usePomodoro', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        // Clear localStorage mock
        vi.mocked(localStorage.getItem).mockReturnValue(null);
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.clearAllMocks();
    });

    it('initializes with work mode and 25 minutes', () => {
        const { result } = renderHook(() => usePomodoro());

        expect(result.current.mode).toBe('work');
        expect(result.current.timeRemaining).toBe(25 * 60);
        expect(result.current.isRunning).toBe(false);
        expect(result.current.formattedTime).toBe('25:00');
    });

    it('starts and stops timer correctly', () => {
        const { result } = renderHook(() => usePomodoro());

        // Start the timer
        act(() => {
            result.current.start();
        });

        expect(result.current.isRunning).toBe(true);

        // Advance time by 5 seconds
        act(() => {
            vi.advanceTimersByTime(5000);
        });

        expect(result.current.timeRemaining).toBe(25 * 60 - 5);

        // Pause the timer
        act(() => {
            result.current.pause();
        });

        expect(result.current.isRunning).toBe(false);
    });

    it('resets timer to initial duration', () => {
        const { result } = renderHook(() => usePomodoro());

        // Start and advance
        act(() => {
            result.current.start();
        });

        act(() => {
            vi.advanceTimersByTime(60000); // 1 minute
        });

        expect(result.current.timeRemaining).toBe(24 * 60);

        // Reset
        act(() => {
            result.current.reset();
        });

        expect(result.current.timeRemaining).toBe(25 * 60);
        expect(result.current.isRunning).toBe(false);
    });

    it('changes mode correctly', () => {
        const { result } = renderHook(() => usePomodoro());

        act(() => {
            result.current.setMode('shortBreak');
        });

        expect(result.current.mode).toBe('shortBreak');
        expect(result.current.timeRemaining).toBe(5 * 60);

        act(() => {
            result.current.setMode('longBreak');
        });

        expect(result.current.mode).toBe('longBreak');
        expect(result.current.timeRemaining).toBe(15 * 60);
    });

    it('calculates progress correctly', () => {
        const { result } = renderHook(() => usePomodoro());

        // Initial progress should be 0
        expect(result.current.progress).toBe(0);

        // Start and advance halfway
        act(() => {
            result.current.start();
        });

        act(() => {
            vi.advanceTimersByTime(12.5 * 60 * 1000); // Half of 25 minutes
        });

        // Progress should be approximately 50%
        expect(result.current.progress).toBeCloseTo(50, 0);
    });

    it('skips to next mode correctly', () => {
        const { result } = renderHook(() => usePomodoro());

        // Start in work mode
        expect(result.current.mode).toBe('work');

        // Skip should go to short break
        act(() => {
            result.current.skip();
        });

        expect(result.current.mode).toBe('shortBreak');
        expect(result.current.sessionsCompleted).toBe(1);

        // Skip again should go back to work
        act(() => {
            result.current.skip();
        });

        expect(result.current.mode).toBe('work');
    });

    it('formats time correctly', () => {
        const { result } = renderHook(() => usePomodoro());

        expect(result.current.formattedTime).toBe('25:00');

        act(() => {
            result.current.start();
        });

        act(() => {
            vi.advanceTimersByTime(65000); // 1 minute 5 seconds
        });

        expect(result.current.formattedTime).toBe('23:55');
    });
});
