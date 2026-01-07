/**
 * Storage Module - Scheduler Assistant
 * Handles LocalStorage operations for persistence
 */

const STORAGE_KEYS = {
    EVENTS: 'scheduler_events',
    PREFERENCES: 'scheduler_preferences',
    POMODORO: 'scheduler_pomodoro',
    STATS: 'scheduler_stats'
};

// Default preferences
const defaultPreferences = {
    theme: 'light',
    defaultView: 'month',
    weekStartsOn: 0, // 0 = Sunday, 1 = Monday
    timeFormat: '12h',
    defaultDuration: 60, // minutes
    showWeekNumbers: false,
    categories: [
        { id: 'work', name: 'Work', color: '#6366f1', icon: '💼' },
        { id: 'personal', name: 'Personal', color: '#ec4899', icon: '👤' },
        { id: 'health', name: 'Health', color: '#22c55e', icon: '🏃' },
        { id: 'learning', name: 'Learning', color: '#8b5cf6', icon: '📚' },
        { id: 'finance', name: 'Finance', color: '#eab308', icon: '💰' },
        { id: 'social', name: 'Social', color: '#06b6d4', icon: '👥' }
    ],
    pomodoroSettings: {
        workDuration: 25,
        shortBreak: 5,
        longBreak: 15,
        sessionsBeforeLongBreak: 4,
        autoStartBreaks: false,
        soundEnabled: true
    }
};

// Default stats
const defaultStats = {
    tasksCompleted: 0,
    pomodoroSessions: 0,
    totalFocusMinutes: 0,
    streakDays: 0,
    lastActiveDate: null,
    dailyStats: {},
    categoryStats: {}
};

/**
 * Storage class for handling all LocalStorage operations
 */
class Storage {
    constructor() {
        this.init();
    }

    /**
     * Initialize storage with defaults if empty
     */
    init() {
        if (!this.get(STORAGE_KEYS.EVENTS)) {
            this.set(STORAGE_KEYS.EVENTS, []);
        }
        if (!this.get(STORAGE_KEYS.PREFERENCES)) {
            this.set(STORAGE_KEYS.PREFERENCES, defaultPreferences);
        }
        if (!this.get(STORAGE_KEYS.STATS)) {
            this.set(STORAGE_KEYS.STATS, defaultStats);
        }
        if (!this.get(STORAGE_KEYS.POMODORO)) {
            this.set(STORAGE_KEYS.POMODORO, { sessions: [], currentSession: null });
        }
    }

    /**
     * Get item from storage
     */
    get(key) {
        try {
            const item = localStorage.getItem(key);
            return item ? JSON.parse(item) : null;
        } catch (error) {
            console.error(`Error reading from storage: ${key}`, error);
            return null;
        }
    }

    /**
     * Set item in storage
     */
    set(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
            return true;
        } catch (error) {
            console.error(`Error writing to storage: ${key}`, error);
            return false;
        }
    }

    /**
     * Remove item from storage
     */
    remove(key) {
        try {
            localStorage.removeItem(key);
            return true;
        } catch (error) {
            console.error(`Error removing from storage: ${key}`, error);
            return false;
        }
    }

    /**
     * Clear all storage
     */
    clear() {
        try {
            Object.values(STORAGE_KEYS).forEach(key => {
                localStorage.removeItem(key);
            });
            this.init();
            return true;
        } catch (error) {
            console.error('Error clearing storage', error);
            return false;
        }
    }

    // ==================== Events ====================

    /**
     * Get all events
     */
    getEvents() {
        return this.get(STORAGE_KEYS.EVENTS) || [];
    }

    /**
     * Save all events
     */
    saveEvents(events) {
        return this.set(STORAGE_KEYS.EVENTS, events);
    }

    /**
     * Get event by ID
     */
    getEvent(id) {
        const events = this.getEvents();
        return events.find(e => e.id === id);
    }

    /**
     * Add new event
     */
    addEvent(event) {
        const events = this.getEvents();
        events.push(event);
        return this.saveEvents(events);
    }

    /**
     * Update event
     */
    updateEvent(id, updates) {
        const events = this.getEvents();
        const index = events.findIndex(e => e.id === id);
        if (index !== -1) {
            events[index] = { ...events[index], ...updates, updatedAt: new Date().toISOString() };
            return this.saveEvents(events);
        }
        return false;
    }

    /**
     * Delete event
     */
    deleteEvent(id) {
        const events = this.getEvents();
        const filtered = events.filter(e => e.id !== id);
        return this.saveEvents(filtered);
    }

    /**
     * Get events for date range
     */
    getEventsInRange(startDate, endDate) {
        const events = this.getEvents();
        const start = new Date(startDate).getTime();
        const end = new Date(endDate).getTime();

        return events.filter(event => {
            const eventStart = new Date(event.startDate).getTime();
            const eventEnd = new Date(event.endDate).getTime();
            return eventStart <= end && eventEnd >= start;
        });
    }

    /**
     * Get events for specific date
     */
    getEventsForDate(date) {
        const events = this.getEvents();
        const targetDate = new Date(date).toDateString();

        return events.filter(event => {
            const eventDate = new Date(event.startDate).toDateString();
            return eventDate === targetDate;
        });
    }

    // ==================== Preferences ====================

    /**
     * Get all preferences
     */
    getPreferences() {
        return { ...defaultPreferences, ...this.get(STORAGE_KEYS.PREFERENCES) };
    }

    /**
     * Update preferences
     */
    updatePreferences(updates) {
        const prefs = this.getPreferences();
        return this.set(STORAGE_KEYS.PREFERENCES, { ...prefs, ...updates });
    }

    /**
     * Get theme
     */
    getTheme() {
        return this.getPreferences().theme;
    }

    /**
     * Set theme
     */
    setTheme(theme) {
        return this.updatePreferences({ theme });
    }

    /**
     * Get categories
     */
    getCategories() {
        return this.getPreferences().categories;
    }

    /**
     * Add category
     */
    addCategory(category) {
        const prefs = this.getPreferences();
        prefs.categories.push(category);
        return this.set(STORAGE_KEYS.PREFERENCES, prefs);
    }

    // ==================== Stats ====================

    /**
     * Get stats
     */
    getStats() {
        return { ...defaultStats, ...this.get(STORAGE_KEYS.STATS) };
    }

    /**
     * Update stats
     */
    updateStats(updates) {
        const stats = this.getStats();
        return this.set(STORAGE_KEYS.STATS, { ...stats, ...updates });
    }

    /**
     * Increment task completed
     */
    incrementTaskCompleted() {
        const stats = this.getStats();
        const today = new Date().toDateString();

        stats.tasksCompleted++;
        stats.dailyStats[today] = (stats.dailyStats[today] || 0) + 1;
        stats.lastActiveDate = today;

        return this.set(STORAGE_KEYS.STATS, stats);
    }

    /**
     * Add pomodoro session
     */
    addPomodoroSession(minutes) {
        const stats = this.getStats();
        stats.pomodoroSessions++;
        stats.totalFocusMinutes += minutes;
        return this.set(STORAGE_KEYS.STATS, stats);
    }

    // ==================== Pomodoro ====================

    /**
     * Get pomodoro data
     */
    getPomodoro() {
        return this.get(STORAGE_KEYS.POMODORO) || { sessions: [], currentSession: null };
    }

    /**
     * Save pomodoro data
     */
    savePomodoro(data) {
        return this.set(STORAGE_KEYS.POMODORO, data);
    }

    // ==================== Import/Export ====================

    /**
     * Export all data
     */
    exportData() {
        return {
            version: '1.0',
            exportedAt: new Date().toISOString(),
            events: this.getEvents(),
            preferences: this.getPreferences(),
            stats: this.getStats(),
            pomodoro: this.getPomodoro()
        };
    }

    /**
     * Import data
     */
    importData(data) {
        try {
            if (data.events) this.saveEvents(data.events);
            if (data.preferences) this.set(STORAGE_KEYS.PREFERENCES, data.preferences);
            if (data.stats) this.set(STORAGE_KEYS.STATS, data.stats);
            if (data.pomodoro) this.savePomodoro(data.pomodoro);
            return true;
        } catch (error) {
            console.error('Error importing data', error);
            return false;
        }
    }

    /**
     * Download data as JSON file
     */
    downloadExport() {
        const data = this.exportData();
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `scheduler-backup-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
    }
}

// Export singleton instance
export const storage = new Storage();
export { STORAGE_KEYS };
