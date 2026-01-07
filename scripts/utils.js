/**
 * Utility Functions - Scheduler Assistant
 */

// Generate unique ID
export function generateId() {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Date formatting
export function formatDate(date, format = 'full') {
  const d = new Date(date);
  const options = {
    full: { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' },
    short: { month: 'short', day: 'numeric' },
    monthYear: { month: 'long', year: 'numeric' },
    iso: null,
    time: { hour: '2-digit', minute: '2-digit' },
    datetime: { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }
  };

  if (format === 'iso') {
    return d.toISOString().split('T')[0];
  }

  return d.toLocaleDateString('en-US', options[format] || options.full);
}

// Format time
export function formatTime(date) {
  return new Date(date).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
}

// Get time string for input
export function getTimeString(date) {
  const d = new Date(date);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

// Parse date string
export function parseDate(dateString) {
  return new Date(dateString);
}

// Get start of day
export function getStartOfDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

// Get end of day
export function getEndOfDay(date) {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

// Get start of week (Sunday)
export function getStartOfWeek(date) {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() - day);
  d.setHours(0, 0, 0, 0);
  return d;
}

// Get end of week (Saturday)
export function getEndOfWeek(date) {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() + (6 - day));
  d.setHours(23, 59, 59, 999);
  return d;
}

// Get start of month
export function getStartOfMonth(date) {
  const d = new Date(date);
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
}

// Get end of month
export function getEndOfMonth(date) {
  const d = new Date(date);
  d.setMonth(d.getMonth() + 1, 0);
  d.setHours(23, 59, 59, 999);
  return d;
}

// Get days in month
export function getDaysInMonth(date) {
  const d = new Date(date);
  return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
}

// Check if same day
export function isSameDay(date1, date2) {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  return d1.toDateString() === d2.toDateString();
}

// Check if today
export function isToday(date) {
  return isSameDay(date, new Date());
}

// Check if date is in the past
export function isPast(date) {
  return new Date(date) < new Date();
}

// Add days to date
export function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

// Add months to date
export function addMonths(date, months) {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

// Get difference in days
export function getDaysDiff(date1, date2) {
  const d1 = getStartOfDay(date1);
  const d2 = getStartOfDay(date2);
  const diffTime = Math.abs(d2 - d1);
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

// Get relative time string
export function getRelativeTime(date) {
  const now = new Date();
  const d = new Date(date);
  const diffMs = d - now;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 0) {
    if (diffMins > -60) return `${Math.abs(diffMins)} min ago`;
    if (diffHours > -24) return `${Math.abs(diffHours)} hours ago`;
    if (diffDays > -7) return `${Math.abs(diffDays)} days ago`;
    return formatDate(date, 'short');
  }

  if (diffMins < 60) return `in ${diffMins} min`;
  if (diffHours < 24) return `in ${diffHours} hours`;
  if (diffDays < 7) return `in ${diffDays} days`;
  return formatDate(date, 'short');
}

// Debounce function
export function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// Throttle function
export function throttle(func, limit) {
  let inThrottle;
  return function executedFunction(...args) {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

// Escape HTML
export function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Deep clone object
export function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

// Check if object is empty
export function isEmpty(obj) {
  return Object.keys(obj).length === 0;
}

// Group array by key
export function groupBy(array, key) {
  return array.reduce((result, item) => {
    const groupKey = typeof key === 'function' ? key(item) : item[key];
    (result[groupKey] = result[groupKey] || []).push(item);
    return result;
  }, {});
}

// Sort events by start date
export function sortByDate(events, ascending = true) {
  return [...events].sort((a, b) => {
    const dateA = new Date(a.startDate);
    const dateB = new Date(b.startDate);
    return ascending ? dateA - dateB : dateB - dateA;
  });
}

// Get week number
export function getWeekNumber(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 4 - (d.getDay() || 7));
  const yearStart = new Date(d.getFullYear(), 0, 1);
  return Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
}

// Get hours array (for day/week view)
export function getHoursArray() {
  return Array.from({ length: 24 }, (_, i) => {
    const hour = i % 12 || 12;
    const period = i < 12 ? 'AM' : 'PM';
    return `${hour}:00 ${period}`;
  });
}

// Get short day names
export function getDayNames(short = false) {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return short ? days.map(d => d.slice(0, 3)) : days;
}

// Get month names
export function getMonthNames(short = false) {
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 
                  'July', 'August', 'September', 'October', 'November', 'December'];
  return short ? months.map(m => m.slice(0, 3)) : months;
}

// Calculate duration in minutes
export function getDurationMinutes(startDate, endDate) {
  return Math.round((new Date(endDate) - new Date(startDate)) / 60000);
}

// Format duration
export function formatDuration(minutes) {
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}

// Check if events overlap
export function eventsOverlap(event1, event2) {
  const start1 = new Date(event1.startDate);
  const end1 = new Date(event1.endDate);
  const start2 = new Date(event2.startDate);
  const end2 = new Date(event2.endDate);
  return start1 < end2 && start2 < end1;
}

// Get color for category
export function getCategoryColor(category) {
  const colors = {
    work: '#6366f1',
    personal: '#ec4899',
    health: '#22c55e',
    learning: '#8b5cf6',
    finance: '#eab308',
    social: '#06b6d4'
  };
  return colors[category] || colors.work;
}

// Get priority color
export function getPriorityColor(priority) {
  const colors = {
    high: '#ef4444',
    medium: '#f59e0b',
    low: '#22c55e'
  };
  return colors[priority] || colors.medium;
}

// Capitalize first letter
export function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// Truncate text
export function truncate(str, length = 50) {
  return str.length > length ? str.slice(0, length) + '...' : str;
}
