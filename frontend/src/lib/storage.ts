// Local storage wrapper for persistence
import { Event, UserPreferences, PomodoroState, DailyStats } from '@/types';

const STORAGE_KEYS = {
    EVENTS: 'scheduler_events',
    PREFERENCES: 'scheduler_preferences',
    POMODORO: 'scheduler_pomodoro',
    STATS: 'scheduler_stats',
} as const;

// Helper to safely parse JSON
function safeJsonParse<T>(value: string | null, fallback: T): T {
    if (!value) return fallback;
    try {
        return JSON.parse(value) as T;
    } catch {
        return fallback;
    }
}

// Events storage
export const eventsStorage = {
    getAll(): Event[] {
        if (typeof window === 'undefined') return [];
        return safeJsonParse(localStorage.getItem(STORAGE_KEYS.EVENTS), []);
    },

    save(events: Event[]): void {
        if (typeof window === 'undefined') return;
        localStorage.setItem(STORAGE_KEYS.EVENTS, JSON.stringify(events));
    },

    add(event: Event): void {
        const events = this.getAll();
        events.push(event);
        this.save(events);
    },

    update(id: string, updates: Partial<Event>): Event | null {
        const events = this.getAll();
        const index = events.findIndex(e => e.id === id);
        if (index === -1) return null;
        events[index] = { ...events[index], ...updates, updatedAt: new Date().toISOString() };
        this.save(events);
        return events[index];
    },

    delete(id: string): boolean {
        const events = this.getAll();
        const filtered = events.filter(e => e.id !== id);
        if (filtered.length === events.length) return false;
        this.save(filtered);
        return true;
    },

    getById(id: string): Event | undefined {
        return this.getAll().find(e => e.id === id);
    },
};

// Preferences storage
export const preferencesStorage = {
    get(): UserPreferences {
        if (typeof window === 'undefined') return getDefaultPreferences();
        return safeJsonParse(localStorage.getItem(STORAGE_KEYS.PREFERENCES), getDefaultPreferences());
    },

    save(preferences: UserPreferences): void {
        if (typeof window === 'undefined') return;
        localStorage.setItem(STORAGE_KEYS.PREFERENCES, JSON.stringify(preferences));
    },

    update(updates: Partial<UserPreferences>): UserPreferences {
        const current = this.get();
        const updated = { ...current, ...updates };
        this.save(updated);
        return updated;
    },
};

// Pomodoro storage
export const pomodoroStorage = {
    get(): PomodoroState {
        if (typeof window === 'undefined') return getDefaultPomodoroState();
        return safeJsonParse(localStorage.getItem(STORAGE_KEYS.POMODORO), getDefaultPomodoroState());
    },

    save(state: PomodoroState): void {
        if (typeof window === 'undefined') return;
        localStorage.setItem(STORAGE_KEYS.POMODORO, JSON.stringify(state));
    },
};

// Stats storage
export const statsStorage = {
    getAll(): DailyStats[] {
        if (typeof window === 'undefined') return [];
        return safeJsonParse(localStorage.getItem(STORAGE_KEYS.STATS), []);
    },

    save(stats: DailyStats[]): void {
        if (typeof window === 'undefined') return;
        localStorage.setItem(STORAGE_KEYS.STATS, JSON.stringify(stats));
    },

    addOrUpdate(date: string, updates: Partial<DailyStats>): void {
        const stats = this.getAll();
        const index = stats.findIndex(s => s.date === date);
        if (index === -1) {
            stats.push({
                date,
                eventsCompleted: 0,
                totalEvents: 0,
                pomodoroSessions: 0,
                focusTime: 0,
                ...updates,
            });
        } else {
            stats[index] = { ...stats[index], ...updates };
        }
        this.save(stats);
    },
};

// Default values
function getDefaultPreferences(): UserPreferences {
    return {
        theme: 'system',
        pomodoroSettings: {
            workDuration: 25,
            shortBreakDuration: 5,
            longBreakDuration: 15,
            sessionsBeforeLongBreak: 4,
        },
        defaultView: 'month',
        weekStartsOn: 1,
    };
}

function getDefaultPomodoroState(): PomodoroState {
    return {
        mode: 'work',
        timeRemaining: 25 * 60,
        isRunning: false,
        sessionsCompleted: 0,
        totalWorkTime: 0,
    };
}
