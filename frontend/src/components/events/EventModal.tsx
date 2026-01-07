'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format } from 'date-fns';
import { useEffect } from 'react';
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
import { Event, CreateEventInput, EventCategory, Priority } from '@/types';
import { Trash2 } from 'lucide-react';

const eventSchema = z.object({
    title: z.string().min(1, 'Title is required').max(100, 'Title too long'),
    description: z.string().max(500, 'Description too long').optional(),
    startDate: z.string(),
    startTime: z.string(),
    endDate: z.string(),
    endTime: z.string(),
    category: z.enum(['work', 'personal', 'health', 'learning', 'finance', 'social']),
    priority: z.enum(['high', 'medium', 'low']),
    isRecurring: z.boolean(),
}).refine((data) => {
    // Validate: End datetime must be after start datetime
    const start = new Date(`${data.startDate}T${data.startTime}`);
    const end = new Date(`${data.endDate}T${data.endTime}`);
    return end > start;
}, {
    message: "End time must be after start time",
    path: ["endTime"],
}).refine((data) => {
    // Validate: Can't schedule in the past (allow today)
    const start = new Date(`${data.startDate}T${data.startTime}`);
    const now = new Date();
    // Allow events starting today or in the future
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startDay = new Date(start.getFullYear(), start.getMonth(), start.getDate());
    return startDay >= today;
}, {
    message: "Cannot schedule events in the past",
    path: ["startDate"],
});

type EventFormData = z.infer<typeof eventSchema>;

interface EventModalProps {
    isOpen: boolean;
    onClose: () => void;
    event?: Event | null;
    defaultDate?: Date;
    onSave: (data: CreateEventInput) => void;
    onDelete?: (id: string) => void;
}

export function EventModal({
    isOpen,
    onClose,
    event,
    defaultDate,
    onSave,
    onDelete,
}: EventModalProps) {
    const isEditing = !!event;

    const getDefaultValues = (): EventFormData => {
        if (event) {
            const startDate = new Date(event.startDate);
            const endDate = new Date(event.endDate);
            return {
                title: event.title,
                description: event.description || '',
                startDate: format(startDate, 'yyyy-MM-dd'),
                startTime: format(startDate, 'HH:mm'),
                endDate: format(endDate, 'yyyy-MM-dd'),
                endTime: format(endDate, 'HH:mm'),
                category: event.category,
                priority: event.priority,
                isRecurring: event.isRecurring,
            };
        }

        const date = defaultDate || new Date();
        return {
            title: '',
            description: '',
            startDate: format(date, 'yyyy-MM-dd'),
            startTime: format(date, 'HH:mm'),
            endDate: format(date, 'yyyy-MM-dd'),
            endTime: format(new Date(date.getTime() + 60 * 60 * 1000), 'HH:mm'),
            category: 'work',
            priority: 'medium',
            isRecurring: false,
        };
    };

    const form = useForm<EventFormData>({
        resolver: zodResolver(eventSchema),
        defaultValues: getDefaultValues(),
    });

    // Reset form when modal opens with new event or date
    useEffect(() => {
        if (isOpen) {
            form.reset(getDefaultValues());
        }
    }, [isOpen, event?.id, defaultDate]);

    const handleSubmit = (data: EventFormData) => {
        // Create dates preserving local timezone
        const startDateTime = new Date(`${data.startDate}T${data.startTime}:00`);
        const endDateTime = new Date(`${data.endDate}T${data.endTime}:00`);

        // Get timezone offset and adjust to keep the intended local time
        const tzOffset = startDateTime.getTimezoneOffset() * 60000;

        // Store as ISO string but adjusted for timezone
        // This ensures the date shows correctly regardless of timezone
        const startISO = new Date(startDateTime.getTime() - tzOffset).toISOString();
        const endISO = new Date(endDateTime.getTime() - tzOffset).toISOString();

        onSave({
            title: data.title,
            description: data.description,
            startDate: startISO,
            endDate: endISO,
            category: data.category as EventCategory,
            priority: data.priority as Priority,
            isRecurring: data.isRecurring,
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

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[500px]">
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

                    {/* Date and Time */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="startDate">Start Date</Label>
                            <Input type="date" id="startDate" {...form.register('startDate')} />
                            {form.formState.errors.startDate && (
                                <p className="text-sm text-destructive">
                                    {form.formState.errors.startDate.message}
                                </p>
                            )}
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="startTime">Start Time</Label>
                            <Input type="time" id="startTime" {...form.register('startTime')} />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="endDate">End Date</Label>
                            <Input type="date" id="endDate" {...form.register('endDate')} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="endTime">End Time</Label>
                            <Input type="time" id="endTime" {...form.register('endTime')} />
                            {form.formState.errors.endTime && (
                                <p className="text-sm text-destructive">
                                    {form.formState.errors.endTime.message}
                                </p>
                            )}
                        </div>
                    </div>

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
