import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, parseISO, startOfWeek, endOfWeek, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isSameMonth, isToday } from "date-fns";

/**
 * Parse a date string and convert to local time for display.
 * The backend stores dates in UTC. This function converts them back to local time.
 * @param dateString - ISO date string from the backend
 * @returns Date object in local time
 */
export function parseLocalDate(dateString: string): Date {
  // Parse the date - this creates a Date object
  const date = new Date(dateString);

  // If the string has no timezone info (like "2026-01-08T16:00:00"),
  // new Date() interprets it as local time - which is what we want
  if (!dateString.includes('Z') && !/[+-]\d{2}:\d{2}$/.test(dateString)) {
    return date;
  }

  // If the string has timezone info (like "2026-01-08T16:00:00Z" or "2026-01-08T16:00:00+00:00"),
  // the Date is in UTC. We need to display it as if it were local time.
  // This is because the user entered "16:00" local time, but the backend stored it as UTC.
  // We want to show "16:00" again, not the converted local time.

  // Extract the time components from the UTC date as if they were local
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth();
  const day = date.getUTCDate();
  const hours = date.getUTCHours();
  const minutes = date.getUTCMinutes();
  const seconds = date.getUTCSeconds();

  // Create a new date using these components as local time
  return new Date(year, month, day, hours, minutes, seconds);
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
