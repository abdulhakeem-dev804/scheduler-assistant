'use client';

import { useState, useEffect, useRef } from 'react';
import { ChevronDown, ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, isToday, isPast, addMonths, subMonths, startOfWeek, endOfWeek } from 'date-fns';

interface SmartDatePickerProps {
    value: string | null; // yyyy-MM-dd format
    onChange: (date: string) => void;
    label?: string;
    className?: string;
}

export function SmartDatePicker({
    value,
    onChange,
    label = 'Date',
    className,
}: SmartDatePickerProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [viewDate, setViewDate] = useState(new Date());
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSelect = (date: Date) => {
        onChange(format(date, 'yyyy-MM-dd'));
        setIsOpen(false);
    };

    // Get calendar days including padding days from prev/next months
    const monthStart = startOfMonth(viewDate);
    const monthEnd = endOfMonth(viewDate);
    const calendarStart = startOfWeek(monthStart);
    const calendarEnd = endOfWeek(monthEnd);
    const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

    const selectedDate = value ? new Date(value) : null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const weekDays = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

    return (
        <div className={cn("relative", className)} ref={dropdownRef}>
            {/* Trigger Button */}
            <button
                type="button"
                onClick={() => {
                    if (!isOpen) {
                        // Reset view to current value or today when opening
                        setViewDate(value ? new Date(value) : new Date());
                    }
                    setIsOpen(!isOpen);
                }}
                className={cn(
                    "w-full flex items-center justify-between px-3 py-2 rounded-md border transition-all duration-200",
                    "bg-background hover:bg-accent/50",
                    isOpen ? "border-primary ring-2 ring-primary/20" : "border-input",
                    !value && "text-muted-foreground"
                )}
            >
                <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span>
                        {value ? format(new Date(value), 'MMM d, yyyy') : `Select ${label}`}
                    </span>
                </div>
                <ChevronDown className={cn(
                    "h-4 w-4 transition-transform duration-200",
                    isOpen && "rotate-180"
                )} />
            </button>

            {/* Calendar Dropdown */}
            {isOpen && (
                <div className={cn(
                    "absolute z-50 mt-1 w-[280px] p-3",
                    "bg-popover border border-border rounded-lg shadow-xl",
                    "animate-in fade-in-0 zoom-in-95 duration-200"
                )}>
                    {/* Month Navigation */}
                    <div className="flex items-center justify-between mb-3">
                        <button
                            type="button"
                            onClick={() => setViewDate(subMonths(viewDate, 1))}
                            className="p-1 hover:bg-accent rounded-md transition-colors"
                        >
                            <ChevronLeft className="h-4 w-4" />
                        </button>
                        <span className="font-medium">
                            {format(viewDate, 'MMMM yyyy')}
                        </span>
                        <button
                            type="button"
                            onClick={() => setViewDate(addMonths(viewDate, 1))}
                            className="p-1 hover:bg-accent rounded-md transition-colors"
                        >
                            <ChevronRight className="h-4 w-4" />
                        </button>
                    </div>

                    {/* Week Days Header */}
                    <div className="grid grid-cols-7 gap-1 mb-1">
                        {weekDays.map((day) => (
                            <div
                                key={day}
                                className="text-center text-xs font-medium text-muted-foreground py-1"
                            >
                                {day}
                            </div>
                        ))}
                    </div>

                    {/* Calendar Grid */}
                    <div className="grid grid-cols-7 gap-1">
                        {calendarDays.map((day, index) => {
                            const isCurrentMonth = isSameMonth(day, viewDate);
                            const isSelected = selectedDate && isSameDay(day, selectedDate);
                            const isTodayDate = isToday(day);
                            const isPastDate = day < today;
                            const isDisabled = isPastDate;

                            return (
                                <button
                                    key={index}
                                    type="button"
                                    disabled={isDisabled}
                                    onClick={() => handleSelect(day)}
                                    className={cn(
                                        "h-8 w-8 text-sm rounded-md transition-all duration-150",
                                        "hover:scale-110 active:scale-95",
                                        // Not current month
                                        !isCurrentMonth && "text-muted-foreground/40",
                                        // Selected
                                        isSelected && "bg-primary text-primary-foreground font-medium",
                                        // Today (not selected)
                                        isTodayDate && !isSelected && "border border-primary text-primary font-medium",
                                        // Normal hover
                                        !isSelected && !isDisabled && "hover:bg-accent",
                                        // Disabled (past)
                                        isDisabled && "opacity-30 cursor-not-allowed line-through"
                                    )}
                                >
                                    {format(day, 'd')}
                                </button>
                            );
                        })}
                    </div>

                    {/* Quick Actions */}
                    <div className="flex gap-2 mt-3 pt-3 border-t border-border">
                        <button
                            type="button"
                            onClick={() => handleSelect(new Date())}
                            className={cn(
                                "flex-1 py-1.5 text-xs rounded-md transition-colors",
                                "bg-primary/10 text-primary hover:bg-primary/20 font-medium"
                            )}
                        >
                            Today
                        </button>
                        <button
                            type="button"
                            onClick={() => handleSelect(new Date(Date.now() + 86400000))}
                            className={cn(
                                "flex-1 py-1.5 text-xs rounded-md transition-colors",
                                "bg-accent hover:bg-accent/80"
                            )}
                        >
                            Tomorrow
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
