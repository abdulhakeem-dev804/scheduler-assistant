'use client';

import { io, Socket } from 'socket.io-client';
import { useEffect, useRef, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { eventKeys } from '@/hooks/useEvents';

// Dynamically determine the WebSocket URL based on how the frontend is accessed
function getWsUrl(): string {
    // Prioritize environment variable if set
    if (process.env.NEXT_PUBLIC_WS_URL) {
        return process.env.NEXT_PUBLIC_WS_URL;
    }

    if (typeof window === 'undefined') {
        return 'http://localhost:8000';
    }

    const { hostname } = window.location;

    if (hostname === 'localhost' || hostname === '127.0.0.1') {
        return 'http://localhost:8000';
    }

    if (hostname.match(/^192\.168\.|^10\.|^172\.(1[6-9]|2[0-9]|3[01])\./)) {
        return `http://${hostname}:8000`;
    }

    return 'https://scheduler-api.loca.lt';
}

const WS_URL = getWsUrl();

interface EventUpdate {
    action: 'created' | 'updated' | 'deleted';
    data: unknown;
}

export function useSocketSync() {
    const socketRef = useRef<Socket | null>(null);
    const queryClient = useQueryClient();

    useEffect(() => {
        // Connect to Socket.io server
        socketRef.current = io(WS_URL, {
            transports: ['websocket', 'polling'],
            reconnection: true,
            reconnectionAttempts: 5,
            reconnectionDelay: 1000,
        });

        const socket = socketRef.current;

        socket.on('connect', () => {
            console.log('🔌 Connected to real-time server');
        });

        socket.on('disconnect', () => {
            console.log('🔌 Disconnected from real-time server');
        });

        // Listen for event updates from other clients
        socket.on('event_update', (update: EventUpdate) => {
            console.log('📥 Received event update:', update);
            // Invalidate events query to refetch
            queryClient.invalidateQueries({ queryKey: eventKeys.all });
        });

        socket.on('connect_error', (error) => {
            console.warn('Socket connection error:', error.message);
        });

        return () => {
            socket.disconnect();
        };
    }, [queryClient]);

    // Emit event created
    const emitEventCreated = useCallback((data: unknown) => {
        socketRef.current?.emit('event_created', data);
    }, []);

    // Emit event updated
    const emitEventUpdated = useCallback((data: unknown) => {
        socketRef.current?.emit('event_updated', data);
    }, []);

    // Emit event deleted
    const emitEventDeleted = useCallback((data: unknown) => {
        socketRef.current?.emit('event_deleted', data);
    }, []);

    return {
        emitEventCreated,
        emitEventUpdated,
        emitEventDeleted,
    };
}
