/**
 * API Client for Backend Communication
 */

// Dynamically determine the API URL based on how the frontend is accessed
import { CreateEventInput, ScheduleImportItem } from '@/types';
function getApiBaseUrl(): string {
    // Prioritize environment variable if set (works for both client and server)
    if (process.env.NEXT_PUBLIC_API_URL) {
        return process.env.NEXT_PUBLIC_API_URL;
    }

    if (typeof window === 'undefined') {
        // Server-side rendering fallback
        return 'http://localhost:8000';
    }

    const { hostname } = window.location;

    // If accessed via localhost, use localhost:8000
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
        return 'http://localhost:8000';
    }

    // If accessed via local network IP, use same IP with port 8000
    if (hostname.match(/^192\.168\.|^10\.|^172\.(1[6-9]|2[0-9]|3[01])\./)) {
        return `http://${hostname}:8000`;
    }

    // If accessed via localtunnel or other remote URL (e.g. Vercel)
    return 'https://scheduler-api.abdulhakeem.dev';
}

const API_BASE_URL = getApiBaseUrl();

interface RequestOptions {
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
    body?: unknown;
    headers?: Record<string, string>;
}

class ApiClient {
    private baseUrl: string;

    constructor(baseUrl: string) {
        this.baseUrl = baseUrl;
    }

    private async request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
        const { method = 'GET', body, headers = {} } = options;

        const config: RequestInit = {
            method,
            headers: {
                'Content-Type': 'application/json',
                ...headers,
            },
        };

        if (body) {
            config.body = JSON.stringify(body);
        }

        const response = await fetch(`${this.baseUrl}${endpoint}`, config);

        if (!response.ok) {
            const error = await response.json().catch(() => ({ message: 'Request failed' }));
            throw new Error(error.detail || error.message || 'Request failed');
        }

        // Handle 204 No Content
        if (response.status === 204) {
            return null as T;
        }

        return response.json();
    }

    // Events API
    async getEvents(params?: {
        start_date?: string;
        end_date?: string;
        category?: string;
        completed?: boolean;
    }) {
        const searchParams = new URLSearchParams();
        if (params?.start_date) searchParams.set('start_date', params.start_date);
        if (params?.end_date) searchParams.set('end_date', params.end_date);
        if (params?.category) searchParams.set('category', params.category);
        if (params?.completed !== undefined) searchParams.set('completed', String(params.completed));

        const query = searchParams.toString();
        return this.request<ApiEvent[]>(`/api/events/${query ? `?${query}` : ''}`);
    }

    async getEvent(id: string) {
        return this.request<ApiEvent>(`/api/events/${id}`);
    }

    async createEvent(data: CreateEventInput) {
        return this.request<ApiEvent>('/api/events/', {
            method: 'POST',
            body: {
                title: data.title,
                description: data.description,
                start_date: data.startDate,
                end_date: data.endDate,
                category: data.category,
                priority: data.priority,
                is_recurring: data.isRecurring,
                timing_mode: data.timingMode || 'specific',
                subtasks: data.subtasks || [],
                daily_start_time: data.dailyStartTime,
                daily_end_time: data.dailyEndTime,
            },
        });
    }

    async updateEvent(id: string, data: Partial<CreateEventInput> & { isCompleted?: boolean; resolution?: string }) {
        const body: Record<string, unknown> = {};
        if (data.title !== undefined) body.title = data.title;
        if (data.description !== undefined) body.description = data.description;
        if (data.startDate !== undefined) body.start_date = data.startDate;
        if (data.endDate !== undefined) body.end_date = data.endDate;
        if (data.category !== undefined) body.category = data.category;
        if (data.priority !== undefined) body.priority = data.priority;
        if (data.isRecurring !== undefined) body.is_recurring = data.isRecurring;
        if (data.isCompleted !== undefined) body.is_completed = data.isCompleted;
        if (data.timingMode !== undefined) body.timing_mode = data.timingMode;
        if (data.subtasks !== undefined) body.subtasks = data.subtasks;
        if (data.resolution !== undefined) body.resolution = data.resolution;
        if (data.dailyStartTime !== undefined) body.daily_start_time = data.dailyStartTime;
        if (data.dailyEndTime !== undefined) body.daily_end_time = data.dailyEndTime;

        return this.request<ApiEvent>(`/api/events/${id}`, {
            method: 'PUT',
            body,
        });
    }

    async deleteEvent(id: string) {
        return this.request<void>(`/api/events/${id}`, { method: 'DELETE' });
    }

    async toggleEventCompletion(id: string) {
        return this.request<ApiEvent>(`/api/events/${id}/toggle-complete`, { method: 'PATCH' });
    }

    // Session Attendance API
    async getEventSessions(eventId: string) {
        return this.request<ApiSessionAttendance[]>(`/api/events/${eventId}/sessions`);
    }

    async getSessionStats(eventId: string) {
        return this.request<ApiSessionStats>(`/api/events/${eventId}/sessions/stats`);
    }

    async getPendingSessions(eventId: string) {
        return this.request<string[]>(`/api/events/${eventId}/sessions/pending`);
    }

    async markSessionAttendance(eventId: string, sessionDate: string, status: 'attended' | 'missed' | 'skipped', notes?: string) {
        return this.request<ApiSessionAttendance>(`/api/events/${eventId}/sessions`, {
            method: 'POST',
            body: {
                session_date: sessionDate,
                status,
                notes,
            },
        });
    }

    async updateSessionAttendance(eventId: string, sessionDate: string, status: 'attended' | 'missed' | 'skipped', notes?: string) {
        return this.request<ApiSessionAttendance>(`/api/events/${eventId}/sessions/${sessionDate}`, {
            method: 'PATCH',
            body: {
                status,
                notes,
            },
        });
    }

    // Schedule Import API
    async importSchedule(data: { schedule: ScheduleImportItem[] }) {
        return this.request<ApiImportResponse>('/api/import/schedule', {
            method: 'POST',
            body: data,
        });
    }

    async bulkDeleteEvents(category?: string) {
        const query = category ? `?category=${category}` : '';
        return this.request<{ deleted: number }>(`/api/events/bulk${query}`, {
            method: 'DELETE',
        });
    }

    // Health check
    async healthCheck() {
        return this.request<{ status: string }>('/health');
    }
}

// Types matching backend schema
// Types matching backend schema
interface ApiEvent {
    id: string;
    title: string;
    description?: string;
    start_date: string;
    end_date: string;
    category: string;
    priority: string;
    is_recurring: boolean;
    is_completed: boolean;
    // New fields
    subtasks?: Array<{ id: string; title: string; completed: boolean }>;
    timing_mode?: 'specific' | 'anytime' | 'deadline';
    resolution?: 'pending' | 'completed' | 'missed' | 'rescheduled';
    reschedule_count?: number;
    original_start_date?: string;
    daily_start_time?: string;
    daily_end_time?: string;
    created_at: string;
    updated_at: string;
}

interface ApiSessionAttendance {
    id: string;
    event_id: string;
    session_date: string;
    status: 'pending' | 'attended' | 'missed' | 'skipped';
    notes?: string;
    created_at?: string;
}

interface ApiSessionStats {
    total_sessions: number;
    attended: number;
    missed: number;
    skipped: number;
    pending: number;
    attendance_rate: number;
    current_streak: number;
}

interface ApiImportResponse {
    imported: ApiEvent[];
    errors: Array<{ index: number; title?: string; error: string }>;
    total_received: number;
    total_imported: number;
    total_errors: number;
}

export const apiClient = new ApiClient(API_BASE_URL);
export type { ApiEvent, ApiSessionAttendance, ApiSessionStats, ApiImportResponse };


