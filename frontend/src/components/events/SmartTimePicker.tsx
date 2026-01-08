'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { ChevronDown, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface OccupiedSlot {
    start: string;
    end: string;
    title: string;
}

interface SmartTimePickerProps {
    value: string | null;
    onChange: (time: string) => void;
    label: 'start' | 'end';
    selectedDate: string;
    occupiedSlots?: OccupiedSlot[];
    className?: string;
}

// Tick sound for scroll feedback
function playTickSound() {
    try {
        const audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        oscillator.frequency.value = 1200;
        oscillator.type = 'sine';
        gainNode.gain.value = 0.03;

        oscillator.start();
        oscillator.stop(audioContext.currentTime + 0.02);
    } catch {
        // Audio not supported, silently fail
    }
}

// Haptic vibration for scroll feedback
function triggerHaptic() {
    if ('vibrate' in navigator) {
        navigator.vibrate(5);
    }
}

interface WheelPickerProps {
    values: number[];
    selectedValue: number;
    onChange: (value: number) => void;
    minValue?: number;
    formatValue?: (value: number) => string;
    occupiedValues?: number[];
}

function WheelPicker({
    values,
    selectedValue,
    onChange,
    minValue = -1,
    formatValue = (v) => v.toString().padStart(2, '0'),
    occupiedValues = [],
}: WheelPickerProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [startY, setStartY] = useState(0);
    const [scrollOffset, setScrollOffset] = useState(0);
    const itemHeight = 40;
    const visibleItems = 5;
    const lastSoundTime = useRef(0);

    // Find current index
    const currentIndex = values.indexOf(selectedValue);

    // Calculate offset to center selected item
    const baseOffset = -(currentIndex * itemHeight) + (itemHeight * Math.floor(visibleItems / 2));

    const handleWheel = useCallback((e: WheelEvent) => {
        e.preventDefault();
        const direction = e.deltaY > 0 ? 1 : -1;
        const newIndex = Math.max(0, Math.min(values.length - 1, currentIndex + direction));
        const newValue = values[newIndex];

        // Check minimum and occupied
        if (newValue >= minValue && !occupiedValues.includes(newValue)) {
            const now = Date.now();
            if (now - lastSoundTime.current > 50) {
                playTickSound();
                triggerHaptic();
                lastSoundTime.current = now;
            }
            onChange(newValue);
        }
    }, [currentIndex, values, onChange, minValue, occupiedValues]);

    useEffect(() => {
        const container = containerRef.current;
        if (container) {
            container.addEventListener('wheel', handleWheel, { passive: false });
            return () => container.removeEventListener('wheel', handleWheel);
        }
    }, [handleWheel]);

    const handleDragStart = (e: React.MouseEvent | React.TouchEvent) => {
        setIsDragging(true);
        const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
        setStartY(clientY);
        setScrollOffset(0);
    };

    const handleDragMove = (e: React.MouseEvent | React.TouchEvent) => {
        if (!isDragging) return;
        const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
        const delta = clientY - startY;
        setScrollOffset(delta);

        // Calculate how many items we've scrolled
        const itemsScrolled = Math.round(-delta / itemHeight);
        const newIndex = Math.max(0, Math.min(values.length - 1, currentIndex + itemsScrolled));
        const newValue = values[newIndex];

        if (newValue !== selectedValue && newValue >= minValue && !occupiedValues.includes(newValue)) {
            playTickSound();
            triggerHaptic();
            onChange(newValue);
            setStartY(clientY);
            setScrollOffset(0);
        }
    };

    const handleDragEnd = () => {
        setIsDragging(false);
        setScrollOffset(0);
    };

    return (
        <div
            ref={containerRef}
            className="relative h-[200px] w-[70px] overflow-hidden cursor-ns-resize select-none"
            onMouseDown={handleDragStart}
            onMouseMove={handleDragMove}
            onMouseUp={handleDragEnd}
            onMouseLeave={handleDragEnd}
            onTouchStart={handleDragStart}
            onTouchMove={handleDragMove}
            onTouchEnd={handleDragEnd}
        >
            {/* Gradient overlays for fade effect */}
            <div className="absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-popover to-transparent z-10 pointer-events-none" />
            <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-popover to-transparent z-10 pointer-events-none" />

            {/* Selection highlight */}
            <div className="absolute inset-x-1 top-1/2 -translate-y-1/2 h-[40px] bg-primary/20 rounded-lg border border-primary/30 z-0" />

            {/* Values */}
            <div
                className="transition-transform duration-150 ease-out"
                style={{
                    transform: `translateY(${baseOffset + scrollOffset}px)`,
                }}
            >
                {values.map((value) => {
                    const isSelected = value === selectedValue;
                    const isDisabled = value < minValue;
                    const isOccupied = occupiedValues.includes(value);

                    return (
                        <div
                            key={value}
                            className={cn(
                                "h-[40px] flex items-center justify-center text-2xl font-mono transition-all duration-150",
                                isSelected && "text-primary font-bold scale-110",
                                !isSelected && "text-muted-foreground/60",
                                isDisabled && "opacity-30 line-through",
                                isOccupied && "text-red-400/50 line-through"
                            )}
                        >
                            {formatValue(value)}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

export function SmartTimePicker({
    value,
    onChange,
    label,
    selectedDate,
    occupiedSlots = [],
    className,
}: SmartTimePickerProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [currentTime, setCurrentTime] = useState({ hours: 0, minutes: 0 });
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Parse current value
    const [selectedHour, selectedMinute] = value
        ? value.split(':').map(Number)
        : [currentTime.hours, currentTime.minutes];

    // Update current time every second
    useEffect(() => {
        const update = () => {
            const now = new Date();
            setCurrentTime({ hours: now.getHours(), minutes: now.getMinutes() });
        };
        update();
        const interval = setInterval(update, 1000);
        return () => clearInterval(interval);
    }, []);

    // Close on outside click
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const isToday = selectedDate === new Date().toISOString().split('T')[0];

    // Calculate min values (current time if today)
    const minHour = isToday ? currentTime.hours : 0;
    const minMinute = isToday && selectedHour === currentTime.hours ? currentTime.minutes : 0;

    // Get occupied hours for the selected date
    const getOccupiedMinutes = (hour: number): number[] => {
        const occupied: number[] = [];
        occupiedSlots.forEach(slot => {
            const [startH, startM] = slot.start.split(':').map(Number);
            const [endH, endM] = slot.end.split(':').map(Number);

            if (hour >= startH && hour < endH) {
                // This hour has some occupied minutes
                const fromM = hour === startH ? startM : 0;
                const toM = hour === endH - 1 ? endM : 60;
                for (let m = fromM; m < toM; m++) {
                    occupied.push(m);
                }
            }
        });
        return occupied;
    };

    const handleHourChange = (hour: number) => {
        // If changing hour puts minute below minimum, adjust
        const newMinMinute = isToday && hour === currentTime.hours ? currentTime.minutes : 0;
        const adjustedMinute = Math.max(selectedMinute, newMinMinute);
        onChange(`${hour.toString().padStart(2, '0')}:${adjustedMinute.toString().padStart(2, '0')}`);
    };

    const handleMinuteChange = (minute: number) => {
        onChange(`${selectedHour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`);
    };

    const handleOpen = () => {
        setIsOpen(true);
        // If no value, set to current time
        if (!value) {
            onChange(`${currentTime.hours.toString().padStart(2, '0')}:${currentTime.minutes.toString().padStart(2, '0')}`);
        }
    };

    // Format display time
    const formatDisplay = (): string => {
        if (!value) return `Select ${label === 'start' ? 'Start' : 'End'} Time`;
        const [h, m] = value.split(':').map(Number);
        const period = h >= 12 ? 'PM' : 'AM';
        const displayH = h === 0 ? 12 : h > 12 ? h - 12 : h;
        return `${displayH}:${m.toString().padStart(2, '0')} ${period}`;
    };

    const hours = Array.from({ length: 24 }, (_, i) => i);
    const minutes = Array.from({ length: 60 }, (_, i) => i);

    return (
        <div className={cn("relative", className)} ref={dropdownRef}>
            {/* Trigger Button */}
            <button
                type="button"
                onClick={handleOpen}
                className={cn(
                    "w-full flex items-center justify-between px-3 py-2 rounded-md border transition-all duration-200",
                    "bg-background hover:bg-accent/50",
                    isOpen ? "border-primary ring-2 ring-primary/20" : "border-input",
                    !value && "text-muted-foreground"
                )}
            >
                <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span className={cn(value && "font-mono")}>{formatDisplay()}</span>
                </div>
                <ChevronDown className={cn(
                    "h-4 w-4 transition-transform duration-200",
                    isOpen && "rotate-180"
                )} />
            </button>

            {/* Scroll Wheel Picker */}
            {isOpen && (
                <div className={cn(
                    "absolute z-50 mt-1 left-1/2 -translate-x-1/2",
                    "bg-popover border border-border rounded-xl shadow-2xl p-4",
                    "animate-in fade-in-0 zoom-in-95 duration-200"
                )}>
                    {/* Live time indicator */}
                    {isToday && (
                        <div className="flex items-center justify-center gap-2 mb-3 pb-2 border-b border-border/50">
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                            </span>
                            <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                                Now: {currentTime.hours.toString().padStart(2, '0')}:{currentTime.minutes.toString().padStart(2, '0')}
                            </span>
                        </div>
                    )}

                    {/* Wheel pickers */}
                    <div className="flex items-center gap-2">
                        <WheelPicker
                            values={hours}
                            selectedValue={selectedHour}
                            onChange={handleHourChange}
                            minValue={minHour}
                        />

                        {/* Separator */}
                        <div className="text-3xl font-bold text-primary animate-pulse">:</div>

                        <WheelPicker
                            values={minutes}
                            selectedValue={selectedMinute}
                            onChange={handleMinuteChange}
                            minValue={minMinute}
                            occupiedValues={getOccupiedMinutes(selectedHour)}
                        />
                    </div>

                    {/* Instructions */}
                    <p className="text-xs text-muted-foreground text-center mt-3 pt-2 border-t border-border/50">
                        Scroll or drag to adjust
                    </p>

                    {/* Confirm button */}
                    <button
                        type="button"
                        onClick={() => setIsOpen(false)}
                        className="w-full mt-3 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors"
                    >
                        Confirm
                    </button>
                </div>
            )}
        </div>
    );
}
