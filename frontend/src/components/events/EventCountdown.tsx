'use client';

import { useState, useEffect } from 'react';
import { cn, parseLocalDate } from '@/lib/utils';
import { Play, Clock, CheckCircle, AlertTriangle, Pause } from 'lucide-react';

interface EventCountdownProps {
    startDate: string;
    endDate: string;
    isCompleted?: boolean;
    className?: string;
    variant?: 'badge' | 'full' | 'compact';
    dailyStartTime?: string;  // "HH:mm" format
    dailyEndTime?: string;    // "HH:mm" format
}

interface TimeState {
    status: 'upcoming' | 'ongoing' | 'ended' | 'completed' | 'paused';
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
    totalMs: number;
    label: string;
    remaining?: {
        days: number;
        hours: number;
        minutes: number;
        seconds: number;
    };
    // Daily session specific
    todayRemaining?: {
        hours: number;
        minutes: number;
        seconds: number;
    };
    sessionElapsed?: {
        hours: number;
        minutes: number;
        seconds: number;
    };
    isInSession?: boolean;
    // Next session countdown
    nextSessionStartsIn?: {
        hours: number;
        minutes: number;
        seconds: number;
    };
    nextSessionIsToday?: boolean;
}

// Helper to parse time string "HH:mm" to minutes since midnight
function parseTimeToMinutes(timeStr: string): number {
    const [h, m] = timeStr.split(':').map(Number);
    return h * 60 + m;
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

// Calculate total session time across all days
function calculateTotalSessionMs(startDate: string, endDate: string, dailyStartTime: string, dailyEndTime: string): number {
    const start = parseLocalDate(startDate);
    const end = parseLocalDate(endDate);

    // Daily session duration in ms
    const startMinutes = parseTimeToMinutes(dailyStartTime);
    const endMinutes = parseTimeToMinutes(dailyEndTime);
    const dailyDurationMs = (endMinutes - startMinutes) * 60 * 1000;

    // Count total days from start to end (inclusive)
    const startDay = new Date(start.getFullYear(), start.getMonth(), start.getDate());
    const endDay = new Date(end.getFullYear(), end.getMonth(), end.getDate());
    const totalDays = Math.floor((endDay.getTime() - startDay.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    return totalDays * dailyDurationMs;
}

// Calculate elapsed session time (only counting time during daily windows)
function calculateSessionElapsedMs(startDate: string, dailyStartTime: string, dailyEndTime: string): number {
    const now = new Date();
    const eventStart = parseLocalDate(startDate);

    const startMinutes = parseTimeToMinutes(dailyStartTime);
    const endMinutes = parseTimeToMinutes(dailyEndTime);
    const dailyDurationMs = (endMinutes - startMinutes) * 60 * 1000;

    // Count completed days
    const eventStartDay = new Date(eventStart.getFullYear(), eventStart.getMonth(), eventStart.getDate());
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const completedDays = Math.floor((today.getTime() - eventStartDay.getTime()) / (1000 * 60 * 60 * 24));

    let totalElapsed = completedDays * dailyDurationMs;

    // Add today's session time if currently in session
    const { start: todayStart, end: todayEnd } = getTodaySessionWindow(dailyStartTime, dailyEndTime);

    if (now >= todayStart && now < todayEnd) {
        // Currently in session - add elapsed time today
        totalElapsed += now.getTime() - todayStart.getTime();
    } else if (now >= todayEnd) {
        // Today's session already ended - add full session
        totalElapsed += dailyDurationMs;
    }

    return Math.max(0, totalElapsed);
}

function calculateTimeState(
    startDate: string,
    endDate: string,
    isCompleted?: boolean,
    dailyStartTime?: string,
    dailyEndTime?: string
): TimeState {
    const now = new Date().getTime();
    const start = parseLocalDate(startDate).getTime();
    const end = parseLocalDate(endDate).getTime();

    if (isCompleted) {
        return {
            status: 'completed',
            days: 0, hours: 0, minutes: 0, seconds: 0, totalMs: 0,
            label: 'Completed'
        };
    }

    // Daily session mode
    if (dailyStartTime && dailyEndTime) {
        const { start: todayStart, end: todayEnd } = getTodaySessionWindow(dailyStartTime, dailyEndTime);
        const todayStartMs = todayStart.getTime();
        const todayEndMs = todayEnd.getTime();

        const isEventStarted = now >= start;
        const isEventEnded = now > end;
        const isInSession = now >= todayStartMs && now < todayEndMs && isEventStarted && !isEventEnded;

        // Session-aware calculations
        const totalSessionMs = calculateTotalSessionMs(startDate, endDate, dailyStartTime, dailyEndTime);
        const sessionElapsedMs = isEventStarted ? calculateSessionElapsedMs(startDate, dailyStartTime, dailyEndTime) : 0;
        const sessionRemainingMs = Math.max(0, totalSessionMs - sessionElapsedMs);

        // Today's remaining time (only if in session)
        let todayRemainingMs = 0;
        if (isInSession) {
            todayRemainingMs = todayEndMs - now;
        }

        if (!isEventStarted) {
            // Upcoming
            const diff = start - now;
            return {
                status: 'upcoming',
                days: Math.floor(diff / (1000 * 60 * 60 * 24)),
                hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
                minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
                seconds: Math.floor((diff % (1000 * 60)) / 1000),
                totalMs: diff,
                label: 'Starts in',
                isInSession: false,
            };
        } else if (isEventEnded) {
            // Ended
            const diff = now - end;
            return {
                status: 'ended',
                days: Math.floor(diff / (1000 * 60 * 60 * 24)),
                hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
                minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
                seconds: Math.floor((diff % (1000 * 60)) / 1000),
                totalMs: diff,
                label: 'Ended',
                isInSession: false,
            };
        } else if (isInSession) {
            // Currently in active session
            return {
                status: 'ongoing',
                // Elapsed session time
                days: 0,
                hours: Math.floor(sessionElapsedMs / (1000 * 60 * 60)),
                minutes: Math.floor((sessionElapsedMs % (1000 * 60 * 60)) / (1000 * 60)),
                seconds: Math.floor((sessionElapsedMs % (1000 * 60)) / 1000),
                totalMs: sessionElapsedMs,
                label: 'In session',
                isInSession: true,
                // Remaining total session time
                remaining: {
                    days: Math.floor(sessionRemainingMs / (1000 * 60 * 60 * 24)),
                    hours: Math.floor((sessionRemainingMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
                    minutes: Math.floor((sessionRemainingMs % (1000 * 60 * 60)) / (1000 * 60)),
                    seconds: Math.floor((sessionRemainingMs % (1000 * 60)) / 1000),
                },
                // Today's remaining
                todayRemaining: {
                    hours: Math.floor(todayRemainingMs / (1000 * 60 * 60)),
                    minutes: Math.floor((todayRemainingMs % (1000 * 60 * 60)) / (1000 * 60)),
                    seconds: Math.floor((todayRemainingMs % (1000 * 60)) / 1000),
                },
            };
        } else {
            // Between sessions (paused) - check if today's session hasn't started yet or has ended
            const nowDate = new Date();
            const { start: todaySessionStart, end: todaySessionEnd } = getTodaySessionWindow(dailyStartTime!, dailyEndTime!);

            let nextSessionMs: number;
            let nextSessionIsToday: boolean;

            if (nowDate.getTime() < todaySessionStart.getTime()) {
                // Today's session hasn't started yet - next session is later today
                nextSessionMs = todaySessionStart.getTime() - nowDate.getTime();
                nextSessionIsToday = true;
            } else {
                // Today's session has ended - next session is tomorrow
                const tomorrow = new Date(nowDate.getFullYear(), nowDate.getMonth(), nowDate.getDate() + 1);
                const [startH, startM] = dailyStartTime!.split(':').map(Number);
                const tomorrowSessionStart = new Date(tomorrow.getTime() + startH * 60 * 60 * 1000 + startM * 60 * 1000);
                nextSessionMs = tomorrowSessionStart.getTime() - nowDate.getTime();
                nextSessionIsToday = false;
            }

            return {
                status: 'paused',
                // Session elapsed so far
                days: 0,
                hours: Math.floor(sessionElapsedMs / (1000 * 60 * 60)),
                minutes: Math.floor((sessionElapsedMs % (1000 * 60 * 60)) / (1000 * 60)),
                seconds: Math.floor((sessionElapsedMs % (1000 * 60)) / 1000),
                totalMs: sessionElapsedMs,
                label: 'Session paused',
                isInSession: false,
                remaining: {
                    days: Math.floor(sessionRemainingMs / (1000 * 60 * 60 * 24)),
                    hours: Math.floor((sessionRemainingMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
                    minutes: Math.floor((sessionRemainingMs % (1000 * 60 * 60)) / (1000 * 60)),
                    seconds: Math.floor((sessionRemainingMs % (1000 * 60)) / 1000),
                },
                nextSessionStartsIn: {
                    hours: Math.floor(nextSessionMs / (1000 * 60 * 60)),
                    minutes: Math.floor((nextSessionMs % (1000 * 60 * 60)) / (1000 * 60)),
                    seconds: Math.floor((nextSessionMs % (1000 * 60)) / 1000),
                },
                nextSessionIsToday,
            };
        }
    }

    // Standard mode (no daily sessions)
    if (now < start) {
        const diff = start - now;
        return {
            status: 'upcoming',
            days: Math.floor(diff / (1000 * 60 * 60 * 24)),
            hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
            minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
            seconds: Math.floor((diff % (1000 * 60)) / 1000),
            totalMs: diff,
            label: 'Starts in'
        };
    } else if (now >= start && now < end) {
        const elapsed = now - start;
        const remaining = end - now;

        return {
            status: 'ongoing',
            days: Math.floor(elapsed / (1000 * 60 * 60 * 24)),
            hours: Math.floor((elapsed % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
            minutes: Math.floor((elapsed % (1000 * 60 * 60)) / (1000 * 60)),
            seconds: Math.floor((elapsed % (1000 * 60)) / 1000),
            totalMs: elapsed,
            label: 'In progress',
            remaining: {
                days: Math.floor(remaining / (1000 * 60 * 60 * 24)),
                hours: Math.floor((remaining % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
                minutes: Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60)),
                seconds: Math.floor((remaining % (1000 * 60)) / 1000),
            }
        };
    } else {
        const diff = now - end;
        return {
            status: 'ended',
            days: Math.floor(diff / (1000 * 60 * 60 * 24)),
            hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
            minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
            seconds: Math.floor((diff % (1000 * 60)) / 1000),
            totalMs: diff,
            label: 'Ended'
        };
    }
}

function formatTimeDisplay(state: TimeState, compact = false): string {
    if (state.status === 'completed') return '✓ Done';

    const parts: string[] = [];
    if (state.days > 0) parts.push(`${state.days}d`);
    if (state.hours > 0 || state.days > 0) parts.push(`${state.hours}h`);
    parts.push(`${state.minutes}m`);
    if (!compact) parts.push(`${state.seconds.toString().padStart(2, '0')}s`);

    return parts.join(' ');
}

export function EventCountdown({
    startDate,
    endDate,
    isCompleted,
    className,
    variant = 'badge',
    dailyStartTime,
    dailyEndTime,
}: EventCountdownProps) {
    const [timeState, setTimeState] = useState<TimeState>(() =>
        calculateTimeState(startDate, endDate, isCompleted, dailyStartTime, dailyEndTime)
    );
    const [isSecondChanging, setIsSecondChanging] = useState(false);

    useEffect(() => {
        if (isCompleted) return;

        const interval = setInterval(() => {
            setIsSecondChanging(true);
            setTimeout(() => setIsSecondChanging(false), 150);
            setTimeState(calculateTimeState(startDate, endDate, isCompleted, dailyStartTime, dailyEndTime));
        }, 1000);

        return () => clearInterval(interval);
    }, [startDate, endDate, isCompleted, dailyStartTime, dailyEndTime]);

    const statusConfig = {
        upcoming: {
            bg: 'bg-blue-500/15',
            text: 'text-blue-400',
            border: 'border-blue-500/30',
            icon: Clock,
            iconColor: 'text-blue-400',
        },
        ongoing: {
            bg: 'bg-emerald-500/15',
            text: 'text-emerald-400',
            border: 'border-emerald-500/30',
            icon: Play,
            iconColor: 'text-emerald-400',
        },
        paused: {
            bg: 'bg-yellow-500/15',
            text: 'text-yellow-400',
            border: 'border-yellow-500/30',
            icon: Pause,
            iconColor: 'text-yellow-400',
        },
        ended: {
            bg: 'bg-orange-500/15',
            text: 'text-orange-400',
            border: 'border-orange-500/30',
            icon: AlertTriangle,
            iconColor: 'text-orange-400',
        },
        completed: {
            bg: 'bg-green-500/15',
            text: 'text-green-500',
            border: 'border-green-500/30',
            icon: CheckCircle,
            iconColor: 'text-green-500',
        },
    };

    const config = statusConfig[timeState.status];
    const Icon = config.icon;

    if (variant === 'compact') {
        return (
            <span className={cn(
                "inline-flex items-center gap-1 text-xs font-mono tabular-nums",
                config.text,
                className
            )}>
                <Icon className="h-3 w-3" />
                {formatTimeDisplay(timeState, true)}
            </span>
        );
    }

    if (variant === 'badge') {
        return (
            <span className={cn(
                "inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium border transition-colors",
                config.bg, config.text, config.border,
                className
            )}>
                <Icon className="w-3 h-3 mr-1.5 shrink-0" />

                {/* Special display for active daily session */}
                {timeState.isInSession && timeState.todayRemaining ? (
                    <>
                        <span className="opacity-70 mr-1.5">Today Left:</span>
                        <span className="font-mono tabular-nums text-yellow-500 font-bold">
                            {timeState.todayRemaining.hours.toString().padStart(2, '0')}:
                            {timeState.todayRemaining.minutes.toString().padStart(2, '0')}:
                            <span className={cn(
                                isSecondChanging && "scale-110 brightness-125"
                            )}>
                                {timeState.todayRemaining.seconds.toString().padStart(2, '0')}
                            </span>
                        </span>
                    </>
                ) : (
                    /* Standard display */
                    <>
                        {(timeState.status === 'upcoming' || timeState.status === 'ongoing' || timeState.status === 'paused') && (
                            <>
                                <span className="font-mono tabular-nums mr-1.5">
                                    {timeState.days > 0 && <span>{timeState.days}d </span>}
                                    {timeState.hours.toString().padStart(2, '0')}:
                                    {timeState.minutes.toString().padStart(2, '0')}:
                                    <span className={cn(
                                        isSecondChanging && "scale-110 brightness-125"
                                    )}>
                                        {timeState.seconds.toString().padStart(2, '0')}s
                                    </span>
                                </span>
                                <span className="opacity-70">{timeState.label}</span>
                            </>
                        )}

                        {timeState.status === 'completed' && (
                            <span>Completed</span>
                        )}

                        {timeState.status === 'ended' && (
                            <span>Ended</span>
                        )}

                        {/* Show remaining if available (unless in session where we show Today Left above) */}
                        {timeState.status === 'ongoing' && timeState.remaining && !timeState.isInSession && (
                            <>
                                <span className="mx-1.5 opacity-30">|</span>
                                <span className="opacity-70 mr-1">left</span>
                                {timeState.remaining.days > 0 && <span>{timeState.remaining.days}d</span>}
                                {(timeState.remaining.hours > 0 || timeState.remaining.days > 0) && <span>{timeState.remaining.hours}h</span>}
                                <span>{timeState.remaining.minutes}m</span>
                                <span>{timeState.remaining.seconds.toString().padStart(2, '0')}s</span>
                            </>
                        )}
                    </>
                )}
            </span>
        );
    }

    // Full variant - for EventModal
    const hasDailySession = !!(dailyStartTime && dailyEndTime);

    return (
        <div className={cn(
            "flex items-center justify-between p-3 rounded-lg border",
            config.bg, config.border,
            className
        )}>
            <div className="flex items-center gap-2">
                <div className={cn(
                    "flex items-center justify-center w-8 h-8 rounded-full",
                    config.bg
                )}>
                    <Icon className={cn("h-4 w-4", config.iconColor)} />
                </div>
                <div className="flex flex-col">
                    <span className={cn("text-xs font-medium opacity-70", config.text)}>
                        {timeState.label}
                    </span>
                    {timeState.status === 'paused' && timeState.nextSessionStartsIn && (
                        <span className="text-[10px] text-muted-foreground">
                            Next session starts {timeState.nextSessionIsToday ? 'today' : 'tomorrow'} in{' '}
                            <span className="font-mono tabular-nums text-primary">
                                {timeState.nextSessionStartsIn.hours > 0 && `${timeState.nextSessionStartsIn.hours}h `}
                                {timeState.nextSessionStartsIn.minutes}m {timeState.nextSessionStartsIn.seconds}s
                            </span>
                        </span>
                    )}
                </div>
            </div>

            {/* Middle: Time Remaining */}
            {(timeState.status === 'ongoing' || timeState.status === 'paused') && timeState.remaining && (
                <div className="flex flex-col items-center px-4 border-x border-border/20">
                    {/* Today's remaining (only if in session) */}
                    {timeState.isInSession && timeState.todayRemaining && (
                        <div className="flex flex-col items-center mb-1 pb-1 border-b border-border/20">
                            <span className="text-[9px] text-yellow-400 mb-0.5">Today Left</span>
                            <div className="flex items-baseline gap-0.5 font-mono tabular-nums text-sm text-yellow-400">
                                <span>{timeState.todayRemaining.hours.toString().padStart(2, '0')}:</span>
                                <span>{timeState.todayRemaining.minutes.toString().padStart(2, '0')}:</span>
                                <span className={cn(isSecondChanging && "scale-105")}>
                                    {timeState.todayRemaining.seconds.toString().padStart(2, '0')}
                                </span>
                            </div>
                        </div>
                    )}
                    <span className="text-[10px] text-muted-foreground mb-0.5">
                        {hasDailySession ? 'Total Session Left' : 'Time Remaining'}
                    </span>
                    <div className={cn(
                        "flex items-baseline gap-1 font-mono tabular-nums text-sm",
                        timeState.status === 'paused' ? 'opacity-60' : 'opacity-80'
                    )}>
                        {timeState.remaining.days > 0 && <span>{timeState.remaining.days}d</span>}
                        <span>{timeState.remaining.hours.toString().padStart(2, '0')}:</span>
                        <span>{timeState.remaining.minutes.toString().padStart(2, '0')}:</span>
                        <span className={cn(timeState.isInSession && isSecondChanging && "scale-105")}>
                            {timeState.remaining.seconds.toString().padStart(2, '0')}
                        </span>
                    </div>
                </div>
            )}

            {/* Right: Session Elapsed / Time Elapsed */}
            {timeState.status !== 'completed' ? (
                <div className="flex flex-col items-end">
                    {(timeState.status === 'ongoing' || timeState.status === 'paused') && (
                        <span className="text-[10px] text-muted-foreground mb-0.5">
                            {hasDailySession ? 'Session Elapsed' : 'Time Elapsed'}
                        </span>
                    )}
                    <div className={cn(
                        "flex items-baseline gap-1 font-mono tabular-nums",
                        timeState.status === 'paused' && 'opacity-60'
                    )}>
                        {timeState.days > 0 && (
                            <div className="flex flex-col items-center">
                                <span className={cn("text-xl font-bold", config.text)}>{timeState.days}</span>
                                <span className="text-[10px] text-muted-foreground">days</span>
                            </div>
                        )}
                        {timeState.days > 0 && <span className={cn("text-xl mx-0.5", config.text)}>:</span>}
                        <div className="flex flex-col items-center">
                            <span className={cn("text-xl font-bold", config.text)}>
                                {timeState.hours.toString().padStart(2, '0')}
                            </span>
                            <span className="text-[10px] text-muted-foreground">hrs</span>
                        </div>
                        <span className={cn("text-xl", config.text)}>:</span>
                        <div className="flex flex-col items-center">
                            <span className={cn("text-xl font-bold", config.text)}>
                                {timeState.minutes.toString().padStart(2, '0')}
                            </span>
                            <span className="text-[10px] text-muted-foreground">min</span>
                        </div>
                        <span className={cn("text-xl", config.text)}>:</span>
                        <div className="flex flex-col items-center">
                            <span className={cn(
                                "text-xl font-bold transition-all duration-150",
                                config.text,
                                timeState.isInSession && isSecondChanging && "scale-110"
                            )}>
                                {timeState.seconds.toString().padStart(2, '0')}
                            </span>
                            <span className="text-[10px] text-muted-foreground">sec</span>
                        </div>
                    </div>
                </div>
            ) : (
                <CheckCircle className="h-6 w-6 text-green-500" />
            )}
        </div>
    );
}
