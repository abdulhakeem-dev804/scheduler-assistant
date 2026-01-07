'use client';

import { MonthView } from './MonthView';
import { WeekView } from './WeekView';
import { DayView } from './DayView';
import { AgendaView } from './AgendaView';
import { CalendarView, Event } from '@/types';

interface CalendarContainerProps {
    view: CalendarView;
    currentDate: Date;
    events: Event[];
    onDateClick: (date: Date) => void;
    onEventClick: (event: Event) => void;
    onToggleComplete: (event: Event) => void;
}

export function CalendarContainer({
    view,
    currentDate,
    events,
    onDateClick,
    onEventClick,
    onToggleComplete,
}: CalendarContainerProps) {
    const handleTimeClick = (date: Date, hour: number) => {
        const newDate = new Date(date);
        newDate.setHours(hour, 0, 0, 0);
        onDateClick(newDate);
    };

    switch (view) {
        case 'month':
            return (
                <MonthView
                    currentDate={currentDate}
                    events={events}
                    onDateClick={onDateClick}
                    onEventClick={onEventClick}
                />
            );
        case 'week':
            return (
                <WeekView
                    currentDate={currentDate}
                    events={events}
                    onDateClick={onDateClick}
                    onEventClick={onEventClick}
                />
            );
        case 'day':
            return (
                <DayView
                    currentDate={currentDate}
                    events={events}
                    onTimeClick={handleTimeClick}
                    onEventClick={onEventClick}
                />
            );
        case 'agenda':
            return (
                <AgendaView
                    events={events}
                    onEventClick={onEventClick}
                    onToggleComplete={onToggleComplete}
                />
            );
        default:
            return null;
    }
}
