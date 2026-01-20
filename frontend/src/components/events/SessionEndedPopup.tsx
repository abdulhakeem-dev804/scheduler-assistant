'use client';

import { useState } from 'react';
import { Event } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle2, XCircle, SkipForward, Clock, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

interface SessionEndedPopupProps {
    event: Event;
    sessionDate: string;  // YYYY-MM-DD
    onMarkAttended: () => void;
    onMarkMissed: () => void;
    onSkip: () => void;
    onDismiss: () => void;
}

export function SessionEndedPopup({
    event,
    sessionDate,
    onMarkAttended,
    onMarkMissed,
    onSkip,
    onDismiss,
}: SessionEndedPopupProps) {
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleAction = async (action: () => void) => {
        setIsSubmitting(true);
        try {
            await action();
        } finally {
            setIsSubmitting(false);
        }
    };

    // Format the session time
    const sessionTime = event.dailyStartTime && event.dailyEndTime
        ? `${event.dailyStartTime} - ${event.dailyEndTime}`
        : '';

    // Format the date
    const formattedDate = (() => {
        try {
            const date = new Date(sessionDate);
            const today = new Date();
            const yesterday = new Date(today);
            yesterday.setDate(yesterday.getDate() - 1);

            if (date.toDateString() === today.toDateString()) {
                return 'Today';
            } else if (date.toDateString() === yesterday.toDateString()) {
                return 'Yesterday';
            }
            return format(date, 'MMM d, yyyy');
        } catch {
            return sessionDate;
        }
    })();

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <Card className="w-full max-w-md mx-4 bg-card border-primary/20 shadow-2xl animate-in zoom-in-95 duration-200">
                <CardHeader className="relative pb-3">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="absolute right-2 top-2 h-8 w-8 rounded-full"
                        onClick={onDismiss}
                    >
                        <X className="h-4 w-4" />
                    </Button>
                    <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10">
                            <Clock className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                            <CardTitle className="text-lg">Session Ended</CardTitle>
                            <p className="text-sm text-muted-foreground">{formattedDate}</p>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    {/* Event Info */}
                    <div className="p-3 rounded-lg bg-muted/50 border border-border/50">
                        <h3 className="font-semibold text-foreground">{event.title}</h3>
                        {sessionTime && (
                            <p className="text-sm text-muted-foreground mt-1">
                                {sessionTime}
                            </p>
                        )}
                    </div>

                    {/* Question */}
                    <p className="text-center text-muted-foreground">
                        Did you complete this session?
                    </p>

                    {/* Action Buttons */}
                    <div className="grid grid-cols-3 gap-2">
                        <Button
                            variant="outline"
                            className={cn(
                                "flex-col h-auto py-3 gap-1.5",
                                "hover:bg-emerald-500/10 hover:border-emerald-500/50 hover:text-emerald-500"
                            )}
                            onClick={() => handleAction(onMarkAttended)}
                            disabled={isSubmitting}
                        >
                            <CheckCircle2 className="h-6 w-6 text-emerald-500" />
                            <span className="text-xs">Yes!</span>
                        </Button>

                        <Button
                            variant="outline"
                            className={cn(
                                "flex-col h-auto py-3 gap-1.5",
                                "hover:bg-red-500/10 hover:border-red-500/50 hover:text-red-500"
                            )}
                            onClick={() => handleAction(onMarkMissed)}
                            disabled={isSubmitting}
                        >
                            <XCircle className="h-6 w-6 text-red-500" />
                            <span className="text-xs">Missed</span>
                        </Button>

                        <Button
                            variant="outline"
                            className={cn(
                                "flex-col h-auto py-3 gap-1.5",
                                "hover:bg-yellow-500/10 hover:border-yellow-500/50 hover:text-yellow-500"
                            )}
                            onClick={() => handleAction(onSkip)}
                            disabled={isSubmitting}
                        >
                            <SkipForward className="h-6 w-6 text-yellow-500" />
                            <span className="text-xs">Skip</span>
                        </Button>
                    </div>

                    <p className="text-xs text-center text-muted-foreground/70">
                        You can change this later in the session history
                    </p>
                </CardContent>
            </Card>
        </div>
    );
}
