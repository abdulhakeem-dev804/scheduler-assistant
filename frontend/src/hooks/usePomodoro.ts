'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { pomodoroStorage, preferencesStorage, statsStorage } from '@/lib/storage';
import { PomodoroState, PomodoroMode } from '@/types';
import { formatPomodoroTime } from '@/lib/utils';
import { format } from 'date-fns';

export function usePomodoro() {
    const [state, setState] = useState<PomodoroState>(() => pomodoroStorage.get());
    const intervalRef = useRef<NodeJS.Timeout | null>(null);
    const settings = preferencesStorage.get().pomodoroSettings;

    // Persist state changes
    useEffect(() => {
        pomodoroStorage.save(state);
    }, [state]);

    // Cleanup interval on unmount
    useEffect(() => {
        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
        };
    }, []);

    const getDuration = useCallback((mode: PomodoroMode): number => {
        switch (mode) {
            case 'work':
                return settings.workDuration * 60;
            case 'shortBreak':
                return settings.shortBreakDuration * 60;
            case 'longBreak':
                return settings.longBreakDuration * 60;
        }
    }, [settings]);

    const start = useCallback(() => {
        if (intervalRef.current) return;

        setState((s) => ({ ...s, isRunning: true }));

        intervalRef.current = setInterval(() => {
            setState((s) => {
                if (s.timeRemaining <= 0) {
                    // Timer completed
                    if (intervalRef.current) {
                        clearInterval(intervalRef.current);
                        intervalRef.current = null;
                    }

                    // Update stats if work session
                    if (s.mode === 'work') {
                        const today = format(new Date(), 'yyyy-MM-dd');
                        const currentStats = statsStorage.getAll().find((stat) => stat.date === today);
                        statsStorage.addOrUpdate(today, {
                            pomodoroSessions: (currentStats?.pomodoroSessions ?? 0) + 1,
                            focusTime: (currentStats?.focusTime ?? 0) + settings.workDuration,
                        });
                    }

                    // Determine next mode
                    const newSessions = s.mode === 'work' ? s.sessionsCompleted + 1 : s.sessionsCompleted;
                    const shouldLongBreak = newSessions > 0 && newSessions % settings.sessionsBeforeLongBreak === 0;
                    const nextMode: PomodoroMode =
                        s.mode === 'work'
                            ? (shouldLongBreak ? 'longBreak' : 'shortBreak')
                            : 'work';

                    return {
                        ...s,
                        mode: nextMode,
                        timeRemaining: getDuration(nextMode),
                        isRunning: false,
                        sessionsCompleted: newSessions,
                        totalWorkTime: s.mode === 'work' ? s.totalWorkTime + settings.workDuration : s.totalWorkTime,
                    };
                }

                return { ...s, timeRemaining: s.timeRemaining - 1 };
            });
        }, 1000);
    }, [getDuration, settings]);

    const pause = useCallback(() => {
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
        }
        setState((s) => ({ ...s, isRunning: false }));
    }, []);

    const reset = useCallback(() => {
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
        }
        setState((s) => ({
            ...s,
            timeRemaining: getDuration(s.mode),
            isRunning: false,
        }));
    }, [getDuration]);

    const setMode = useCallback((mode: PomodoroMode) => {
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
        }
        setState((s) => ({
            ...s,
            mode,
            timeRemaining: getDuration(mode),
            isRunning: false,
        }));
    }, [getDuration]);

    const skip = useCallback(() => {
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
        }

        setState((s) => {
            const newSessions = s.mode === 'work' ? s.sessionsCompleted + 1 : s.sessionsCompleted;
            const shouldLongBreak = newSessions > 0 && newSessions % settings.sessionsBeforeLongBreak === 0;
            const nextMode: PomodoroMode =
                s.mode === 'work'
                    ? (shouldLongBreak ? 'longBreak' : 'shortBreak')
                    : 'work';

            return {
                ...s,
                mode: nextMode,
                timeRemaining: getDuration(nextMode),
                isRunning: false,
                sessionsCompleted: newSessions,
            };
        });
    }, [getDuration, settings.sessionsBeforeLongBreak]);

    const formattedTime = formatPomodoroTime(state.timeRemaining);
    const progress = ((getDuration(state.mode) - state.timeRemaining) / getDuration(state.mode)) * 100;

    return {
        ...state,
        formattedTime,
        progress,
        start,
        pause,
        reset,
        setMode,
        skip,
    };
}
