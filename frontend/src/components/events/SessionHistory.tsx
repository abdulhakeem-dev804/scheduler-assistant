'use client';

import { useState, useEffect } from 'react';
import { Event, SessionAttendance, SessionStats, SessionStatus } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, XCircle, SkipForward, Clock, Flame, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';
import { apiClient } from '@/lib/api';
import { format, parseISO, isToday, isYesterday, isFuture } from 'date-fns';

interface SessionHistoryProps {
    event: Event;
    onSessionMarked?: () => void;
    compact?: boolean;
}

// Convert API response to frontend types
function convertSessionAttendance(apiSession: {
    id: string;
    event_id: string;
    session_date: string;
    status: string;
    notes?: string;
    created_at?: string;
}): SessionAttendance {
    return {
        id: apiSession.id,
        eventId: apiSession.event_id,
        sessionDate: apiSession.session_date,
        status: apiSession.status as SessionStatus,
        notes: apiSession.notes,
        createdAt: apiSession.created_at,
    };
}

function convertSessionStats(apiStats: {
    total_sessions: number;
    attended: number;
    missed: number;
    skipped: number;
    pending: number;
    attendance_rate: number;
    current_streak: number;
}): SessionStats {
    return {
        totalSessions: apiStats.total_sessions,
        attended: apiStats.attended,
        missed: apiStats.missed,
        skipped: apiStats.skipped,
        pending: apiStats.pending,
        attendanceRate: apiStats.attendance_rate,
        currentStreak: apiStats.current_streak,
    };
}

export function SessionHistory({ event, onSessionMarked, compact = false }: SessionHistoryProps) {
    const [sessions, setSessions] = useState<SessionAttendance[]>([]);
    const [stats, setStats] = useState<SessionStats | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isMarking, setIsMarking] = useState<string | null>(null);

    // Generate all session dates for this event
    const getAllSessionDates = (): string[] => {
        if (!event.dailyStartTime || !event.dailyEndTime) return [];

        const dates: string[] = [];
        const start = parseISO(event.startDate);
        const end = parseISO(event.endDate);
        const today = new Date();

        const current = new Date(start);
        while (current <= end) {
            // Only include past and today's sessions
            if (current <= today || current.toDateString() === today.toDateString()) {
                dates.push(format(current, 'yyyy-MM-dd'));
            }
            current.setDate(current.getDate() + 1);
        }

        return dates.reverse(); // Most recent first
    };

    // Fetch session data
    useEffect(() => {
        const fetchData = async () => {
            try {
                setIsLoading(true);
                const [sessionsData, statsData] = await Promise.all([
                    apiClient.getEventSessions(event.id),
                    apiClient.getSessionStats(event.id),
                ]);
                setSessions(sessionsData.map(convertSessionAttendance));
                setStats(convertSessionStats(statsData));
            } catch (error) {
                console.error('Error fetching session data:', error);
            } finally {
                setIsLoading(false);
            }
        };

        if (event.dailyStartTime && event.dailyEndTime) {
            fetchData();
        }
    }, [event.id, event.dailyStartTime, event.dailyEndTime]);

    // Get session status for a specific date
    const getSessionStatus = (date: string): SessionStatus => {
        const session = sessions.find(s => s.sessionDate === date);
        if (session) return session.status;

        // Check if it's a future session
        const sessionDate = parseISO(date);
        if (isFuture(sessionDate)) return 'pending';

        // Check if today's session hasn't ended yet
        if (isToday(sessionDate) && event.dailyEndTime) {
            const [endHour, endMin] = event.dailyEndTime.split(':').map(Number);
            const now = new Date();
            const sessionEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), endHour, endMin);
            if (now < sessionEnd) return 'pending';
        }

        // Past session without record - pending (needs marking)
        return 'pending';
    };

    // Mark a session
    const markSession = async (date: string, status: 'attended' | 'missed' | 'skipped') => {
        try {
            setIsMarking(date);
            const result = await apiClient.markSessionAttendance(event.id, date, status);

            // Update local state
            setSessions(prev => {
                const existing = prev.findIndex(s => s.sessionDate === date);
                const newSession = convertSessionAttendance(result);
                if (existing >= 0) {
                    const updated = [...prev];
                    updated[existing] = newSession;
                    return updated;
                }
                return [newSession, ...prev];
            });

            // Refresh stats
            const newStats = await apiClient.getSessionStats(event.id);
            setStats(convertSessionStats(newStats));

            onSessionMarked?.();
        } catch (error) {
            console.error('Error marking session:', error);
        } finally {
            setIsMarking(null);
        }
    };

    // Format date for display
    const formatSessionDate = (date: string): string => {
        const d = parseISO(date);
        if (isToday(d)) return 'Today';
        if (isYesterday(d)) return 'Yesterday';
        return format(d, 'MMM d');
    };

    // Get status icon and color
    const getStatusDisplay = (status: SessionStatus) => {
        switch (status) {
            case 'attended':
                return { icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-500/10' };
            case 'missed':
                return { icon: XCircle, color: 'text-red-500', bg: 'bg-red-500/10' };
            case 'skipped':
                return { icon: SkipForward, color: 'text-yellow-500', bg: 'bg-yellow-500/10' };
            default:
                return { icon: Clock, color: 'text-muted-foreground', bg: 'bg-muted/50' };
        }
    };

    if (!event.dailyStartTime || !event.dailyEndTime) {
        return null;
    }

    const allDates = getAllSessionDates();
    const displayDates = compact ? allDates.slice(0, 5) : allDates;

    if (isLoading) {
        return (
            <Card className={cn("bg-card/50 border-border/50", compact && "border-0 shadow-none bg-transparent")}>
                <CardContent className="py-4">
                    <div className="flex items-center justify-center text-muted-foreground">
                        <Clock className="w-4 h-4 mr-2 animate-spin" />
                        Loading sessions...
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className={cn("bg-card/50 border-border/50", compact && "border-0 shadow-none bg-transparent p-0")}>
            {!compact && (
                <CardHeader className="pb-2">
                    <CardTitle className="flex items-center justify-between text-sm">
                        <span className="flex items-center gap-2">
                            <Calendar className="w-4 h-4" />
                            Session History
                        </span>
                        {stats && stats.currentStreak > 0 && (
                            <Badge variant="outline" className="bg-orange-500/10 text-orange-500 border-orange-500/30">
                                <Flame className="w-3 h-3 mr-1" />
                                {stats.currentStreak} day streak
                            </Badge>
                        )}
                    </CardTitle>
                </CardHeader>
            )}
            <CardContent className={cn("space-y-2", compact && "p-0")}>
                {/* Session List */}
                <div className="space-y-1">
                    {displayDates.map(date => {
                        const status = getSessionStatus(date);
                        const { icon: Icon, color, bg } = getStatusDisplay(status);
                        const isPending = status === 'pending';
                        const isMarkingThis = isMarking === date;

                        return (
                            <div
                                key={date}
                                className={cn(
                                    "flex items-center justify-between p-2 rounded-lg group",
                                    bg,
                                    isPending && "border border-dashed border-border"
                                )}
                            >
                                <div className="flex items-center gap-2">
                                    <Icon className={cn("w-4 h-4", color)} />
                                    <span className="text-sm">{formatSessionDate(date)}</span>
                                </div>

                                {!isFuture(parseISO(date)) && (
                                    <div className="flex gap-1">
                                        <Button
                                            size="sm"
                                            variant={status === 'attended' ? 'default' : 'ghost'}
                                            className={cn(
                                                "h-6 px-2 text-xs",
                                                status === 'attended'
                                                    ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                                                    : "hover:bg-emerald-500/20 hover:text-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                            )}
                                            onClick={() => markSession(date, 'attended')}
                                            disabled={isMarkingThis || status === 'attended'}
                                            title="Mark as attended"
                                        >
                                            ✓
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant={status === 'missed' ? 'default' : 'ghost'}
                                            className={cn(
                                                "h-6 px-2 text-xs",
                                                status === 'missed'
                                                    ? "bg-red-600 hover:bg-red-700 text-white"
                                                    : "hover:bg-red-500/20 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                            )}
                                            onClick={() => markSession(date, 'missed')}
                                            disabled={isMarkingThis || status === 'missed'}
                                            title="Mark as missed"
                                        >
                                            ✗
                                        </Button>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>

                {/* Stats Summary */}
                {stats && !compact && (
                    <div className="pt-2 border-t border-border/50">
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <span>
                                Attendance: {stats.attendanceRate.toFixed(0)}%
                            </span>
                            <span>
                                {stats.attended}/{stats.attended + stats.missed} sessions
                            </span>
                        </div>
                    </div>
                )}

                {/* Compact Stats */}
                {stats && compact && (
                    <div className="flex items-center gap-3 pt-2 text-xs text-muted-foreground">
                        {stats.currentStreak > 0 && (
                            <span className="flex items-center gap-1 text-orange-500">
                                <Flame className="w-3 h-3" />
                                {stats.currentStreak}
                            </span>
                        )}
                        <span>{stats.attendanceRate.toFixed(0)}% attended</span>
                    </div>
                )}

                {/* View All Button */}
                {compact && allDates.length > 5 && (
                    <Button variant="ghost" size="sm" className="w-full text-xs text-muted-foreground">
                        View all {allDates.length} sessions
                    </Button>
                )}
            </CardContent>
        </Card>
    );
}
