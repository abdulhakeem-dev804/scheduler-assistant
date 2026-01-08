'use client';

import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Play, Clock, CheckCircle, AlertTriangle } from 'lucide-react';

interface EventCountdownProps {
    startDate: string;
    endDate: string;
    isCompleted?: boolean;
    className?: string;
    variant?: 'badge' | 'full' | 'compact';
}

interface TimeState {
    status: 'upcoming' | 'ongoing' | 'ended' | 'completed';
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
}

function calculateTimeState(startDate: string, endDate: string, isCompleted?: boolean): TimeState {
    const now = new Date().getTime();
    const start = new Date(startDate).getTime();
    const end = new Date(endDate).getTime();

    if (isCompleted) {
        return {
            status: 'completed',
            days: 0, hours: 0, minutes: 0, seconds: 0, totalMs: 0,
            label: 'Completed'
        };
    }

    if (now < start) {
        // Upcoming - show time until start
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
        // Ongoing - show time elapsed AND remaining
        const elapsed = now - start;
        const remaining = end - now;

        return {
            status: 'ongoing',
            // Elapsed time (Primary - Right side)
            days: Math.floor(elapsed / (1000 * 60 * 60 * 24)),
            hours: Math.floor((elapsed % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
            minutes: Math.floor((elapsed % (1000 * 60 * 60)) / (1000 * 60)),
            seconds: Math.floor((elapsed % (1000 * 60)) / 1000),
            totalMs: elapsed,
            label: 'In progress',
            // Remaining time (Secondary - Middle)
            remaining: {
                days: Math.floor(remaining / (1000 * 60 * 60 * 24)),
                hours: Math.floor((remaining % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
                minutes: Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60)),
                seconds: Math.floor((remaining % (1000 * 60)) / 1000),
            }
        };
    } else {
        // Ended - show time since end
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
    variant = 'badge'
}: EventCountdownProps) {
    const [timeState, setTimeState] = useState<TimeState>(() =>
        calculateTimeState(startDate, endDate, isCompleted)
    );
    const [isSecondChanging, setIsSecondChanging] = useState(false);

    useEffect(() => {
        if (isCompleted) return;

        const interval = setInterval(() => {
            setIsSecondChanging(true);
            setTimeout(() => setIsSecondChanging(false), 150);
            setTimeState(calculateTimeState(startDate, endDate, isCompleted));
        }, 1000);

        return () => clearInterval(interval);
    }, [startDate, endDate, isCompleted]);

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
                "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium font-mono tabular-nums border",
                config.bg, config.text, config.border,
                className
            )}>
                <Icon className={cn("h-3 w-3", config.iconColor)} />
                <span className="opacity-70">{timeState.label}</span>
                {timeState.status !== 'completed' && (
                    <>
                        {timeState.days > 0 && <span>{timeState.days}d</span>}
                        {(timeState.hours > 0 || timeState.days > 0) && <span>{timeState.hours}h</span>}
                        <span>{timeState.minutes}m</span>
                        <span className={cn(
                            "transition-all duration-150",
                            isSecondChanging && "scale-110 brightness-125"
                        )}>
                            {timeState.seconds.toString().padStart(2, '0')}s
                        </span>

                        {/* Remaining Time (for ongoing) */}
                        {timeState.status === 'ongoing' && timeState.remaining && (
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
                </div>
            </div>

            {/* Middle: Time Remaining (Only for Ongoing) */}
            {timeState.status === 'ongoing' && timeState.remaining && (
                <div className="flex flex-col items-end px-4 border-r border-border/10">
                    <span className="text-[10px] text-muted-foreground mb-0.5">Time Remaining</span>
                    <div className="flex items-baseline gap-1 font-mono tabular-nums text-sm opacity-80">
                        {timeState.remaining.days > 0 && <span>{timeState.remaining.days}d</span>}
                        <span>{timeState.remaining.hours.toString().padStart(2, '0')}:</span>
                        <span>{timeState.remaining.minutes.toString().padStart(2, '0')}:</span>
                        <span>{timeState.remaining.seconds.toString().padStart(2, '0')}</span>
                    </div>
                </div>
            )}

            {/* Right: Primary Time (Elapsed / Starts In / Ended Ago) */}

            {timeState.status !== 'completed' ? (
                <div className="flex flex-col items-end">
                    {timeState.status === 'ongoing' && (
                        <span className="text-[10px] text-muted-foreground mb-0.5">Time Elapsed</span>
                    )}
                    <div className="flex items-baseline gap-1 font-mono tabular-nums">
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
                                isSecondChanging && "scale-110"
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
