'use client';

import { useMemo } from 'react';
import { format, isSameDay, getHours, getMinutes } from 'date-fns';
import { cn, isToday, categoryColors, parseLocalDate } from '@/lib/utils';
import { Event } from '@/types';
import { ScrollArea } from '@/components/ui/scroll-area';
import { EventCountdown } from '@/components/events/EventCountdown';

interface DayViewProps {
    currentDate: Date;
    events: Event[];
    onTimeClick: (date: Date, hour: number) => void;
    onEventClick: (event: Event) => void;
}


const HOURS = [...Array.from({ length: 18 }, (_, i) => i + 6), ...Array.from({ length: 6 }, (_, i) => i)];
const HOUR_HEIGHT = 80; // pixels per hour

// Helper for display hour calculation
const getDisplayHour = (hour: number) => {
    return hour >= 6 ? hour - 6 : hour + 18;
};

export function DayView({ currentDate, events, onTimeClick, onEventClick }: DayViewProps) {
    const dayEvents = useMemo(() => {
        return events.filter((event) => {
            const eventStart = parseLocalDate(event.startDate);
            const eventEnd = parseLocalDate(event.endDate);

            // Normalize to day boundaries for comparison
            const dayStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate());
            const dayEnd = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate(), 23, 59, 59);
            const eventStartDay = new Date(eventStart.getFullYear(), eventStart.getMonth(), eventStart.getDate());
            const eventEndDay = new Date(eventEnd.getFullYear(), eventEnd.getMonth(), eventEnd.getDate());

            // Event should appear on this day if: eventStart <= dayEnd AND eventEnd >= dayStart
            return eventStartDay.getTime() <= dayEnd.getTime() && eventEndDay.getTime() >= dayStart.getTime();
        });
    }, [events, currentDate]);

    const getEventPosition = (event: Event) => {
        const startDate = parseLocalDate(event.startDate);
        const endDate = parseLocalDate(event.endDate);

        // Check if this is a multi-day event
        const eventStartDay = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
        const eventEndDay = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
        const currentDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate());

        const isMultiDay = eventStartDay.getTime() !== eventEndDay.getTime();
        const isStartDay = eventStartDay.getTime() === currentDay.getTime();
        const isEndDay = eventEndDay.getTime() === currentDay.getTime();
        const isMiddleDay = currentDay.getTime() > eventStartDay.getTime() && currentDay.getTime() < eventEndDay.getTime();

        let startHour: number;
        let endHour: number;

        if (isMultiDay) {
            // Check if user has set daily time window
            if (event.dailyStartTime && event.dailyEndTime) {
                // Use the fixed daily time window
                const [dStartH, dStartM] = event.dailyStartTime.split(':').map(Number);
                const [dEndH, dEndM] = event.dailyEndTime.split(':').map(Number);
                startHour = dStartH + dStartM / 60;
                endHour = dEndH + dEndM / 60;
            } else {
                // No daily time set - use full day spans
                if (isStartDay) {
                    startHour = getHours(startDate) + getMinutes(startDate) / 60;
                    endHour = 24;
                } else if (isEndDay) {
                    startHour = 0;
                    endHour = getHours(endDate) + getMinutes(endDate) / 60;
                } else if (isMiddleDay) {
                    startHour = 0;
                    endHour = 24;
                } else {
                    startHour = getHours(startDate) + getMinutes(startDate) / 60;
                    endHour = getHours(endDate) + getMinutes(endDate) / 60;
                }
            }
        } else {
            // Same-day event
            startHour = getHours(startDate) + getMinutes(startDate) / 60;
            endHour = getHours(endDate) + getMinutes(endDate) / 60;
        }

        const displayStart = getDisplayHour(Math.floor(startHour)) + (startHour % 1);
        let displayEnd = getDisplayHour(Math.floor(endHour)) + (endHour % 1);

        // Handle visual wrapping check (e.g. 11 PM to 1 AM is valid linear descent)
        if (displayEnd < displayStart) {
            displayEnd += 24;
        }

        const duration = Math.max(displayEnd - displayStart, 0.5);

        return {
            top: displayStart * HOUR_HEIGHT,
            height: duration * HOUR_HEIGHT,
        };
    };

    return (
        <div className="flex flex-col h-full">
            {/* Day header */}
            <div className={cn(
                "p-4 text-center border-b border-border/50",
                isToday(currentDate) && "bg-primary/5"
            )}>
                <div className="text-sm text-muted-foreground uppercase tracking-wider">
                    {format(currentDate, 'EEEE')}
                </div>
                <div className={cn(
                    "text-3xl font-bold mt-1 w-12 h-12 flex items-center justify-center rounded-full mx-auto",
                    isToday(currentDate) && "bg-primary text-primary-foreground"
                )}>
                    {format(currentDate, 'd')}
                </div>
                <div className="text-sm text-muted-foreground mt-1">
                    {format(currentDate, 'MMMM yyyy')}
                </div>
            </div>

            {/* Time grid */}
            <ScrollArea className="flex-1">
                <div className="relative grid grid-cols-[80px_1fr] min-h-[1920px]">
                    {/* Time column */}
                    <div className="border-r border-border/30">
                        {HOURS.map((hour) => (
                            <div key={hour} className="relative">
                                {/* Midnight Divider Label */}
                                {hour === 0 && (
                                    <div className="absolute top-0 w-full text-center z-10">
                                        <span className="bg-background px-2 py-0.5 text-[10px] text-primary font-bold tracking-wider uppercase border border-primary/30 rounded">
                                            Midnight
                                        </span>
                                    </div>
                                )}
                                <div
                                    className="h-[80px] text-xs text-muted-foreground pr-3 text-right flex items-start justify-end pt-0"
                                >
                                    {/* Only show time label if NOT midnight */}
                                    {hour !== 0 && format(new Date().setHours(hour, 0), 'h a')}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Event area */}
                    <div className="relative">
                        {/* Hour slots */}
                        {HOURS.map((hour) => (
                            <div key={hour} className="relative">
                                {/* Midnight Divider Line */}
                                {hour === 0 && (
                                    <div className="absolute -top-0 w-full border-t-2 border-dashed border-primary/30 z-20 pointer-events-none" />
                                )}
                                <div
                                    className="h-[80px] border-b border-border/20 hover:bg-muted/20 transition-colors cursor-pointer group"
                                    onClick={() => onTimeClick(currentDate, hour)}
                                >
                                    <div className="h-1/2 border-b border-border/10" />
                                    <div className="opacity-0 group-hover:opacity-100 transition-opacity text-xs text-muted-foreground p-2">
                                        + Add event
                                    </div>
                                </div>
                            </div>
                        ))}

                        {/* Events */}
                        {dayEvents.map((event) => {
                            const { top, height } = getEventPosition(event);
                            const colors = categoryColors[event.category] || categoryColors.work;
                            return (
                                <div
                                    key={event.id}
                                    className={cn(
                                        "absolute left-2 right-2 rounded-lg p-3 overflow-hidden cursor-pointer transition-all hover:scale-[1.01] hover:shadow-lg",
                                        colors.bg,
                                        colors.text,
                                        `border-l-4 ${colors.border}`,
                                        event.isCompleted && "opacity-60 line-through"
                                    )}
                                    style={{ top: `${top}px`, height: `${Math.max(height, 40)}px` }}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onEventClick(event);
                                    }}
                                >
                                    <div className="font-medium">{event.title}</div>
                                    <div className="text-sm opacity-75 mt-1">
                                        {format(parseLocalDate(event.startDate), 'h:mm a')} - {format(parseLocalDate(event.endDate), 'h:mm a')}
                                    </div>
                                    {height > 60 && (
                                        <EventCountdown
                                            startDate={event.startDate}
                                            endDate={event.endDate}
                                            isCompleted={event.isCompleted}
                                            variant="compact"
                                            className="mt-1"
                                            dailyStartTime={event.dailyStartTime}
                                            dailyEndTime={event.dailyEndTime}
                                        />
                                    )}
                                    {event.description && height > 80 && (
                                        <div className="text-sm opacity-60 mt-2 line-clamp-2">
                                            {event.description}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div >
            </ScrollArea >
        </div >
    );
}
