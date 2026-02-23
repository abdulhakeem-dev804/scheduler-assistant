// TypeScript interfaces for Scheduler Assistant

export interface Subtask {
    id: string;
    title: string;
    completed: boolean;
}

// Session Attendance Types
export type SessionStatus = 'pending' | 'attended' | 'missed' | 'skipped';

export interface SessionAttendance {
    id: string;
    eventId: string;
    sessionDate: string;  // YYYY-MM-DD format
    status: SessionStatus;
    notes?: string;
    createdAt?: string;
}

export interface SessionStats {
    totalSessions: number;
    attended: number;
    missed: number;
    skipped: number;
    pending: number;
    attendanceRate: number;  // percentage 0-100
    currentStreak: number;   // consecutive attended days
}

export type Resolution = 'pending' | 'completed' | 'missed' | 'rescheduled';

export type TimingMode = 'specific' | 'anytime' | 'deadline';

export interface Event {
    id: string;
    title: string;
    description?: string;
    startDate: string;
    endDate: string;
    category: EventCategory;
    priority: Priority;
    isRecurring: boolean;
    isCompleted: boolean;
    // Smart Planner fields
    subtasks: Subtask[];
    timingMode: TimingMode;
    resolution: Resolution;
    rescheduleCount: number;
    originalStartDate?: string;
    // Daily time control for multi-day events
    dailyStartTime?: string;  // "HH:mm" format
    dailyEndTime?: string;    // "HH:mm" format
    createdAt: string;
    updatedAt: string;
}

export type EventCategory = 'work' | 'personal' | 'health' | 'learning' | 'finance' | 'social';

export type Priority = 'high' | 'medium' | 'low';

export interface CreateEventInput {
    title: string;
    description?: string;
    startDate: string;
    endDate: string;
    category: EventCategory;
    priority: Priority;
    isRecurring?: boolean;
    subtasks?: Subtask[];
    timingMode?: TimingMode;
    dailyStartTime?: string;  // "HH:mm" format
    dailyEndTime?: string;    // "HH:mm" format
}

export interface UpdateEventInput extends Partial<CreateEventInput> {
    isCompleted?: boolean;
    resolution?: Resolution;
}

// Calendar types
export type CalendarView = 'focus' | 'month' | 'week' | 'day' | 'agenda' | 'stats';

export interface CalendarState {
    currentDate: Date;
    selectedDate: Date | null;
    view: CalendarView;
}

// Pomodoro types
export type PomodoroMode = 'work' | 'shortBreak' | 'longBreak';

export interface PomodoroState {
    mode: PomodoroMode;
    timeRemaining: number;
    isRunning: boolean;
    sessionsCompleted: number;
    totalWorkTime: number;
}

export interface PomodoroSettings {
    workDuration: number;
    shortBreakDuration: number;
    longBreakDuration: number;
    sessionsBeforeLongBreak: number;
}

// Stats types
export interface DailyStats {
    date: string;
    eventsCompleted: number;
    totalEvents: number;
    pomodoroSessions: number;
    focusTime: number;
}

export interface UserPreferences {
    theme: 'light' | 'dark' | 'system';
    pomodoroSettings: PomodoroSettings;
    defaultView: CalendarView;
    weekStartsOn: 0 | 1; // 0 = Sunday, 1 = Monday
}

// API Response types
export interface ApiResponse<T> {
    data: T;
    message?: string;
}

export interface ApiError {
    message: string;
    code?: string;
}

// Schedule Import Types
export interface ScheduleImportItem {
    title: string;
    description?: string;
    startDate: string;
    endDate: string;
    category?: EventCategory;
    priority?: Priority;
    isRecurring?: boolean;
    subtasks?: { title: string; completed?: boolean }[];
    timingMode?: TimingMode;
    dailyStartTime?: string;
    dailyEndTime?: string;
}

export interface ImportErrorDetail {
    index: number;
    title?: string;
    error: string;
}

export interface ImportResult {
    imported: Event[];
    errors: ImportErrorDetail[];
    totalReceived: number;
    totalImported: number;
    totalErrors: number;
}
