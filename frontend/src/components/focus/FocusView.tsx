import { useState, useEffect, useMemo } from 'react';
import { Event } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EventCountdown } from '@/components/events/EventCountdown';
import { CheckCircle2, Circle, AlertCircle, Play, Pause } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils'; // Assuming cn exists

interface FocusViewProps {
    events: Event[];
    onToggleComplete: (event: Event) => void;
}

export function FocusView({ events, onToggleComplete }: FocusViewProps) {
    // 1. Filter active events
    // 2. Sort by Priority (High > Medium > Low) -> Sub-sort by Start Time
    const focusTask = useMemo(() => {
        const activeEvents = events.filter(e => !e.isCompleted);

        return activeEvents.sort((a, b) => {
            // Priority sort
            const priorityWeight = { high: 3, medium: 2, low: 1 };
            const weightA = priorityWeight[a.priority];
            const weightB = priorityWeight[b.priority];

            if (weightA !== weightB) return weightB - weightA; // Descending

            // Time sort
            return new Date(a.startDate).getTime() - new Date(b.startDate).getTime();
        })[0]; // Take top
    }, [events]);

    if (!focusTask) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-8">
                <CheckCircle2 className="w-16 h-16 mb-4 text-green-500" />
                <h2 className="text-2xl font-bold">All caught up!</h2>
                <p>No active tasks remaining. Enjoy your break!</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-background/50 backdrop-blur-sm p-6 lg:p-12 overflow-y-auto">
            {/* Main Focus Container - Centered */}
            <div className="max-w-4xl mx-auto w-full space-y-8 flex-1 flex flex-col justify-center">

                {/* Header: Label + Priority */}
                <div className="text-center space-y-4">
                    <Badge variant="outline" className="px-4 py-1 text-sm uppercase tracking-widest border-primary/50 text-primary">
                        Current Focus
                    </Badge>
                    <h1 className="text-4xl lg:text-5xl font-extrabold tracking-tight bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-transparent">
                        {focusTask.title}
                    </h1>
                </div>

                {/* Main Timer Display */}
                <div className="flex justify-center py-8">
                    {/* Reuse EventCountdown but wrap it to look hero-sized if component allows custom styling or just use full variant? 
                         EventCountdown 'full' variant is decent but maybe we want BIGGER. 
                         Actually, let's use the 'full' variant for now and verify if it's "beautiful" enough.
                         User asked for "beautiful time counter... main focus would be on timer".
                         The 'full' variant has circular progress etc if implemented well. 
                         Let's assume EventCountdown is capable or wrap it in a scaling container.
                     */}
                    <div className="scale-125 transform transition-transform">
                        <EventCountdown
                            startDate={focusTask.startDate}
                            endDate={focusTask.endDate}
                            variant="full"
                            dailyStartTime={focusTask.dailyStartTime}
                            dailyEndTime={focusTask.dailyEndTime}
                        />
                    </div>
                </div>

                {/* Task Details Card */}
                <Card className="bg-card/50 border-border/50 backdrop-blur-xl shadow-2xl">
                    <CardHeader>
                        <CardTitle className="flex items-center justify-between text-lg">
                            <span>Task Details</span>
                            <Badge className={cn(
                                "capitalize",
                                focusTask.priority === 'high' ? "bg-red-500/20 text-red-500 hover:bg-red-500/30" :
                                    focusTask.priority === 'medium' ? "bg-yellow-500/20 text-yellow-500" :
                                        "bg-blue-500/20 text-blue-500"
                            )}>
                                {focusTask.priority} Priority
                            </Badge>
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {/* Description */}
                        {focusTask.description && (
                            <div className="text-muted-foreground leading-relaxed">
                                {focusTask.description}
                            </div>
                        )}

                        {/* Subtasks */}
                        {focusTask.subtasks && focusTask.subtasks.length > 0 && (
                            <div className="space-y-3">
                                <h3 className="text-sm font-medium text-foreground/80 flex items-center gap-2">
                                    <LayoutList className="w-4 h-4" /> Subtasks
                                </h3>
                                <div className="space-y-2">
                                    {focusTask.subtasks.map((subtask) => (
                                        <div key={subtask.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 border border-border/50">
                                            {subtask.completed ? (
                                                <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" />
                                            ) : (
                                                <Circle className="w-5 h-5 text-muted-foreground shrink-0" />
                                            )}
                                            <span className={cn("text-sm", subtask.completed && "line-through text-muted-foreground")}>
                                                {subtask.title}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Actions */}
                        <div className="pt-4 flex justify-end">
                            <Button
                                size="lg"
                                className="w-full sm:w-auto gap-2 text-lg h-14"
                                onClick={() => onToggleComplete(focusTask)}
                            >
                                <CheckCircle2 className="w-6 h-6" />
                                Complete Task
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

function LayoutList({ className }: { className?: string }) {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={className}
        >
            <rect width="7" height="9" x="3" y="3" rx="1" />
            <rect width="7" height="5" x="14" y="3" rx="1" />
            <rect width="7" height="9" x="14" y="12" rx="1" />
            <rect width="7" height="5" x="3" y="16" rx="1" />
        </svg>
    )
}
