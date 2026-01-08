'use client';

import { useMemo } from 'react';
import { format, isToday, isTomorrow } from 'date-fns';
import { cn, categoryColors, parseLocalDate } from '@/lib/utils';
import { Event } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Clock } from 'lucide-react';
import { CountdownBadge } from '@/components/events/CountdownTimer';

interface UpcomingEventsProps {
    events: Event[];
    onEventClick: (event: Event) => void;
    maxItems?: number;
}

export function UpcomingEvents({ events, onEventClick, maxItems = 5 }: UpcomingEventsProps) {
    const upcomingEvents = useMemo(() => {
        const now = new Date();
        return events
            .filter((e) => {
                const startDate = parseLocalDate(e.startDate);
                return startDate >= now && !e.isCompleted;
            })
            .sort((a, b) => parseLocalDate(a.startDate).getTime() - parseLocalDate(b.startDate).getTime())
            .slice(0, maxItems);
    }, [events, maxItems]);

    const getTimeLabel = (dateStr: string): string => {
        const date = parseLocalDate(dateStr);
        if (isToday(date)) {
            return `Today at ${format(date, 'h:mm a')}`;
        }
        if (isTomorrow(date)) {
            return `Tomorrow at ${format(date, 'h:mm a')}`;
        }
        return format(date, 'EEE, MMM d \'at\' h:mm a');
    };

    return (
        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
            <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Upcoming
                </CardTitle>
            </CardHeader>
            <CardContent>
                {upcomingEvents.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                        No upcoming events
                    </p>
                ) : (
                    <ScrollArea className="h-[200px]">
                        <div className="space-y-2">
                            {upcomingEvents.map((event) => {
                                const colors = categoryColors[event.category] || categoryColors.work;
                                return (
                                    <div
                                        key={event.id}
                                        className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                                        onClick={() => onEventClick(event)}
                                    >
                                        <div className={cn("w-1 h-10 rounded-full", colors.border.replace('border-', 'bg-'))} />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium truncate">{event.title}</p>
                                            <p className="text-xs text-muted-foreground">
                                                {getTimeLabel(event.startDate)}
                                            </p>
                                        </div>
                                        <CountdownBadge targetDate={event.startDate} />
                                    </div>
                                );
                            })}
                        </div>
                    </ScrollArea>
                )}
            </CardContent>
        </Card>
    );
}

