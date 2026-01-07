'use client';

import { useMemo } from 'react';
import { format, isSameDay, parseISO, getHours, getMinutes } from 'date-fns';
import { cn, isToday, categoryColors } from '@/lib/utils';
import { Event } from '@/types';
import { ScrollArea } from '@/components/ui/scroll-area';

interface DayViewProps {
    currentDate: Date;
    events: Event[];
    onTimeClick: (date: Date, hour: number) => void;
    onEventClick: (event: Event) => void;
}

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const HOUR_HEIGHT = 80; // pixels per hour

export function DayView({ currentDate, events, onTimeClick, onEventClick }: DayViewProps) {
    const dayEvents = useMemo(() => {
        return events.filter((event) => {
            const eventDate = parseISO(event.startDate);
            return isSameDay(eventDate, currentDate);
        });
    }, [events, currentDate]);

    const getEventPosition = (event: Event) => {
        const startDate = parseISO(event.startDate);
        const endDate = parseISO(event.endDate);
        const startHour = getHours(startDate) + getMinutes(startDate) / 60;
        const endHour = getHours(endDate) + getMinutes(endDate) / 60;
        const duration = Math.max(endHour - startHour, 0.5);

        return {
            top: startHour * HOUR_HEIGHT,
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
                            <div
                                key={hour}
                                className="h-[80px] text-xs text-muted-foreground pr-3 text-right flex items-start justify-end pt-0"
                            >
                                {format(new Date().setHours(hour, 0), 'h a')}
                            </div>
                        ))}
                    </div>

                    {/* Event area */}
                    <div className="relative">
                        {/* Hour slots */}
                        {HOURS.map((hour) => (
                            <div
                                key={hour}
                                className="h-[80px] border-b border-border/20 hover:bg-muted/20 transition-colors cursor-pointer group"
                                onClick={() => onTimeClick(currentDate, hour)}
                            >
                                <div className="h-1/2 border-b border-border/10" />
                                <div className="opacity-0 group-hover:opacity-100 transition-opacity text-xs text-muted-foreground p-2">
                                    + Add event
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
                                        {format(parseISO(event.startDate), 'h:mm a')} - {format(parseISO(event.endDate), 'h:mm a')}
                                    </div>
                                    {event.description && height > 80 && (
                                        <div className="text-sm opacity-60 mt-2 line-clamp-2">
                                            {event.description}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </ScrollArea>
        </div>
    );
}
