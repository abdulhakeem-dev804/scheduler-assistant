'use client';

import { useMemo } from 'react';
import { format, parseISO, isToday as isTodayFn, isTomorrow, isBefore } from 'date-fns';
import { cn, categoryColors, priorityColors, parseLocalDate } from '@/lib/utils';
import { Event } from '@/types';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Calendar, Clock } from 'lucide-react';
import { EventCountdown } from '@/components/events/EventCountdown';

interface AgendaViewProps {
    events: Event[];
    onEventClick: (event: Event) => void;
    onToggleComplete: (event: Event) => void;
}

interface GroupedEvents {
    label: string;
    date: Date;
    events: Event[];
}

export function AgendaView({ events, onEventClick, onToggleComplete }: AgendaViewProps) {
    const groupedEvents = useMemo(() => {
        const now = new Date();
        const upcoming = events
            .filter((e) => !isBefore(parseLocalDate(e.endDate), now))
            .sort((a, b) => {
                // Priority sorting: High > Medium > Low
                const priorityWeight = { high: 3, medium: 2, low: 1 };
                const weightA = priorityWeight[a.priority] || 0;
                const weightB = priorityWeight[b.priority] || 0;

                if (weightA !== weightB) {
                    return weightB - weightA; // Descending order of priority
                }

                // Secondary sort: Start time (ascending)
                return parseLocalDate(a.startDate).getTime() - parseLocalDate(b.startDate).getTime();
            });

        const groups: GroupedEvents[] = [];
        const dateMap = new Map<string, Event[]>();

        upcoming.forEach((event) => {
            const dateStr = format(parseLocalDate(event.startDate), 'yyyy-MM-dd');
            const existing = dateMap.get(dateStr) || [];
            dateMap.set(dateStr, [...existing, event]);
        });

        dateMap.forEach((dayEvents, dateStr) => {
            const date = parseISO(dateStr);
            let label = format(date, 'EEEE, MMMM d');

            if (isTodayFn(date)) {
                label = 'Today';
            } else if (isTomorrow(date)) {
                label = 'Tomorrow';
            }

            groups.push({ label, date, events: dayEvents });
        });

        return groups;
    }, [events]);

    if (groupedEvents.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-center p-8">
                <Calendar className="h-16 w-16 text-muted-foreground/50 mb-4" />
                <h3 className="text-lg font-medium mb-2">No upcoming events</h3>
                <p className="text-muted-foreground">
                    Create a new event to see it here
                </p>
            </div>
        );
    }

    return (
        <ScrollArea className="h-full">
            <div className="p-4 space-y-6">
                {groupedEvents.map((group) => (
                    <div key={group.label}>
                        {/* Group header */}
                        <div className={cn(
                            "sticky top-0 bg-background/95 backdrop-blur-sm z-10 py-2 mb-3 border-b border-border/50",
                            isTodayFn(group.date) && "text-primary font-semibold"
                        )}>
                            <h3 className="text-sm font-medium">{group.label}</h3>
                        </div>

                        {/* Events */}
                        <div className="space-y-2">
                            {group.events.map((event) => {
                                const colors = categoryColors[event.category] || categoryColors.work;
                                const prioColors = priorityColors[event.priority] || priorityColors.medium;

                                return (
                                    <div
                                        key={event.id}
                                        className={cn(
                                            "flex items-start gap-3 p-3 rounded-lg border border-border/50 bg-card/50 hover:bg-card transition-colors cursor-pointer group",
                                            event.isCompleted && "opacity-60"
                                        )}
                                        onClick={() => onEventClick(event)}
                                    >
                                        {/* Checkbox */}
                                        <div onClick={(e) => e.stopPropagation()}>
                                            <Checkbox
                                                checked={event.isCompleted}
                                                onCheckedChange={() => onToggleComplete(event)}
                                                className="mt-1"
                                            />
                                        </div>

                                        {/* Content */}
                                        <div className="flex-1 min-w-0">
                                            <div className={cn(
                                                "font-medium",
                                                event.isCompleted && "line-through"
                                            )}>
                                                {event.title}
                                            </div>

                                            <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                                                <Clock className="h-3.5 w-3.5" />
                                                <span>
                                                    {format(parseLocalDate(event.startDate), 'h:mm a')} - {format(parseLocalDate(event.endDate), 'h:mm a')}
                                                </span>
                                            </div>

                                            {event.description && (
                                                <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                                                    {event.description}
                                                </p>
                                            )}

                                            <div className="flex items-center gap-2 mt-2 flex-wrap">
                                                <EventCountdown
                                                    startDate={event.startDate}
                                                    endDate={event.endDate}
                                                    isCompleted={event.isCompleted}
                                                    variant="badge"
                                                    dailyStartTime={event.dailyStartTime}
                                                    dailyEndTime={event.dailyEndTime}
                                                />
                                                <Badge variant="outline" className={cn(colors.bg, colors.text, "border-0")}>
                                                    {event.category}
                                                </Badge>
                                                <Badge variant="outline" className={cn(prioColors.bg, prioColors.text, "border-0")}>
                                                    {event.priority}
                                                </Badge>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </div>
        </ScrollArea>
    );
}
