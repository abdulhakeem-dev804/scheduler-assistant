'use client';

import { useState } from 'react';
import { format, addDays } from 'date-fns';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Event, Resolution } from '@/types';
import { CheckCircle2, XCircle, CalendarPlus, Clock } from 'lucide-react';
import { SmartDatePicker } from './SmartDatePicker';
import { SmartTimePicker } from './SmartTimePicker';
import { CountdownTimer } from './CountdownTimer';

interface ResolutionModalProps {
    isOpen: boolean;
    onClose: () => void;
    event: Event | null;
    onResolve: (eventId: string, resolution: Resolution, newEndDate?: string) => void;
}

export function ResolutionModal({ isOpen, onClose, event, onResolve }: ResolutionModalProps) {
    const [showReschedule, setShowReschedule] = useState(false);
    const [customDate, setCustomDate] = useState<string>('');
    const [customTime, setCustomTime] = useState<string>('');

    if (!event) return null;

    const handleComplete = () => {
        onResolve(event.id, 'completed');
        onClose();
    };

    const handleMissed = () => {
        onResolve(event.id, 'missed');
        onClose();
    };

    const handleReschedule = (days: number) => {
        const newEndDate = addDays(new Date(event.endDate), days);
        onResolve(event.id, 'rescheduled', newEndDate.toISOString());
        setShowReschedule(false);
        onClose();
    };

    const handleCustomReschedule = () => {
        if (!customDate || !customTime) return;
        const newEndDate = new Date(`${customDate}T${customTime}:00`);
        onResolve(event.id, 'rescheduled', newEndDate.toISOString());
        setShowReschedule(false);
        onClose();
    };

    const eventEndDate = new Date(event.endDate);
    const isOverdue = eventEndDate < new Date();

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[400px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Clock className="h-5 w-5 text-yellow-500" />
                        Task Resolution
                    </DialogTitle>
                    <DialogDescription>
                        This task's deadline has passed. What happened?
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    {/* Event Info */}
                    <div className="p-4 rounded-lg bg-muted/50 space-y-2">
                        <h3 className="font-semibold text-lg">{event.title}</h3>
                        <p className="text-sm text-muted-foreground">
                            Due: {format(eventEndDate, 'PPP p')}
                        </p>
                        {isOverdue && (
                            <div className="flex items-center gap-2 text-sm text-destructive">
                                <span>Overdue by:</span>
                                <CountdownTimer targetDate={event.endDate} />
                            </div>
                        )}
                    </div>

                    {!showReschedule ? (
                        /* Main Options */
                        <div className="grid gap-3">
                            <Button
                                variant="default"
                                className="w-full justify-start gap-3 h-12 bg-green-600 hover:bg-green-700"
                                onClick={handleComplete}
                            >
                                <CheckCircle2 className="h-5 w-5" />
                                <div className="text-left">
                                    <div className="font-medium">I finished it</div>
                                    <div className="text-xs opacity-80">Mark as completed</div>
                                </div>
                            </Button>

                            <Button
                                variant="outline"
                                className="w-full justify-start gap-3 h-12 border-yellow-500/50 hover:bg-yellow-500/10"
                                onClick={() => setShowReschedule(true)}
                            >
                                <CalendarPlus className="h-5 w-5 text-yellow-500" />
                                <div className="text-left">
                                    <div className="font-medium">I need more time</div>
                                    <div className="text-xs text-muted-foreground">Reschedule the deadline</div>
                                </div>
                            </Button>

                            <Button
                                variant="outline"
                                className="w-full justify-start gap-3 h-12 border-red-500/50 hover:bg-red-500/10"
                                onClick={handleMissed}
                            >
                                <XCircle className="h-5 w-5 text-red-500" />
                                <div className="text-left">
                                    <div className="font-medium">I missed it</div>
                                    <div className="text-xs text-muted-foreground">Mark as incomplete</div>
                                </div>
                            </Button>
                        </div>
                    ) : (
                        /* Reschedule Options */
                        <div className="space-y-4">
                            <div className="space-y-3">
                                <p className="text-sm font-medium">Extend deadline by:</p>
                                <div className="grid grid-cols-3 gap-2">
                                    {[
                                        { days: 1, label: '+1 Day' },
                                        { days: 2, label: '+2 Days' },
                                        { days: 3, label: '+3 Days' },
                                        { days: 7, label: '+1 Week' },
                                        { days: 14, label: '+2 Weeks' },
                                        { days: 30, label: '+1 Month' },
                                    ].map(({ days, label }) => (
                                        <Button
                                            key={days}
                                            variant="outline"
                                            size="sm"
                                            onClick={() => handleReschedule(days)}
                                        >
                                            {label}
                                        </Button>
                                    ))}
                                </div>
                            </div>

                            {/* Custom Deadline Section */}
                            <div className="space-y-3 pt-2 border-t">
                                <p className="text-sm font-medium">Or choose specific deadline:</p>
                                <div className="grid grid-cols-2 gap-2">
                                    <SmartDatePicker
                                        value={customDate}
                                        onChange={setCustomDate}
                                        label="Pick date"
                                    />
                                    <SmartTimePicker
                                        value={customTime}
                                        onChange={setCustomTime}
                                        label="end"
                                        selectedDate={customDate}
                                    />
                                </div>
                                <Button
                                    className="w-full"
                                    disabled={!customDate || !customTime}
                                    onClick={handleCustomReschedule}
                                >
                                    Set New Deadline
                                </Button>
                            </div>

                            <Button
                                variant="ghost"
                                className="w-full"
                                onClick={() => setShowReschedule(false)}
                            >
                                ← Back
                            </Button>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
