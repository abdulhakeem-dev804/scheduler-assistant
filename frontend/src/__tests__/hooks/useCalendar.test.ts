import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCalendar } from '@/hooks/useCalendar';
import { addMonths, subMonths, addWeeks, subWeeks, addDays, subDays, startOfToday } from 'date-fns';

describe('useCalendar', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2026-01-07T12:00:00.000Z'));
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('initializes with default values', () => {
        const { result } = renderHook(() => useCalendar());

        expect(result.current.view).toBe('month');
        expect(result.current.selectedDate).toBeNull();
        expect(result.current.currentDate).toEqual(startOfToday());
    });

    it('allows setting initial view', () => {
        const { result } = renderHook(() => useCalendar('week'));

        expect(result.current.view).toBe('week');
    });

    it('changes view correctly', () => {
        const { result } = renderHook(() => useCalendar());

        act(() => {
            result.current.setView('day');
        });

        expect(result.current.view).toBe('day');
    });

    it('navigates to previous month in month view', () => {
        const { result } = renderHook(() => useCalendar('month'));
        const initialDate = result.current.currentDate;

        act(() => {
            result.current.previous();
        });

        expect(result.current.currentDate).toEqual(subMonths(initialDate, 1));
    });

    it('navigates to next month in month view', () => {
        const { result } = renderHook(() => useCalendar('month'));
        const initialDate = result.current.currentDate;

        act(() => {
            result.current.next();
        });

        expect(result.current.currentDate).toEqual(addMonths(initialDate, 1));
    });

    it('navigates to previous week in week view', () => {
        const { result } = renderHook(() => useCalendar('week'));
        const initialDate = result.current.currentDate;

        act(() => {
            result.current.previous();
        });

        expect(result.current.currentDate).toEqual(subWeeks(initialDate, 1));
    });

    it('navigates to next day in day view', () => {
        const { result } = renderHook(() => useCalendar('day'));
        const initialDate = result.current.currentDate;

        act(() => {
            result.current.next();
        });

        expect(result.current.currentDate).toEqual(addDays(initialDate, 1));
    });

    it('goToToday sets current date to today', () => {
        const { result } = renderHook(() => useCalendar());

        // First navigate away
        act(() => {
            result.current.next();
            result.current.next();
        });

        // Then go to today
        act(() => {
            result.current.goToToday();
        });

        expect(result.current.currentDate).toEqual(startOfToday());
        expect(result.current.selectedDate).toEqual(startOfToday());
    });

    it('sets selected date correctly', () => {
        const { result } = renderHook(() => useCalendar());
        const testDate = new Date('2026-02-15');

        act(() => {
            result.current.setSelectedDate(testDate);
        });

        expect(result.current.selectedDate).toEqual(testDate);
    });
});
