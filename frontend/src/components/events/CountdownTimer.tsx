'use client';

import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface CountdownTimerProps {
    targetDate: string; // ISO date string
    className?: string;
    onExpire?: () => void;
}

interface TimeRemaining {
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
    total: number;
    isExpired: boolean;
}

function calculateTimeRemaining(targetDate: string): TimeRemaining {
    const now = new Date().getTime();
    const target = new Date(targetDate).getTime();
    const difference = target - now;

    if (difference <= 0) {
        return { days: 0, hours: 0, minutes: 0, seconds: 0, total: 0, isExpired: true };
    }

    return {
        days: Math.floor(difference / (1000 * 60 * 60 * 24)),
        hours: Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
        minutes: Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((difference % (1000 * 60)) / 1000),
        total: difference,
        isExpired: false,
    };
}

export function CountdownTimer({ targetDate, className, onExpire }: CountdownTimerProps) {
    const [timeRemaining, setTimeRemaining] = useState<TimeRemaining>(() =>
        calculateTimeRemaining(targetDate)
    );

    useEffect(() => {
        const interval = setInterval(() => {
            const newTime = calculateTimeRemaining(targetDate);
            setTimeRemaining(newTime);

            if (newTime.isExpired && onExpire) {
                onExpire();
                clearInterval(interval);
            }
        }, 1000);

        return () => clearInterval(interval);
    }, [targetDate, onExpire]);

    if (timeRemaining.isExpired) {
        return (
            <span className={cn("text-destructive font-medium", className)}>
                Overdue
            </span>
        );
    }

    // Format: Show days only if > 0, otherwise show hours:minutes:seconds
    const parts: string[] = [];

    if (timeRemaining.days > 0) {
        parts.push(`${timeRemaining.days}d`);
    }
    if (timeRemaining.hours > 0 || timeRemaining.days > 0) {
        parts.push(`${timeRemaining.hours}h`);
    }
    parts.push(`${timeRemaining.minutes.toString().padStart(2, '0')}m`);
    parts.push(`${timeRemaining.seconds.toString().padStart(2, '0')}s`);

    // Color coding based on urgency
    const urgencyClass =
        timeRemaining.total < 1000 * 60 * 60 // Less than 1 hour
            ? 'text-red-500'
            : timeRemaining.total < 1000 * 60 * 60 * 24 // Less than 24 hours
                ? 'text-yellow-500'
                : 'text-green-500';

    return (
        <span
            className={cn(
                "font-mono text-sm font-medium tabular-nums",
                urgencyClass,
                className
            )}
        >
            {parts.join(' ')}
        </span>
    );
}

// Compact version for event cards - with animated seconds
export function CountdownBadge({ targetDate, className }: { targetDate: string; className?: string }) {
    const [timeRemaining, setTimeRemaining] = useState<TimeRemaining>(() =>
        calculateTimeRemaining(targetDate)
    );
    const [isSecondChanging, setIsSecondChanging] = useState(false);

    useEffect(() => {
        const interval = setInterval(() => {
            setIsSecondChanging(true);
            setTimeout(() => setIsSecondChanging(false), 150);
            setTimeRemaining(calculateTimeRemaining(targetDate));
        }, 1000);
        return () => clearInterval(interval);
    }, [targetDate]);

    if (timeRemaining.isExpired) {
        return (
            <span className={cn(
                "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-500/20 text-red-500",
                className
            )}>
                Overdue
            </span>
        );
    }

    // Always show seconds with animation for accurate countdown
    const urgencyClass =
        timeRemaining.total < 1000 * 60 * 60
            ? 'bg-red-500/20 text-red-500'
            : timeRemaining.total < 1000 * 60 * 60 * 24
                ? 'bg-yellow-500/20 text-yellow-500'
                : 'bg-green-500/20 text-green-500';

    return (
        <span
            className={cn(
                "inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-xs font-medium font-mono tabular-nums",
                urgencyClass,
                className
            )}
        >
            <span className="mr-0.5">⏱️</span>
            {timeRemaining.days > 0 && (
                <span>{timeRemaining.days}d </span>
            )}
            {(timeRemaining.hours > 0 || timeRemaining.days > 0) && (
                <span>{timeRemaining.hours}h </span>
            )}
            <span>{timeRemaining.minutes}m </span>
            <span
                className={cn(
                    "inline-block transition-all duration-150",
                    isSecondChanging && "scale-110 text-white"
                )}
            >
                {timeRemaining.seconds.toString().padStart(2, '0')}s
            </span>
        </span>
    );
}

