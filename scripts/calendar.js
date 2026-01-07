/**
 * Calendar Module - Scheduler Assistant
 * Handles calendar view rendering and navigation
 */

import { storage } from './storage.js';
import { getEventsWithRecurring, getEventsForDate } from './events.js';
import {
    formatDate,
    formatTime,
    getStartOfMonth,
    getEndOfMonth,
    getStartOfWeek,
    getEndOfWeek,
    getDaysInMonth,
    addDays,
    addMonths,
    isToday,
    isSameDay,
    getDayNames,
    getHoursArray,
    getCategoryColor
} from './utils.js';

// State
let currentDate = new Date();
let currentView = 'month';
let selectedDate = new Date();

/**
 * Get current state
 */
export function getCalendarState() {
    return { currentDate, currentView, selectedDate };
}

/**
 * Set current date
 */
export function setCurrentDate(date) {
    currentDate = new Date(date);
}

/**
 * Set current view
 */
export function setCurrentView(view) {
    currentView = view;
    storage.updatePreferences({ defaultView: view });
}

/**
 * Set selected date
 */
export function setSelectedDate(date) {
    selectedDate = new Date(date);
}

/**
 * Navigate to previous period
 */
export function previousPeriod() {
    switch (currentView) {
        case 'month':
            currentDate = addMonths(currentDate, -1);
            break;
        case 'week':
            currentDate = addDays(currentDate, -7);
            break;
        case 'day':
            currentDate = addDays(currentDate, -1);
            break;
    }
    return currentDate;
}

/**
 * Navigate to next period
 */
export function nextPeriod() {
    switch (currentView) {
        case 'month':
            currentDate = addMonths(currentDate, 1);
            break;
        case 'week':
            currentDate = addDays(currentDate, 7);
            break;
        case 'day':
            currentDate = addDays(currentDate, 1);
            break;
    }
    return currentDate;
}

/**
 * Go to today
 */
export function goToToday() {
    currentDate = new Date();
    selectedDate = new Date();
    return currentDate;
}

/**
 * Get navigation title
 */
export function getNavigationTitle() {
    switch (currentView) {
        case 'month':
            return formatDate(currentDate, 'monthYear');
        case 'week':
            const weekStart = getStartOfWeek(currentDate);
            const weekEnd = getEndOfWeek(currentDate);
            return `${formatDate(weekStart, 'short')} - ${formatDate(weekEnd, 'short')}`;
        case 'day':
            return formatDate(currentDate, 'full');
        case 'agenda':
            return 'Upcoming Events';
        default:
            return formatDate(currentDate, 'monthYear');
    }
}

/**
 * Generate month view data
 */
export function generateMonthData() {
    const start = getStartOfMonth(currentDate);
    const end = getEndOfMonth(currentDate);
    const firstDay = getStartOfWeek(start);

    const days = [];
    let day = new Date(firstDay);

    // Generate 42 days (6 weeks)
    for (let i = 0; i < 42; i++) {
        const isCurrentMonth = day.getMonth() === currentDate.getMonth();
        const events = getEventsForDate(day);

        days.push({
            date: new Date(day),
            dayNumber: day.getDate(),
            isCurrentMonth,
            isToday: isToday(day),
            isSelected: isSameDay(day, selectedDate),
            isWeekend: day.getDay() === 0 || day.getDay() === 6,
            events: events.slice(0, 3),
            hasMore: events.length > 3,
            moreCount: events.length - 3
        });

        day = addDays(day, 1);
    }

    return days;
}

/**
 * Generate week view data
 */
export function generateWeekData() {
    const weekStart = getStartOfWeek(currentDate);
    const weekEnd = getEndOfWeek(currentDate);
    const events = getEventsWithRecurring(weekStart, weekEnd);

    const days = [];
    let day = new Date(weekStart);

    for (let i = 0; i < 7; i++) {
        const dayEvents = events.filter(e => isSameDay(new Date(e.startDate), day));

        days.push({
            date: new Date(day),
            dayNumber: day.getDate(),
            dayName: getDayNames(true)[day.getDay()],
            isToday: isToday(day),
            isSelected: isSameDay(day, selectedDate),
            events: dayEvents
        });

        day = addDays(day, 1);
    }

    return { days, hours: getHoursArray() };
}

/**
 * Generate day view data
 */
export function generateDayData() {
    const events = getEventsForDate(currentDate);
    const hours = getHoursArray();

    const slots = hours.map((hour, index) => {
        const slotEvents = events.filter(e => {
            const eventHour = new Date(e.startDate).getHours();
            return eventHour === index;
        });

        return {
            hour,
            hourIndex: index,
            events: slotEvents
        };
    });

    return {
        date: currentDate,
        isToday: isToday(currentDate),
        slots,
        allEvents: events
    };
}

/**
 * Generate agenda view data
 */
export function generateAgendaData(daysAhead = 14) {
    const today = new Date();
    const endDate = addDays(today, daysAhead);
    const events = getEventsWithRecurring(today, endDate);

    // Group by date
    const grouped = {};
    events.forEach(event => {
        const dateKey = new Date(event.startDate).toDateString();
        if (!grouped[dateKey]) {
            grouped[dateKey] = [];
        }
        grouped[dateKey].push(event);
    });

    // Convert to array
    return Object.entries(grouped).map(([dateKey, dateEvents]) => ({
        date: new Date(dateKey),
        isToday: isToday(new Date(dateKey)),
        events: dateEvents.sort((a, b) => new Date(a.startDate) - new Date(b.startDate))
    }));
}

/**
 * Render month view HTML
 */
export function renderMonthView() {
    const days = generateMonthData();
    const dayNames = getDayNames(true);

    let html = `
    <div class="calendar">
      <div class="calendar-header">
        ${dayNames.map((name, i) => `
          <div class="calendar-header-cell ${i === 0 || i === 6 ? 'weekend' : ''}">${name}</div>
        `).join('')}
      </div>
      <div class="calendar-grid">
  `;

    days.forEach(day => {
        const classes = [
            'calendar-cell',
            !day.isCurrentMonth ? 'other-month' : '',
            day.isToday ? 'today' : '',
            day.isSelected ? 'selected' : '',
            day.isWeekend ? 'weekend' : ''
        ].filter(Boolean).join(' ');

        html += `
      <div class="${classes}" data-date="${day.date.toISOString()}" draggable="false">
        <div class="calendar-date">${day.dayNumber}</div>
        <div class="calendar-events">
          ${day.events.map(event => `
            <div class="calendar-event ${event.category}" 
                 data-event-id="${event.id}" 
                 draggable="true"
                 title="${event.title}">
              ${event.title}
            </div>
          `).join('')}
          ${day.hasMore ? `<div class="calendar-more">+${day.moreCount} more</div>` : ''}
        </div>
      </div>
    `;
    });

    html += `</div></div>`;
    return html;
}

/**
 * Render week view HTML
 */
export function renderWeekView() {
    const { days, hours } = generateWeekData();

    let html = `
    <div class="calendar calendar-week">
      <div class="calendar-week-header">
        <div class="calendar-week-header-cell"></div>
        ${days.map(day => `
          <div class="calendar-week-header-cell">
            <div class="calendar-week-day-name">${day.dayName}</div>
            <div class="calendar-week-day-num ${day.isToday ? 'today' : ''}">${day.dayNumber}</div>
          </div>
        `).join('')}
      </div>
      <div class="calendar-week-body">
        <div class="calendar-week-times">
          ${hours.map(hour => `<div class="calendar-week-time">${hour}</div>`).join('')}
        </div>
        ${days.map(day => `
          <div class="calendar-week-column" data-date="${day.date.toISOString()}">
            ${hours.map((_, i) => `
              <div class="calendar-week-slot" data-hour="${i}"></div>
            `).join('')}
          </div>
        `).join('')}
      </div>
    </div>
  `;

    return html;
}

/**
 * Render day view HTML
 */
export function renderDayView() {
    const data = generateDayData();

    let html = `
    <div class="calendar calendar-day">
      ${data.slots.map(slot => `
        <div class="calendar-day-slot">
          <div class="calendar-day-time">${slot.hour}</div>
          <div class="calendar-day-content" data-date="${currentDate.toISOString()}" data-hour="${slot.hourIndex}">
            ${slot.events.map(event => `
              <div class="calendar-event ${event.category}" 
                   data-event-id="${event.id}"
                   style="border-left: 4px solid ${getCategoryColor(event.category)}">
                <strong>${event.title}</strong>
                <span>${formatTime(event.startDate)} - ${formatTime(event.endDate)}</span>
              </div>
            `).join('')}
          </div>
        </div>
      `).join('')}
    </div>
  `;

    return html;
}

/**
 * Render agenda view HTML
 */
export function renderAgendaView() {
    const groups = generateAgendaData();

    if (groups.length === 0) {
        return `
      <div class="empty-state">
        <svg class="empty-state-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
          <line x1="16" y1="2" x2="16" y2="6"/>
          <line x1="8" y1="2" x2="8" y2="6"/>
          <line x1="3" y1="10" x2="21" y2="10"/>
        </svg>
        <h3 class="empty-state-title">No upcoming events</h3>
        <p class="empty-state-description">Create your first event to get started!</p>
      </div>
    `;
    }

    let html = `<div class="calendar-agenda">`;

    groups.forEach(group => {
        const dayNames = getDayNames(true);

        html += `
      <div class="agenda-group">
        <div class="agenda-date">
          <div class="agenda-date-day ${group.isToday ? 'today' : ''}">
            <span class="agenda-date-num">${group.date.getDate()}</span>
            <span class="agenda-date-weekday">${dayNames[group.date.getDay()]}</span>
          </div>
          <div class="agenda-date-full">${formatDate(group.date, 'full')}</div>
        </div>
        <div class="agenda-events">
          ${group.events.map(event => `
            <div class="agenda-event" 
                 data-event-id="${event.id}"
                 style="border-left-color: ${getCategoryColor(event.category)}">
              <div class="agenda-event-time">${formatTime(event.startDate)}</div>
              <div class="agenda-event-title">${event.title}</div>
              <span class="badge badge-${event.category}">${event.category}</span>
            </div>
          `).join('')}
        </div>
      </div>
    `;
    });

    html += `</div>`;
    return html;
}

/**
 * Render current view
 */
export function renderCalendar() {
    switch (currentView) {
        case 'month':
            return renderMonthView();
        case 'week':
            return renderWeekView();
        case 'day':
            return renderDayView();
        case 'agenda':
            return renderAgendaView();
        default:
            return renderMonthView();
    }
}

/**
 * Render mini calendar (sidebar)
 */
export function renderMiniCalendar(targetDate = new Date()) {
    const year = targetDate.getFullYear();
    const month = targetDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = getDaysInMonth(targetDate);
    const daysInPrevMonth = getDaysInMonth(addMonths(targetDate, -1));

    const dayNames = getDayNames(true).map(d => d.charAt(0));

    let html = `
    <div class="mini-calendar">
      <div class="mini-calendar-header">
        <span class="mini-calendar-title">${formatDate(targetDate, 'monthYear')}</span>
        <div class="mini-calendar-nav">
          <button data-action="mini-prev">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="m15 18-6-6 6-6"/>
            </svg>
          </button>
          <button data-action="mini-next">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="m9 18 6-6-6-6"/>
            </svg>
          </button>
        </div>
      </div>
      <div class="mini-calendar-grid">
        ${dayNames.map(d => `<div class="mini-calendar-day header">${d}</div>`).join('')}
  `;

    // Previous month days
    for (let i = firstDay - 1; i >= 0; i--) {
        const day = daysInPrevMonth - i;
        html += `<div class="mini-calendar-day other">${day}</div>`;
    }

    // Current month days
    for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(year, month, day);
        const classes = ['mini-calendar-day'];
        if (isToday(date)) classes.push('today');
        if (isSameDay(date, selectedDate)) classes.push('selected');

        html += `<div class="${classes.join(' ')}" data-date="${date.toISOString()}">${day}</div>`;
    }

    // Next month days
    const totalCells = firstDay + daysInMonth;
    const remainingCells = totalCells <= 35 ? 35 - totalCells : 42 - totalCells;
    for (let day = 1; day <= remainingCells; day++) {
        html += `<div class="mini-calendar-day other">${day}</div>`;
    }

    html += `</div></div>`;
    return html;
}
