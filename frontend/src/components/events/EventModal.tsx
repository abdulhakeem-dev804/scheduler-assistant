'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format, parseISO } from 'date-fns';
import { useEffect, useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Event, CreateEventInput, EventCategory, Priority, Subtask } from '@/types';
import { Trash2, Clock, Calendar } from 'lucide-react';
import { SubtaskList } from './SubtaskList';
import { SmartTimePicker } from './SmartTimePicker';
import { SmartDatePicker } from './SmartDatePicker';
import { EventCountdown } from './EventCountdown';
import { endOfMonth } from 'date-fns';

const eventSchema = z.object({
    title: z.string().min(1, 'Title is required').max(100, 'Title too long'),
    description: z.string().max(500, 'Description too long').optional(),
    startDate: z.string().optional(),
    startTime: z.string().optional(),
    endDate: z.string().optional(),
    endTime: z.string().optional(),
    category: z.enum(['work', 'personal', 'health', 'learning', 'finance', 'social']),
    priority: z.enum(['high', 'medium', 'low']),
    isRecurring: z.boolean(),
    useDailyTime: z.boolean(),  // When true, startTime/endTime represent daily window
}).refine((data) => {
    // Only validate if both start and end are provided
    if (!data.startDate || !data.startTime || !data.endDate || !data.endTime) return true;
    const start = new Date(`${data.startDate}T${data.startTime}`);
    const end = new Date(`${data.endDate}T${data.endTime}`);
    return end > start;
}, {
    message: "End time must be after start time",
    path: ["endTime"],
});

type EventFormData = z.infer<typeof eventSchema>;

interface EventModalProps {
    isOpen: boolean;
    onClose: () => void;
    event?: Event | null;
    defaultDate?: Date;
    onSave: (data: CreateEventInput) => void;
    onDelete?: (id: string) => void;
    existingEvents?: Event[]; // For conflict detection
}

// Extract time slots from existing events for conflict visualization
function getOccupiedSlots(events: Event[], selectedDate: string, excludeEventId?: string) {
    return events
        .filter(e => {
            if (excludeEventId && e.id === excludeEventId) return false;
            if (e.isCompleted) return false;
            if (e.timingMode === 'anytime') return false;
            const eventDate = e.startDate.split('T')[0];
            return eventDate === selectedDate;
        })
        .map(e => ({
            start: format(new Date(e.startDate), 'HH:mm'),
            end: format(new Date(e.endDate), 'HH:mm'),
            title: e.title,
        }));
}

export function EventModal({
    isOpen,
    onClose,
    event,
    defaultDate,
    onSave,
    onDelete,
    existingEvents = [],
}: EventModalProps) {
    const isEditing = !!event;
    const [subtasks, setSubtasks] = useState<Subtask[]>([]);

    const getDefaultValues = (): EventFormData => {
        if (event) {
            // Extract date and time directly from ISO string to avoid timezone conversion
            // This preserves the exact time values as stored, regardless of browser timezone
            const extractDateTime = (isoString: string) => {
                // Handle both formats: "2026-01-21T10:00:00" and "2026-01-21T10:00:00.000Z"
                const match = isoString.match(/^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})/);
                if (match) {
                    return { date: match[1], time: match[2] };
                }
                // Fallback to Date parsing if format doesn't match
                const d = parseISO(isoString);
                return { date: format(d, 'yyyy-MM-dd'), time: format(d, 'HH:mm') };
            };

            const start = extractDateTime(event.startDate);
            const end = extractDateTime(event.endDate);

            return {
                title: event.title,
                description: event.description || '',
                startDate: start.date,
                startTime: start.time,
                endDate: end.date,
                endTime: end.time,
                category: event.category,
                priority: event.priority,
                isRecurring: event.isRecurring,
                useDailyTime: !!(event.dailyStartTime && event.dailyEndTime),
            };
        }

        // For new events: use defaultDate if provided (from calendar click)
        const clickedDate = defaultDate ? format(defaultDate, 'yyyy-MM-dd') : '';
        const clickedTime = defaultDate ? format(defaultDate, 'HH:mm') : '';

        // Calculate default end time (start + 1 hour)
        let defaultEndTime = '';
        if (clickedTime) {
            const [h, m] = clickedTime.split(':').map(Number);
            const endH = (h + 1) % 24;
            defaultEndTime = `${endH.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
        }

        return {
            title: '',
            description: '',
            startDate: clickedDate,
            startTime: clickedTime,
            endDate: clickedDate,
            endTime: defaultEndTime,
            category: 'work',
            priority: 'medium',
            isRecurring: false,
            useDailyTime: false,
        };
    };

    const form = useForm<EventFormData>({
        resolver: zodResolver(eventSchema),
        defaultValues: getDefaultValues(),
    });

    useEffect(() => {
        if (isOpen) {
            form.reset(getDefaultValues());
            setSubtasks(event?.subtasks || []);
        }
    }, [isOpen, event?.id, defaultDate]);

    // Watch date values for occupied slots
    const watchStartDate = form.watch('startDate');
    const watchEndDate = form.watch('endDate');

    // Get occupied slots for selected dates
    const startOccupiedSlots = watchStartDate
        ? getOccupiedSlots(existingEvents, watchStartDate, event?.id)
        : [];
    const endOccupiedSlots = watchEndDate
        ? getOccupiedSlots(existingEvents, watchEndDate, event?.id)
        : [];

    const handleSubmit = (data: EventFormData) => {
        const now = new Date();
        const monthEnd = endOfMonth(now);

        // Smart defaults: current time for start, month end 23:59 for end
        const finalStartDate = data.startDate || format(now, 'yyyy-MM-dd');
        const finalStartTime = data.startTime || format(now, 'HH:mm');
        const finalEndDate = data.endDate || format(monthEnd, 'yyyy-MM-dd');
        const finalEndTime = data.endTime || '23:59';

        const startISO = `${finalStartDate}T${finalStartTime}:00`;
        const endISO = `${finalEndDate}T${finalEndTime}:00`;

        onSave({
            title: data.title,
            description: data.description,
            startDate: startISO,
            endDate: endISO,
            category: data.category as EventCategory,
            priority: data.priority as Priority,
            isRecurring: data.isRecurring,
            subtasks: subtasks,
            timingMode: 'specific',
            // When daily time is enabled, use the start/end times as daily window
            dailyStartTime: data.useDailyTime && finalStartTime ? finalStartTime : undefined,
            dailyEndTime: data.useDailyTime && finalEndTime ? finalEndTime : undefined,
        });

        form.reset();
        onClose();
    };

    const handleDelete = () => {
        if (event && onDelete) {
            onDelete(event.id);
            onClose();
        }
    };

    // Auto-set end date when start date is selected
    const handleStartDateChange = (date: string) => {
        form.setValue('startDate', date);
        if (!form.getValues('endDate')) {
            form.setValue('endDate', date);
        }
    };

    // Auto-set end time 1 hour after start time
    const handleStartTimeChange = (time: string) => {
        form.setValue('startTime', time);
        if (!form.getValues('endTime')) {
            const [hours, minutes] = time.split(':').map(Number);
            const endHours = (hours + 1) % 24;
            form.setValue('endTime', `${endHours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{isEditing ? 'Edit Event' : 'New Event'}</DialogTitle>
                </DialogHeader>

                <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                    {/* Title */}
                    <div className="space-y-2">
                        <Label htmlFor="title">Title</Label>
                        <Input
                            id="title"
                            placeholder="Event title"
                            {...form.register('title')}
                        />
                        {form.formState.errors.title && (
                            <p className="text-sm text-destructive">
                                {form.formState.errors.title.message}
                            </p>
                        )}
                    </div>

                    {/* Description */}
                    <div className="space-y-2">
                        <Label htmlFor="description">Description</Label>
                        <Textarea
                            id="description"
                            placeholder="Add a description..."
                            rows={3}
                            {...form.register('description')}
                        />
                    </div>

                    {/* Date and Time - Smart Pickers */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Start Date</Label>
                            <SmartDatePicker
                                value={form.watch('startDate') || null}
                                onChange={handleStartDateChange}
                                label="Start Date"
                            />
                            {form.formState.errors.startDate && (
                                <p className="text-sm text-destructive">
                                    {form.formState.errors.startDate.message}
                                </p>
                            )}
                        </div>
                        <div className="space-y-2">
                            <Label>Start Time</Label>
                            <SmartTimePicker
                                value={form.watch('startTime') || null}
                                onChange={handleStartTimeChange}
                                label="start"
                                selectedDate={form.watch('startDate') || new Date().toISOString().split('T')[0]}
                                occupiedSlots={startOccupiedSlots}
                            />
                            {form.formState.errors.startTime && (
                                <p className="text-sm text-destructive">
                                    {form.formState.errors.startTime.message}
                                </p>
                            )}
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>End Date</Label>
                            <SmartDatePicker
                                value={form.watch('endDate') || null}
                                onChange={(date) => form.setValue('endDate', date)}
                                label="End Date"
                            />
                            {form.formState.errors.endDate && (
                                <p className="text-sm text-destructive">
                                    {form.formState.errors.endDate.message}
                                </p>
                            )}
                        </div>
                        <div className="space-y-2">
                            <Label>End Time</Label>
                            <SmartTimePicker
                                value={form.watch('endTime') || null}
                                onChange={(time) => form.setValue('endTime', time)}
                                label="end"
                                selectedDate={form.watch('endDate') || new Date().toISOString().split('T')[0]}
                                occupiedSlots={endOccupiedSlots}
                            />
                            {form.formState.errors.endTime && (
                                <p className="text-sm text-destructive">
                                    {form.formState.errors.endTime.message}
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Daily Time Control - Only show for multi-day events */}
                    {form.watch('startDate') && form.watch('endDate') &&
                        form.watch('startDate') !== form.watch('endDate') && (
                            <div className="flex items-center space-x-2 p-2 rounded-lg bg-muted/30 border border-border/50">
                                <Checkbox
                                    id="useDailyTime"
                                    checked={form.watch('useDailyTime')}
                                    onCheckedChange={(checked) =>
                                        form.setValue('useDailyTime', checked === true)
                                    }
                                />
                                <div className="flex-1">
                                    <Label htmlFor="useDailyTime" className="cursor-pointer text-sm">
                                        Use specific daily time window
                                    </Label>
                                    <p className="text-xs text-muted-foreground">
                                        {form.watch('useDailyTime')
                                            ? `Event shows ${form.watch('startTime') || 'start'} - ${form.watch('endTime') || 'end'} each day`
                                            : 'Event spans full days on calendar'
                                        }
                                    </p>
                                </div>
                            </div>
                        )}

                    {/* Live Countdown Timer */}
                    {(form.watch('startDate') && form.watch('startTime') && form.watch('endDate') && form.watch('endTime')) && (
                        <EventCountdown
                            startDate={`${form.watch('startDate')}T${form.watch('startTime')}:00`}
                            endDate={`${form.watch('endDate')}T${form.watch('endTime')}:00`}
                            isCompleted={event?.isCompleted}
                            variant="full"
                            dailyStartTime={form.watch('useDailyTime') ? form.watch('startTime') : undefined}
                            dailyEndTime={form.watch('useDailyTime') ? form.watch('endTime') : undefined}
                        />
                    )}

                    {/* Category and Priority */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Category</Label>
                            <Select
                                value={form.watch('category')}
                                onValueChange={(value) => form.setValue('category', value as EventCategory)}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select category" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="work">💼 Work</SelectItem>
                                    <SelectItem value="personal">👤 Personal</SelectItem>
                                    <SelectItem value="health">❤️ Health</SelectItem>
                                    <SelectItem value="learning">📚 Learning</SelectItem>
                                    <SelectItem value="finance">💰 Finance</SelectItem>
                                    <SelectItem value="social">👥 Social</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Priority</Label>
                            <Select
                                value={form.watch('priority')}
                                onValueChange={(value) => form.setValue('priority', value as Priority)}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select priority" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="high">🔴 High</SelectItem>
                                    <SelectItem value="medium">🟡 Medium</SelectItem>
                                    <SelectItem value="low">🟢 Low</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {/* Recurring */}
                    <div className="flex items-center space-x-2">
                        <Checkbox
                            id="recurring"
                            checked={form.watch('isRecurring')}
                            onCheckedChange={(checked) =>
                                form.setValue('isRecurring', checked === true)
                            }
                        />
                        <Label htmlFor="recurring" className="cursor-pointer">
                            Recurring event
                        </Label>
                    </div>

                    {/* Subtasks */}
                    <SubtaskList subtasks={subtasks} onChange={setSubtasks} />

                    <DialogFooter className="flex gap-2">
                        {isEditing && onDelete && (
                            <Button
                                type="button"
                                variant="destructive"
                                onClick={handleDelete}
                                className="mr-auto"
                            >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                            </Button>
                        )}
                        <Button type="button" variant="outline" onClick={onClose}>
                            Cancel
                        </Button>
                        <Button type="submit">
                            {isEditing ? 'Save Changes' : 'Create Event'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
