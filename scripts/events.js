/**
 * Events Module - Scheduler Assistant
 * Handles event CRUD operations
 */

import { storage } from './storage.js';
import { generateId, isSameDay, addDays, addMonths } from './utils.js';

/**
 * Create a new event
 */
export function createEvent(eventData) {
    const now = new Date().toISOString();

    const event = {
        id: generateId(),
        title: eventData.title || 'Untitled Event',
        description: eventData.description || '',
        startDate: eventData.startDate,
        endDate: eventData.endDate || eventData.startDate,
        allDay: eventData.allDay || false,
        priority: eventData.priority || 'medium',
        category: eventData.category || 'work',
        color: eventData.color || null,
        isCompleted: false,
        isRecurring: eventData.isRecurring || false,
        recurrence: eventData.recurrence || null,
        reminders: eventData.reminders || [],
        createdAt: now,
        updatedAt: now
    };

    storage.addEvent(event);
    return event;
}

/**
 * Update an existing event
 */
export function updateEvent(id, updates) {
    const success = storage.updateEvent(id, updates);
    if (success) {
        return storage.getEvent(id);
    }
    return null;
}

/**
 * Delete an event
 */
export function deleteEvent(id) {
    return storage.deleteEvent(id);
}

/**
 * Get event by ID
 */
export function getEvent(id) {
    return storage.getEvent(id);
}

/**
 * Get all events
 */
export function getAllEvents() {
    return storage.getEvents();
}

/**
 * Get events for a specific date
 */
export function getEventsForDate(date) {
    return storage.getEventsForDate(date);
}

/**
 * Get events for date range
 */
export function getEventsInRange(startDate, endDate) {
    return storage.getEventsInRange(startDate, endDate);
}

/**
 * Toggle event completion
 */
export function toggleEventCompletion(id) {
    const event = storage.getEvent(id);
    if (event) {
        const isCompleted = !event.isCompleted;
        storage.updateEvent(id, { isCompleted });

        if (isCompleted) {
            storage.incrementTaskCompleted();
        }

        return storage.getEvent(id);
    }
    return null;
}

/**
 * Search events
 */
export function searchEvents(query) {
    const events = storage.getEvents();
    const searchTerm = query.toLowerCase();

    return events.filter(event =>
        event.title.toLowerCase().includes(searchTerm) ||
        event.description.toLowerCase().includes(searchTerm)
    );
}

/**
 * Filter events by category
 */
export function filterByCategory(category) {
    const events = storage.getEvents();
    return events.filter(event => event.category === category);
}

/**
 * Filter events by priority
 */
export function filterByPriority(priority) {
    const events = storage.getEvents();
    return events.filter(event => event.priority === priority);
}

/**
 * Get upcoming events
 */
export function getUpcomingEvents(limit = 5) {
    const events = storage.getEvents();
    const now = new Date();

    return events
        .filter(event => new Date(event.startDate) >= now && !event.isCompleted)
        .sort((a, b) => new Date(a.startDate) - new Date(b.startDate))
        .slice(0, limit);
}

/**
 * Get overdue events
 */
export function getOverdueEvents() {
    const events = storage.getEvents();
    const now = new Date();

    return events.filter(event =>
        new Date(event.endDate) < now && !event.isCompleted
    );
}

/**
 * Get today's events
 */
export function getTodayEvents() {
    const today = new Date();
    return getEventsForDate(today);
}

/**
 * Get completed events
 */
export function getCompletedEvents() {
    const events = storage.getEvents();
    return events.filter(event => event.isCompleted);
}

/**
 * Generate recurring event instances
 */
export function generateRecurringInstances(event, startDate, endDate) {
    if (!event.isRecurring || !event.recurrence) {
        return [event];
    }

    const instances = [];
    let currentDate = new Date(event.startDate);
    const rangeEnd = new Date(endDate);
    const recurrenceEnd = event.recurrence.endDate
        ? new Date(event.recurrence.endDate)
        : null;

    while (currentDate <= rangeEnd) {
        if (recurrenceEnd && currentDate > recurrenceEnd) break;

        if (currentDate >= new Date(startDate)) {
            const duration = new Date(event.endDate) - new Date(event.startDate);
            instances.push({
                ...event,
                id: `${event.id}-${currentDate.getTime()}`,
                parentId: event.id,
                startDate: new Date(currentDate).toISOString(),
                endDate: new Date(currentDate.getTime() + duration).toISOString(),
                isInstance: true
            });
        }

        // Move to next occurrence
        switch (event.recurrence.frequency) {
            case 'daily':
                currentDate = addDays(currentDate, event.recurrence.interval || 1);
                break;
            case 'weekly':
                currentDate = addDays(currentDate, 7 * (event.recurrence.interval || 1));
                break;
            case 'monthly':
                currentDate = addMonths(currentDate, event.recurrence.interval || 1);
                break;
            case 'yearly':
                currentDate = addMonths(currentDate, 12 * (event.recurrence.interval || 1));
                break;
            default:
                return instances;
        }
    }

    return instances;
}

/**
 * Get events with recurring instances
 */
export function getEventsWithRecurring(startDate, endDate) {
    const events = storage.getEventsInRange(startDate, endDate);
    let allEvents = [];

    events.forEach(event => {
        if (event.isRecurring) {
            allEvents = allEvents.concat(generateRecurringInstances(event, startDate, endDate));
        } else {
            allEvents.push(event);
        }
    });

    return allEvents.sort((a, b) => new Date(a.startDate) - new Date(b.startDate));
}

/**
 * Duplicate an event
 */
export function duplicateEvent(id) {
    const original = storage.getEvent(id);
    if (!original) return null;

    const duplicate = { ...original };
    delete duplicate.id;
    delete duplicate.createdAt;
    delete duplicate.updatedAt;
    duplicate.title = `${original.title} (Copy)`;

    return createEvent(duplicate);
}

/**
 * Move event to different date
 */
export function moveEvent(id, newStartDate) {
    const event = storage.getEvent(id);
    if (!event) return null;

    const duration = new Date(event.endDate) - new Date(event.startDate);
    const newEndDate = new Date(new Date(newStartDate).getTime() + duration);

    return updateEvent(id, {
        startDate: new Date(newStartDate).toISOString(),
        endDate: newEndDate.toISOString()
    });
}

/**
 * Get event statistics
 */
export function getEventStats() {
    const events = storage.getEvents();
    const today = new Date();

    const stats = {
        total: events.length,
        completed: events.filter(e => e.isCompleted).length,
        pending: events.filter(e => !e.isCompleted).length,
        today: getEventsForDate(today).length,
        overdue: getOverdueEvents().length,
        byCategory: {},
        byPriority: { high: 0, medium: 0, low: 0 }
    };

    events.forEach(event => {
        stats.byCategory[event.category] = (stats.byCategory[event.category] || 0) + 1;
        if (stats.byPriority.hasOwnProperty(event.priority)) {
            stats.byPriority[event.priority]++;
        }
    });

    return stats;
}
