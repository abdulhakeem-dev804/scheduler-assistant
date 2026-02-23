import { useState, useMemo } from 'react';
import { Event } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EventCountdown } from '@/components/events/EventCountdown';
import { SessionHistory } from '@/components/events/SessionHistory';
import { CheckCircle2, Circle, ChevronLeft, ChevronRight, Clock, CalendarCheck } from 'lucide-react';
import { cn, parseLocalDate } from '@/lib/utils';
import { format } from 'date-fns';
import { apiClient } from '@/lib/api';

interface FocusViewProps {
    events: Event[];
    onToggleComplete: (event: Event) => void;
}


// Helper to get today's session window dates
function getTodaySessionWindow(dailyStartTime: string, dailyEndTime: string): { start: Date; end: Date } {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const [startH, startM] = dailyStartTime.split(':').map(Number);
    const [endH, endM] = dailyEndTime.split(':').map(Number);

    const sessionStart = new Date(today.getTime() + startH * 60 * 60 * 1000 + startM * 60 * 1000);
    const sessionEnd = new Date(today.getTime() + endH * 60 * 60 * 1000 + endM * 60 * 1000);

    return { start: sessionStart, end: sessionEnd };
}

// Determine session status for filtering
type SessionStatus = 'in-session' | 'upcoming' | 'paused' | 'ended';

function getSessionStatus(event: Event, now: Date): SessionStatus {
    const start = parseLocalDate(event.startDate);
    const end = parseLocalDate(event.endDate);
    const nowMs = now.getTime();
    const startMs = start.getTime();
    const endMs = end.getTime();

    // Event hasn't started yet
    if (nowMs < startMs) {
        return 'upcoming';
    }

    // Event has completely ended (past end date)
    if (nowMs > endMs) {
        return 'ended';
    }

    // Event is within date range, check daily session times
    if (event.dailyStartTime && event.dailyEndTime) {
        const { start: sessionStart, end: sessionEnd } = getTodaySessionWindow(
            event.dailyStartTime,
            event.dailyEndTime
        );
        const sessionStartMs = sessionStart.getTime();
        const sessionEndMs = sessionEnd.getTime();

        if (nowMs >= sessionStartMs && nowMs < sessionEndMs) {
            return 'in-session';
        } else if (nowMs < sessionStartMs) {
            // Session hasn't started today yet
            return 'upcoming';
        } else {
            // Today's session ended, but event continues on future days
            return 'paused';
        }
    }

    // No daily session times - standard ongoing event
    return 'in-session';
}

export function FocusView({ events, onToggleComplete }: FocusViewProps) {
    const [currentIndex, setCurrentIndex] = useState(0);

    // Filter and sort focus tasks
    const focusTasks = useMemo(() => {
        const now = new Date();

        // Filter: active, not completed, session not completely ended
        const validEvents = events.filter(e => {
            if (e.isCompleted) return false;

            const status = getSessionStatus(e, now);
            // Exclude 'ended' events - their sessions are completely over
            return status !== 'ended';
        });

        // Sort: in-session first → priority → start time
        return validEvents.sort((a, b) => {
            const statusA = getSessionStatus(a, now);
            const statusB = getSessionStatus(b, now);

            // In-session events first
            const sessionOrder: Record<SessionStatus, number> = {
                'in-session': 0,
                'upcoming': 1,
                'paused': 2,
                'ended': 3
            };

            if (sessionOrder[statusA] !== sessionOrder[statusB]) {
                return sessionOrder[statusA] - sessionOrder[statusB];
            }

            // Then by priority
            const priorityWeight = { high: 3, medium: 2, low: 1 };
            const weightA = priorityWeight[a.priority];
            const weightB = priorityWeight[b.priority];

            if (weightA !== weightB) return weightB - weightA; // Descending

            // Then by start time
            return new Date(a.startDate).getTime() - new Date(b.startDate).getTime();
        });
    }, [events]);

    // Reset index if out of bounds
    const safeIndex = focusTasks.length === 0
        ? 0
        : Math.min(currentIndex, focusTasks.length - 1);

    const focusTask = focusTasks[safeIndex];

    const goToPrevious = () => {
        setCurrentIndex(prev => Math.max(0, prev - 1));
    };

    const goToNext = () => {
        setCurrentIndex(prev => Math.min(focusTasks.length - 1, prev + 1));
    };

    // Empty state
    if (!focusTask || focusTasks.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-8">
                <CheckCircle2 className="w-16 h-16 mb-4 text-green-500" />
                <h2 className="text-2xl font-bold">All caught up!</h2>
                <p>No active tasks remaining. Enjoy your break!</p>
            </div>
        );
    }

    const currentSessionStatus = getSessionStatus(focusTask, new Date());

    return (
        <div className="flex flex-col h-full bg-background/50 backdrop-blur-sm p-6 lg:p-12 overflow-y-auto">
            {/* Main Focus Container - Centered */}
            <div className="max-w-4xl mx-auto w-full space-y-6 flex-1 flex flex-col justify-center">

                {/* Navigation Header */}
                <div className="flex items-center justify-center gap-4">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={goToPrevious}
                        disabled={safeIndex === 0}
                        className="h-10 w-10 rounded-full hover:bg-primary/10"
                    >
                        <ChevronLeft className="h-6 w-6" />
                    </Button>

                    <div className="flex flex-col items-center gap-2">
                        <span className="text-sm text-muted-foreground">
                            Focus {safeIndex + 1} of {focusTasks.length}
                        </span>

                        {/* Dot indicators */}
                        {focusTasks.length > 1 && focusTasks.length <= 10 && (
                            <div className="flex gap-1.5">
                                {focusTasks.map((_, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => setCurrentIndex(idx)}
                                        className={cn(
                                            "w-2 h-2 rounded-full transition-all duration-200",
                                            idx === safeIndex
                                                ? "bg-primary w-6"
                                                : "bg-muted-foreground/30 hover:bg-muted-foreground/50"
                                        )}
                                        aria-label={`Go to focus ${idx + 1}`}
                                    />
                                ))}
                            </div>
                        )}
                    </div>

                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={goToNext}
                        disabled={currentIndex === focusTasks.length - 1}
                        className="h-10 w-10 rounded-full hover:bg-primary/10"
                    >
                        <ChevronRight className="h-6 w-6" />
                    </Button>
                </div>

                {/* Header: Label + Priority + Session Times */}
                <div className="text-center space-y-4">
                    <div className="flex flex-col items-center gap-2">
                        <div className="flex items-center justify-center gap-2">
                            <Badge variant="outline" className="px-4 py-1 text-sm uppercase tracking-widest border-primary/50 text-primary">
                                Current Focus
                            </Badge>
                            {currentSessionStatus === 'in-session' && (
                                <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
                                    In Session
                                </Badge>
                            )}
                            {currentSessionStatus === 'paused' && (
                                <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">
                                    Session Paused
                                </Badge>
                            )}
                            {currentSessionStatus === 'upcoming' && (
                                <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">
                                    Upcoming
                                </Badge>
                            )}
                        </div>

                        {/* Session Time Display */}
                        {focusTask.dailyStartTime && focusTask.dailyEndTime && (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Clock className="w-4 h-4" />
                                <span>
                                    {(() => {
                                        const { start, end } = getTodaySessionWindow(focusTask.dailyStartTime!, focusTask.dailyEndTime!);
                                        return `${format(start, 'hh:mm a')} - ${format(end, 'hh:mm a')}`;
                                    })()}
                                </span>
                            </div>
                        )}
                    </div>
                    <h1 className="text-2xl lg:text-3xl font-bold tracking-tight text-foreground/90">
                        {focusTask.title}
                    </h1>
                </div>

                {/* Main Timer Display */}
                <div className="flex justify-center py-12">
                    <div className="scale-125 transform transition-transform origin-center">
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
                        <div className="pt-4 space-y-4">
                            {/* Session History for daily-session events */}
                            {focusTask.dailyStartTime && focusTask.dailyEndTime && (
                                <SessionHistory event={focusTask} compact />
                            )}

                            {/* Action Buttons */}
                            <div className="flex justify-end gap-2">
                                {focusTask.dailyStartTime && focusTask.dailyEndTime ? (
                                    <SessionActionButton
                                        event={focusTask}
                                        onComplete={() => onToggleComplete(focusTask)}
                                    />
                                ) : (
                                    <Button
                                        size="lg"
                                        className="w-full sm:w-auto gap-2 text-lg h-14"
                                        onClick={() => onToggleComplete(focusTask)}
                                    >
                                        <CheckCircle2 className="w-6 h-6" />
                                        Complete Task
                                    </Button>
                                )}
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Quick Focus Selector (for more than 3 items) */}
                {focusTasks.length > 3 && (
                    <Card className="bg-card/30 border-border/30">
                        <CardHeader className="py-3">
                            <CardTitle className="text-sm font-medium text-muted-foreground">
                                Quick Jump
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="py-3">
                            <div className="flex flex-wrap gap-2">
                                {focusTasks.map((task, idx) => (
                                    <Button
                                        key={task.id}
                                        variant={idx === safeIndex ? "default" : "outline"}
                                        size="sm"
                                        onClick={() => setCurrentIndex(idx)}
                                        className={cn(
                                            "text-xs",
                                            idx === safeIndex && "ring-2 ring-primary/50"
                                        )}
                                    >
                                        {task.title.length > 20 ? task.title.slice(0, 20) + '...' : task.title}
                                    </Button>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                )}
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

// Session action button for daily-session events
function SessionActionButton({ event, onComplete }: { event: Event; onComplete: () => void }) {
    const [isMarking, setIsMarking] = useState(false);
    const [todayMarked, setTodayMarked] = useState(false);

    const today = format(new Date(), 'yyyy-MM-dd');

    const handleMarkToday = async () => {
        try {
            setIsMarking(true);
            await apiClient.markSessionAttendance(event.id, today, 'attended');
            setTodayMarked(true);
        } catch (error) {
            console.error('Error marking session:', error);
        } finally {
            setIsMarking(false);
        }
    };

    // Check if we're in today's session window
    const isInSessionWindow = () => {
        if (!event.dailyStartTime || !event.dailyEndTime) return false;

        const now = new Date();
        const [startH, startM] = event.dailyStartTime.split(':').map(Number);
        const [endH, endM] = event.dailyEndTime.split(':').map(Number);

        const sessionStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), startH, startM);
        const sessionEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), endH, endM);

        return now >= sessionStart && now < sessionEnd;
    };

    const inSession = isInSessionWindow();

    if (todayMarked) {
        return (
            <Button
                size="lg"
                className="w-full sm:w-auto gap-2 text-lg h-14 bg-emerald-600 hover:bg-emerald-700"
                disabled
            >
                <CheckCircle2 className="w-6 h-6" />
                Today&apos;s Session Marked ✓
            </Button>
        );
    }

    return (
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            {inSession && (
                <Button
                    size="lg"
                    className="w-full sm:w-auto gap-2 text-lg h-14 bg-emerald-600 hover:bg-emerald-700"
                    onClick={handleMarkToday}
                    disabled={isMarking}
                >
                    <CalendarCheck className="w-6 h-6" />
                    {isMarking ? 'Marking...' : "Mark Today\u0027s Session ✓"}
                </Button>
            )}
            <Button
                size="lg"
                variant={inSession ? "outline" : "default"}
                className="w-full sm:w-auto gap-2 text-lg h-14"
                onClick={onComplete}
            >
                <CheckCircle2 className="w-6 h-6" />
                Complete All Sessions
            </Button>
        </div>
    );
}

