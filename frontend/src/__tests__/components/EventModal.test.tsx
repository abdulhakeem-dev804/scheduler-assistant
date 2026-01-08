import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { EventModal } from '@/components/events/EventModal';

// Create a wrapper with React Query provider
const createWrapper = () => {
    const queryClient = new QueryClient({
        defaultOptions: {
            queries: {
                retry: false,
            },
        },
    });

    const Wrapper = ({ children }: { children: React.ReactNode }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
    Wrapper.displayName = 'QueryWrapper';
    return Wrapper;
};

describe('EventModal', () => {
    const mockOnClose = vi.fn();
    const mockOnSave = vi.fn();
    const mockOnDelete = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders with "New Event" title when no event is provided', () => {
        render(
            <EventModal
                isOpen={true}
                onClose={mockOnClose}
                onSave={mockOnSave}
            />,
            { wrapper: createWrapper() }
        );

        expect(screen.getByText('New Event')).toBeInTheDocument();
    });

    it('renders with "Edit Event" title when event is provided', () => {
        const testEvent = {
            id: '1',
            title: 'Test Event',
            description: 'Test description',
            startDate: '2026-01-08T09:00:00.000Z',
            endDate: '2026-01-08T10:00:00.000Z',
            category: 'work' as const,
            priority: 'high' as const,
            isRecurring: false,
            isCompleted: false,
            createdAt: '2026-01-07T00:00:00.000Z',
            updatedAt: '2026-01-07T00:00:00.000Z',
            subtasks: [],
            timingMode: 'specific' as const,
            resolution: 'pending' as const,
            rescheduleCount: 0,
        };

        render(
            <EventModal
                isOpen={true}
                onClose={mockOnClose}
                event={testEvent}
                onSave={mockOnSave}
                onDelete={mockOnDelete}
            />,
            { wrapper: createWrapper() }
        );

        expect(screen.getByText('Edit Event')).toBeInTheDocument();
    });

    it('pre-fills form when editing an event', () => {
        const testEvent = {
            id: '1',
            title: 'Team Meeting',
            description: 'Weekly sync',
            startDate: '2026-01-08T09:00:00.000Z',
            endDate: '2026-01-08T10:00:00.000Z',
            category: 'work' as const,
            priority: 'high' as const,
            isRecurring: false,
            isCompleted: false,
            createdAt: '2026-01-07T00:00:00.000Z',
            updatedAt: '2026-01-07T00:00:00.000Z',
            subtasks: [],
            timingMode: 'specific' as const,
            resolution: 'pending' as const,
            rescheduleCount: 0,
        };

        render(
            <EventModal
                isOpen={true}
                onClose={mockOnClose}
                event={testEvent}
                onSave={mockOnSave}
                onDelete={mockOnDelete}
            />,
            { wrapper: createWrapper() }
        );

        expect(screen.getByDisplayValue('Team Meeting')).toBeInTheDocument();
        expect(screen.getByDisplayValue('Weekly sync')).toBeInTheDocument();
    });

    it('calls onClose when Cancel button is clicked', () => {
        render(
            <EventModal
                isOpen={true}
                onClose={mockOnClose}
                onSave={mockOnSave}
            />,
            { wrapper: createWrapper() }
        );

        fireEvent.click(screen.getByText('Cancel'));
        expect(mockOnClose).toHaveBeenCalled();
    });

    it('pre-fills start date when defaultDate is provided (calendar click)', () => {
        const clickedDate = new Date('2026-01-15T00:00:00');

        render(
            <EventModal
                isOpen={true}
                onClose={mockOnClose}
                onSave={mockOnSave}
                defaultDate={clickedDate}
            />,
            { wrapper: createWrapper() }
        );

        // The date picker should show the clicked date formatted as "Jan 15, 2026"
        expect(screen.getByText('New Event')).toBeInTheDocument();
        // SmartDatePicker displays date as "MMM d, yyyy" format
        // Both start and end date are pre-filled with the clicked date
        const dateElements = screen.getAllByText('Jan 15, 2026');
        expect(dateElements.length).toBeGreaterThanOrEqual(2); // Start and End date
    });

    it('shows delete button only when editing', () => {
        const { rerender } = render(
            <EventModal
                isOpen={true}
                onClose={mockOnClose}
                onSave={mockOnSave}
            />,
            { wrapper: createWrapper() }
        );

        // Should not show delete button for new event
        expect(screen.queryByText('Delete')).not.toBeInTheDocument();

        // Rerender with an event
        const testEvent = {
            id: '1',
            title: 'Test',
            startDate: '2026-01-08T09:00:00.000Z',
            endDate: '2026-01-08T10:00:00.000Z',
            category: 'work' as const,
            priority: 'medium' as const,
            isRecurring: false,
            isCompleted: false,
            createdAt: '2026-01-07T00:00:00.000Z',
            updatedAt: '2026-01-07T00:00:00.000Z',
            subtasks: [],
            timingMode: 'specific' as const,
            resolution: 'pending' as const,
            rescheduleCount: 0,
        };

        rerender(
            <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
                <EventModal
                    isOpen={true}
                    onClose={mockOnClose}
                    event={testEvent}
                    onSave={mockOnSave}
                    onDelete={mockOnDelete}
                />
            </QueryClientProvider>
        );

        expect(screen.getByText('Delete')).toBeInTheDocument();
    });
});
