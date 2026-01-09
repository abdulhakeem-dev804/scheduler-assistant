'use client';

import { useMemo } from 'react';
import { format, isSameDay, getHours, getMinutes } from 'date-fns';
import { cn, getWeekDays, isToday, categoryColors, parseLocalDate } from '@/lib/utils';
import { Event } from '@/types';
import { ScrollArea } from '@/components/ui/scroll-area';

interface WeekViewProps {
    currentDate: Date;
    events: Event[];
    onDateClick: (date: Date) => void;
    onEventClick: (event: Event) => void;
}

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const HOUR_HEIGHT = 60; // pixels per hour

export function WeekView({ currentDate, events, onDateClick, onEventClick }: WeekViewProps) {
    const days = useMemo(() => getWeekDays(currentDate), [currentDate]);

    const getEventsForDay = (date: Date): Event[] => {
        return events.filter((event) => {
            const eventStart = parseLocalDate(event.startDate);
            const eventEnd = parseLocalDate(event.endDate);

            // Normalize to day boundaries for comparison
            const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
            const dayEnd = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59);
            const eventStartDay = new Date(eventStart.getFullYear(), eventStart.getMonth(), eventStart.getDate());
            const eventEndDay = new Date(eventEnd.getFullYear(), eventEnd.getMonth(), eventEnd.getDate());

            // Event should appear on this day if: eventStart <= dayEnd AND eventEnd >= dayStart
            return eventStartDay.getTime() <= dayEnd.getTime() && eventEndDay.getTime() >= dayStart.getTime();
        });
    };

    const getEventPosition = (event: Event, dayDate: Date) => {
        const startDate = parseLocalDate(event.startDate);
        const endDate = parseLocalDate(event.endDate);

        // Check if this is a multi-day event
        const eventStartDay = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
        const eventEndDay = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
        const currentDay = new Date(dayDate.getFullYear(), dayDate.getMonth(), dayDate.getDate());

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

        const duration = Math.max(endHour - startHour, 0.5); // Minimum 30 min display

        return {
            top: startHour * HOUR_HEIGHT,
            height: duration * HOUR_HEIGHT,
        };
    };

    return (
        <div className="flex flex-col h-full">
            {/* Week day headers */}
            <div className="grid grid-cols-8 border-b border-border/50 sticky top-0 bg-background z-10">
                <div className="p-2 text-center text-xs text-muted-foreground w-16" />
                {days.map((day) => (
                    <div
                        key={day.toISOString()}
                        className={cn(
                            "p-2 text-center cursor-pointer hover:bg-muted/30 transition-colors",
                            isToday(day) && "bg-primary/5"
                        )}
                        onClick={() => onDateClick(day)}
                    >
                        <div className="text-xs text-muted-foreground uppercase">
                            {format(day, 'EEE')}
                        </div>
                        <div className={cn(
                            "text-lg font-semibold mt-1 w-8 h-8 flex items-center justify-center rounded-full mx-auto",
                            isToday(day) && "bg-primary text-primary-foreground"
                        )}>
                            {format(day, 'd')}
                        </div>
                    </div>
                ))}
            </div>

            {/* Time grid */}
            <ScrollArea className="flex-1">
                <div className="grid grid-cols-8 min-h-[1440px]">
                    {/* Time column */}
                    <div className="w-16 border-r border-border/30">
                        {HOURS.map((hour) => (
                            <div
                                key={hour}
                                className="h-[60px] text-xs text-muted-foreground pr-2 text-right relative"
                            >
                                <span className="absolute -top-2 right-2">
                                    {format(new Date().setHours(hour, 0), 'h a')}
                                </span>
                            </div>
                        ))}
                    </div>

                    {/* Day columns */}
                    {days.map((day) => {
                        const dayEvents = getEventsForDay(day);
                        return (
                            <div
                                key={day.toISOString()}
                                className="relative border-r border-border/30"
                                onClick={() => onDateClick(day)}
                            >
                                {/* Hour lines */}
                                {HOURS.map((hour) => (
                                    <div
                                        key={hour}
                                        className="h-[60px] border-b border-border/20 hover:bg-muted/20 transition-colors cursor-pointer"
                                    />
                                ))}

                                {/* Events */}
                                {dayEvents.map((event) => {
                                    const { top, height } = getEventPosition(event, day);
                                    const colors = categoryColors[event.category] || categoryColors.work;
                                    return (
                                        <div
                                            key={event.id}
                                            className={cn(
                                                "absolute left-1 right-1 rounded-md p-1 overflow-hidden cursor-pointer transition-transform hover:scale-[1.02] hover:z-10",
                                                colors.bg,
                                                colors.text,
                                                `border-l-2 ${colors.border}`,
                                                event.isCompleted && "opacity-60"
                                            )}
                                            style={{ top: `${top}px`, height: `${Math.max(height, 24)}px` }}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onEventClick(event);
                                            }}
                                        >
                                            <div className="text-xs font-medium truncate">{event.title}</div>
                                            <div className="text-[10px] opacity-75">
                                                {format(parseLocalDate(event.startDate), 'h:mm a')}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        );
                    })}
                </div>
            </ScrollArea>
        </div>
    );
}
