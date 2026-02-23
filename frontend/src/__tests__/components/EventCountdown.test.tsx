import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { EventCountdown } from '@/components/events/EventCountdown';
import { addHours, subHours, format } from 'date-fns';

describe('EventCountdown', () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('renders "Starts in" for future events', () => {
        const now = new Date('2026-01-08T10:00:00'); // Local time assumption
        vi.setSystemTime(now);

        const startDate = format(addHours(now, 2), "yyyy-MM-dd'T'HH:mm:ss"); // Starts in 2 hours
        const endDate = format(addHours(now, 3), "yyyy-MM-dd'T'HH:mm:ss");

        render(<EventCountdown startDate={startDate} endDate={endDate} variant="badge" />);

        expect(screen.getByText('Starts in')).toBeInTheDocument();
        // Expect digital format HH:MM:SS (use regex for partial match)
        expect(screen.getByText(/02:/)).toBeInTheDocument();
        expect(screen.getByText(/00:/)).toBeInTheDocument();
    });

    it('renders "Ended" for past events', () => {
        const now = new Date('2026-01-08T10:00:00');
        vi.setSystemTime(now);

        const startDate = format(subHours(now, 3), "yyyy-MM-dd'T'HH:mm:ss");
        const endDate = format(subHours(now, 2), "yyyy-MM-dd'T'HH:mm:ss"); // Ended 2 hours ago

        render(<EventCountdown startDate={startDate} endDate={endDate} variant="badge" />);

        expect(screen.getByText('Ended')).toBeInTheDocument();
        expect(screen.queryByText('ago')).not.toBeInTheDocument();
    });

    it('renders "In progress" with dual countdown for ongoing events (badge variant)', () => {
        const now = new Date('2026-01-08T10:00:00');
        vi.setSystemTime(now);

        // Event started 1 hour ago, ends in 1 hour
        const startDate = format(subHours(now, 1), "yyyy-MM-dd'T'HH:mm:ss");
        const endDate = format(addHours(now, 1), "yyyy-MM-dd'T'HH:mm:ss");

        render(<EventCountdown startDate={startDate} endDate={endDate} variant="badge" />);

        // In badge variant standard display, it shows Elapsed time + Label
        // It does NOT show "In progress" text directly if label is rendered?
        // Let's check logic: "In session" label is rendered?
        // Standard event label: "In progress" (from calculateTimeState)
        expect(screen.getByText('In progress')).toBeInTheDocument();

        // Elapsed time is 1h -> 01:00:00
        expect(screen.getAllByText(/01:/)).toHaveLength(1);
        // Logic: {(timeState.status...)} -> shows elapsed.
        // Logic: {timeState.remaining && !isInSession} -> shows remaining.
        // So it shows BOTH Elapsed and Remaining?
        // Remaining is also 1h? Yes (-1 to +1 is 2h total. 1h elapsed, 1h remaining).
        // So we expect TWO "01:"
        // Wait, line 433 in previous snippet showed remaining logic using `days, hours` text?
        // Let's check Step 517 logic for remaining part:
        // {timeState.remaining.hours > 0... <span>{timeState.remaining.hours}h</span>}
        // Ah! Remaining section STILL uses "1h", "2m" format!
        // Only the MAIN section uses Digital format.

        // So Elapsed (Main) -> 01:00:00
        // Remaining (Right side) -> 1h 0m

        expect(screen.getByText('1h')).toBeInTheDocument();  // Remaining
        // Remaining time label "left"
        expect(screen.getByText('left')).toBeInTheDocument();
    });

    it('renders "Today Left" for active daily session (badge variant)', () => {
        // Thursday Jan 08 2026, 10:00 AM
        const now = new Date('2026-01-08T10:00:00');
        vi.setSystemTime(now);

        // Event spans multiple days
        const startDate = format(subHours(now, 24), "yyyy-MM-dd'T'HH:mm:ss"); // Started yesterday
        const endDate = format(addHours(now, 48), "yyyy-MM-dd'T'HH:mm:ss");   // Ends in 2 days

        // Daily window: 09:00 - 17:00
        // Currently 10:00, so we are IN session (1h elapsed, 7h remaining today)
        render(
            <EventCountdown
                startDate={startDate}
                endDate={endDate}
                variant="badge"
                dailyStartTime="09:00"
                dailyEndTime="17:00"
            />
        );

        // Should show "Today Left" logic
        expect(screen.getByText('Today Left:')).toBeInTheDocument();

        // 17:00 - 10:00 = 7 hours remaining -> 07:00:00
        expect(screen.getByText(/07:/)).toBeInTheDocument();
        expect(screen.getByText(/00:/)).toBeInTheDocument();
    });

    it('renders full variant with "Time Remaining" and "Time Elapsed" labels', () => {
        const now = new Date('2026-01-08T10:00:00');
        vi.setSystemTime(now);

        const startDate = format(subHours(now, 1), "yyyy-MM-dd'T'HH:mm:ss");
        const endDate = format(addHours(now, 1), "yyyy-MM-dd'T'HH:mm:ss");

        render(<EventCountdown startDate={startDate} endDate={endDate} variant="full" />);

        expect(screen.getByText('Time Remaining')).toBeInTheDocument();
        expect(screen.getByText('Time Elapsed')).toBeInTheDocument();
        expect(screen.getByText('In progress')).toBeInTheDocument();
    });
});
