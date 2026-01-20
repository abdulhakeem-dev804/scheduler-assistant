'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Event, SessionStatus } from '@/types';
import { apiClient } from '@/lib/api';

interface PendingSession {
    event: Event;
    sessionDate: string;
}

interface UseSessionNotificationsResult {
    pendingPopups: PendingSession[];
    dismissPopup: (eventId: string, sessionDate: string) => void;
    markSession: (eventId: string, sessionDate: string, status: SessionStatus) => Promise<void>;
    refreshPendingSessions: () => void;
}

/**
 * Hook to detect ended sessions and manage popup notifications
 * Checks each daily-session event to see if any sessions need user action
 */
export function useSessionNotifications(events: Event[]): UseSessionNotificationsResult {
    const [pendingPopups, setPendingPopups] = useState<PendingSession[]>([]);
    const [dismissedSessions, setDismissedSessions] = useState<Set<string>>(new Set());
    const checkIntervalRef = useRef<NodeJS.Timeout | null>(null);

    // Get key for dismissed sessions tracking
    const getSessionKey = (eventId: string, sessionDate: string) => `${eventId}:${sessionDate}`;

    // Filter to only daily-session events that are active
    const dailySessionEvents = events.filter(event =>
        event.dailyStartTime &&
        event.dailyEndTime &&
        !event.isCompleted
    );

    // Check for pending sessions that need user action
    const checkPendingSessions = useCallback(async () => {
        const now = new Date();
        const pendingSessions: PendingSession[] = [];

        for (const event of dailySessionEvents) {
            if (!event.dailyEndTime) continue;

            try {
                // Get pending (unmarked) sessions from API
                const pendingDates = await apiClient.getPendingSessions(event.id);

                for (const sessionDate of pendingDates) {
                    const sessionKey = getSessionKey(event.id, sessionDate);

                    // Skip if already dismissed in this browser session
                    if (dismissedSessions.has(sessionKey)) continue;

                    // Parse session end time for today's date check
                    const [endHour, endMin] = event.dailyEndTime.split(':').map(Number);
                    const sessionDateObj = new Date(sessionDate);
                    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                    const sessionDay = new Date(sessionDateObj.getFullYear(), sessionDateObj.getMonth(), sessionDateObj.getDate());

                    // For today's session, only show popup if session has ended
                    if (sessionDay.getTime() === today.getTime()) {
                        const sessionEndToday = new Date(today);
                        sessionEndToday.setHours(endHour, endMin, 0, 0);

                        if (now < sessionEndToday) {
                            // Session hasn't ended yet today, skip
                            continue;
                        }
                    }

                    pendingSessions.push({
                        event,
                        sessionDate,
                    });
                }
            } catch (error) {
                console.error(`Error checking pending sessions for event ${event.id}:`, error);
            }
        }

        // Sort by date (most recent first)
        pendingSessions.sort((a, b) =>
            new Date(b.sessionDate).getTime() - new Date(a.sessionDate).getTime()
        );

        // Only show one popup at a time (the most recent)
        setPendingPopups(pendingSessions.slice(0, 1));
    }, [dailySessionEvents, dismissedSessions]);

    // Dismiss a popup temporarily (for this browser session)
    const dismissPopup = useCallback((eventId: string, sessionDate: string) => {
        const sessionKey = getSessionKey(eventId, sessionDate);
        setDismissedSessions(prev => new Set([...prev, sessionKey]));
        setPendingPopups(prev =>
            prev.filter(p => !(p.event.id === eventId && p.sessionDate === sessionDate))
        );
    }, []);

    // Mark a session with a status
    const markSession = useCallback(async (
        eventId: string,
        sessionDate: string,
        status: SessionStatus
    ) => {
        try {
            await apiClient.markSessionAttendance(
                eventId,
                sessionDate,
                status as 'attended' | 'missed' | 'skipped'
            );

            // Remove from pending popups
            setPendingPopups(prev =>
                prev.filter(p => !(p.event.id === eventId && p.sessionDate === sessionDate))
            );

            // Also add to dismissed to prevent re-showing
            const sessionKey = getSessionKey(eventId, sessionDate);
            setDismissedSessions(prev => new Set([...prev, sessionKey]));
        } catch (error) {
            console.error('Error marking session:', error);
            throw error;
        }
    }, []);

    // Manual refresh
    const refreshPendingSessions = useCallback(() => {
        checkPendingSessions();
    }, [checkPendingSessions]);

    // Check on mount and periodically
    useEffect(() => {
        // Initial check after a short delay to let data load
        const initialCheck = setTimeout(() => {
            checkPendingSessions();
        }, 2000);

        // Check every minute
        checkIntervalRef.current = setInterval(() => {
            checkPendingSessions();
        }, 60000);

        return () => {
            clearTimeout(initialCheck);
            if (checkIntervalRef.current) {
                clearInterval(checkIntervalRef.current);
            }
        };
    }, [checkPendingSessions]);

    // Also check when events change
    useEffect(() => {
        if (dailySessionEvents.length > 0) {
            checkPendingSessions();
        }
    }, [dailySessionEvents.length, checkPendingSessions]);

    return {
        pendingPopups,
        dismissPopup,
        markSession,
        refreshPendingSessions,
    };
}
