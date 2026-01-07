'use client';

import { useMemo } from 'react';
import { format, isSameDay, parseISO, startOfMonth } from 'date-fns';
import { cn, getMonthDays, isSameMonth, isToday, categoryColors } from '@/lib/utils';
import { Event } from '@/types';

interface MonthViewProps {
    currentDate: Date;
    events: Event[];
    onDateClick: (date: Date) => void;
    onEventClick: (event: Event) => void;
}

export function MonthView({ currentDate, events, onDateClick, onEventClick }: MonthViewProps) {
    const days = useMemo(() => getMonthDays(currentDate), [currentDate]);
    const monthStart = startOfMonth(currentDate);

    const getEventsForDay = (date: Date): Event[] => {
        return events.filter((event) => {
            const eventDate = parseISO(event.startDate);
            return isSameDay(eventDate, date);
        });
    };

    const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

    return (
        <div className="flex flex-col h-full">
            {/* Week day headers */}
            <div className="grid grid-cols-7 border-b border-border/50">
                {weekDays.map((day) => (
                    <div
                        key={day}
                        className="p-2 text-center text-xs font-medium text-muted-foreground uppercase tracking-wider"
                    >
                        <span className="hidden sm:inline">{day}</span>
                        <span className="sm:hidden">{day.charAt(0)}</span>
                    </div>
                ))}
            </div>

            {/* Calendar grid */}
            <div className="grid grid-cols-7 flex-1 auto-rows-fr">
                {days.map((day, idx) => {
                    const dayEvents = getEventsForDay(day);
                    const isCurrentMonth = isSameMonth(day, monthStart);
                    const isSelected = isToday(day);

                    return (
                        <div
                            key={idx}
                            className={cn(
                                "min-h-[80px] sm:min-h-[120px] p-1 sm:p-2 border-b border-r border-border/30 cursor-pointer transition-colors hover:bg-muted/30",
                                !isCurrentMonth && "bg-muted/10 text-muted-foreground",
                                isSelected && "bg-primary/5"
                            )}
                            onClick={() => onDateClick(day)}
                        >
                            {/* Day number */}
                            <div className={cn(
                                "flex items-center justify-center w-6 h-6 sm:w-7 sm:h-7 text-xs sm:text-sm font-medium rounded-full mb-1",
                                isToday(day) && "bg-primary text-primary-foreground",
                                !isCurrentMonth && "text-muted-foreground"
                            )}>
                                {format(day, 'd')}
                            </div>

                            {/* Events */}
                            <div className="space-y-0.5 overflow-hidden">
                                {dayEvents.slice(0, 3).map((event) => {
                                    const colors = categoryColors[event.category] || categoryColors.work;
                                    return (
                                        <div
                                            key={event.id}
                                            className={cn(
                                                "text-[10px] sm:text-xs px-1.5 py-0.5 rounded truncate cursor-pointer transition-transform hover:scale-[1.02]",
                                                colors.bg,
                                                colors.text,
                                                event.isCompleted && "line-through opacity-60"
                                            )}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onEventClick(event);
                                            }}
                                        >
                                            {event.title}
                                        </div>
                                    );
                                })}
                                {dayEvents.length > 3 && (
                                    <div className="text-[10px] text-muted-foreground px-1">
                                        +{dayEvents.length - 3} more
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
