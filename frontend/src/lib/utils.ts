import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, parseISO, startOfWeek, endOfWeek, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isSameMonth, isToday } from "date-fns";

/**
 * Parse a date string as local time (not UTC).
 * This fixes the timezone issue where parseISO treats strings without timezone as UTC.
 * @param dateString - ISO-like date string (e.g., "2026-01-08T14:00:00")
 * @returns Date object interpreted as local time
 */
export function parseLocalDate(dateString: string): Date {
  // If the string already has timezone info (Z or +/-), use parseISO
  if (dateString.includes('Z') || /[+-]\d{2}:\d{2}$/.test(dateString)) {
    return parseISO(dateString);
  }
  // Otherwise, use new Date() which interprets as local time
  return new Date(dateString);
}

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Date formatting utilities
export function formatDate(date: Date | string, formatStr: string = 'PPP'): string {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return format(dateObj, formatStr);
}

export function formatTime(date: Date | string): string {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return format(dateObj, 'HH:mm');
}

export function formatDateTime(date: Date | string): string {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return format(dateObj, 'PPP p');
}

// Calendar utilities
export function getMonthDays(date: Date): Date[] {
  const start = startOfWeek(startOfMonth(date), { weekStartsOn: 1 });
  const end = endOfWeek(endOfMonth(date), { weekStartsOn: 1 });
  return eachDayOfInterval({ start, end });
}

export function getWeekDays(date: Date): Date[] {
  const start = startOfWeek(date, { weekStartsOn: 1 });
  const end = endOfWeek(date, { weekStartsOn: 1 });
  return eachDayOfInterval({ start, end });
}

export { isSameDay, isSameMonth, isToday };

// Pomodoro time formatting
export function formatPomodoroTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

// Generate unique ID
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Category colors
export const categoryColors: Record<string, { bg: string; text: string; border: string }> = {
  work: { bg: 'bg-indigo-500/20', text: 'text-indigo-400', border: 'border-indigo-500' },
  personal: { bg: 'bg-pink-500/20', text: 'text-pink-400', border: 'border-pink-500' },
  health: { bg: 'bg-green-500/20', text: 'text-green-400', border: 'border-green-500' },
  learning: { bg: 'bg-purple-500/20', text: 'text-purple-400', border: 'border-purple-500' },
  finance: { bg: 'bg-yellow-500/20', text: 'text-yellow-400', border: 'border-yellow-500' },
  social: { bg: 'bg-cyan-500/20', text: 'text-cyan-400', border: 'border-cyan-500' },
};

// Priority colors
export const priorityColors: Record<string, { bg: string; text: string }> = {
  high: { bg: 'bg-red-500/20', text: 'text-red-400' },
  medium: { bg: 'bg-yellow-500/20', text: 'text-yellow-400' },
  low: { bg: 'bg-green-500/20', text: 'text-green-400' },
};

// Debounce utility
export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}
