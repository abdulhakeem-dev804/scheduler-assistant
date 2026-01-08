import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { EventCountdown } from '@/components/events/EventCountdown';
import { addHours, subHours, addMinutes } from 'date-fns';

describe('EventCountdown', () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('renders "Starts in" for future events', () => {
        const now = new Date('2026-01-08T10:00:00Z');
        vi.setSystemTime(now);

        const startDate = addHours(now, 2).toISOString(); // Starts in 2 hours
        const endDate = addHours(now, 3).toISOString();

        render(<EventCountdown startDate={startDate} endDate={endDate} variant="badge" />);

        expect(screen.getByText('Starts in')).toBeInTheDocument();
        expect(screen.getByText('2h')).toBeInTheDocument();
    });

    it('renders "Ended" for past events', () => {
        const now = new Date('2026-01-08T10:00:00Z');
        vi.setSystemTime(now);

        const startDate = subHours(now, 3).toISOString();
        const endDate = subHours(now, 2).toISOString(); // Ended 2 hours ago

        render(<EventCountdown startDate={startDate} endDate={endDate} variant="badge" />);

        expect(screen.getByText('Ended')).toBeInTheDocument();
        // Badge variant only shows "Ended" label for completed events
        expect(screen.queryByText('ago')).not.toBeInTheDocument();
    });

    it('renders "In progress" with dual countdown for ongoing events (badge variant)', () => {
        const now = new Date('2026-01-08T10:00:00Z');
        vi.setSystemTime(now);

        // Event started 1 hour ago, ends in 1 hour
        const startDate = subHours(now, 1).toISOString();
        const endDate = addHours(now, 1).toISOString();

        render(<EventCountdown startDate={startDate} endDate={endDate} variant="badge" />);

        expect(screen.getByText('In progress')).toBeInTheDocument();

        // Elapsed time (1h) and Remaining time (1h)
        const hours = screen.getAllByText('1h');
        expect(hours).toHaveLength(2);

        const minutes = screen.getAllByText('0m');
        expect(minutes).toHaveLength(2);

        // Remaining time label "left"
        expect(screen.getByText('left')).toBeInTheDocument();
    });

    it('renders full variant with "Time Remaining" and "Time Elapsed" labels', () => {
        const now = new Date('2026-01-08T10:00:00Z');
        vi.setSystemTime(now);

        const startDate = subHours(now, 1).toISOString();
        const endDate = addHours(now, 1).toISOString();

        render(<EventCountdown startDate={startDate} endDate={endDate} variant="full" />);

        expect(screen.getByText('Time Remaining')).toBeInTheDocument();
        expect(screen.getByText('Time Elapsed')).toBeInTheDocument();
        expect(screen.getByText('In progress')).toBeInTheDocument();
    });
});
