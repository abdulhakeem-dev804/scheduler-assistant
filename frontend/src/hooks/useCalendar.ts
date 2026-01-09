'use client';

import { useState, useCallback } from 'react';
import { addMonths, subMonths, addWeeks, subWeeks, addDays, subDays, startOfToday } from 'date-fns';
import { CalendarView, CalendarState } from '@/types';

export function useCalendar(initialView: CalendarView = 'focus') {
    const [state, setState] = useState<CalendarState>({
        currentDate: startOfToday(),
        selectedDate: null,
        view: initialView,
    });

    const setView = useCallback((view: CalendarView) => {
        setState((s) => ({ ...s, view }));
    }, []);

    const setSelectedDate = useCallback((date: Date | null) => {
        setState((s) => ({ ...s, selectedDate: date }));
    }, []);

    const setCurrentDate = useCallback((date: Date) => {
        setState((s) => ({ ...s, currentDate: date }));
    }, []);

    const goToToday = useCallback(() => {
        setState((s) => ({
            ...s,
            currentDate: startOfToday(),
            selectedDate: startOfToday(),
        }));
    }, []);

    const previous = useCallback(() => {
        setState((s) => {
            let newDate: Date;
            switch (s.view) {
                case 'month':
                    newDate = subMonths(s.currentDate, 1);
                    break;
                case 'week':
                    newDate = subWeeks(s.currentDate, 1);
                    break;
                case 'day':
                case 'agenda':
                    newDate = subDays(s.currentDate, 1);
                    break;
                default:
                    newDate = s.currentDate;
            }
            return { ...s, currentDate: newDate };
        });
    }, []);

    const next = useCallback(() => {
        setState((s) => {
            let newDate: Date;
            switch (s.view) {
                case 'month':
                    newDate = addMonths(s.currentDate, 1);
                    break;
                case 'week':
                    newDate = addWeeks(s.currentDate, 1);
                    break;
                case 'day':
                case 'agenda':
                    newDate = addDays(s.currentDate, 1);
                    break;
                default:
                    newDate = s.currentDate;
            }
            return { ...s, currentDate: newDate };
        });
    }, []);

    return {
        ...state,
        setView,
        setSelectedDate,
        setCurrentDate,
        goToToday,
        previous,
        next,
    };
}
