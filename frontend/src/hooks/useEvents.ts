'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient, ApiEvent } from '@/lib/api';
import { Event, CreateEventInput, UpdateEventInput } from '@/types';

// Transform API response to frontend format
function transformEvent(apiEvent: ApiEvent): Event {
    return {
        id: apiEvent.id,
        title: apiEvent.title,
        description: apiEvent.description || '', // Ensure string if type expects it (though optional in interface)
        startDate: apiEvent.start_date,
        endDate: apiEvent.end_date,
        category: apiEvent.category as Event['category'],
        priority: apiEvent.priority as Event['priority'],
        isRecurring: apiEvent.is_recurring,
        isCompleted: apiEvent.is_completed,
        // Map new fields with defaults
        subtasks: apiEvent.subtasks || [],
        timingMode: apiEvent.timing_mode || 'specific',
        resolution: apiEvent.resolution || 'pending',
        rescheduleCount: apiEvent.reschedule_count || 0,
        originalStartDate: apiEvent.original_start_date,
        createdAt: apiEvent.created_at,
        updatedAt: apiEvent.updated_at,
    };
}

// Query keys
export const eventKeys = {
    all: ['events'] as const,
    byId: (id: string) => ['events', id] as const,
    byDate: (date: string) => ['events', 'date', date] as const,
};

// Get all events from API
export function useEvents() {
    return useQuery({
        queryKey: eventKeys.all,
        queryFn: async () => {
            const events = await apiClient.getEvents();
            return events.map(transformEvent);
        },
        // Refetch every 30 seconds for sync
        refetchInterval: 30000,
        // Refetch when window regains focus
        refetchOnWindowFocus: true,
    });
}

// Get single event by ID
export function useEvent(id: string) {
    return useQuery({
        queryKey: eventKeys.byId(id),
        queryFn: async () => {
            const event = await apiClient.getEvent(id);
            return transformEvent(event);
        },
        enabled: !!id,
    });
}

// Create event mutation
export function useCreateEvent() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (input: CreateEventInput) => {
            const event = await apiClient.createEvent(input);
            return transformEvent(event);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: eventKeys.all });
        },
    });
}

// Update event mutation
export function useUpdateEvent() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ id, updates }: { id: string; updates: UpdateEventInput }) => {
            const event = await apiClient.updateEvent(id, updates);
            return transformEvent(event);
        },
        onSuccess: (event) => {
            queryClient.invalidateQueries({ queryKey: eventKeys.all });
            queryClient.invalidateQueries({ queryKey: eventKeys.byId(event.id) });
        },
    });
}

// Delete event mutation
export function useDeleteEvent() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (id: string) => {
            await apiClient.deleteEvent(id);
            return id;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: eventKeys.all });
        },
    });
}

// Toggle event completion
export function useToggleEventCompletion() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (id: string) => {
            const event = await apiClient.toggleEventCompletion(id);
            return transformEvent(event);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: eventKeys.all });
        },
    });
}

// Search events (client-side for now)
export function useSearchEvents(query: string) {
    const { data: events = [] } = useEvents();

    return useQuery({
        queryKey: ['events', 'search', query],
        queryFn: () => {
            if (!query) return [];
            const lowerQuery = query.toLowerCase();
            return events.filter(
                (e) =>
                    e.title.toLowerCase().includes(lowerQuery) ||
                    e.description?.toLowerCase().includes(lowerQuery) ||
                    e.category.toLowerCase().includes(lowerQuery)
            );
        },
        enabled: query.length > 0 && events.length > 0,
    });
}
