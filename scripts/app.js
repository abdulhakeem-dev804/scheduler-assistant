/**
 * Main Application - Scheduler Assistant
 * Entry point and global event handlers
 */

import { storage } from './storage.js';
import { initUI, toggleTheme, openModal, closeModal, showToast, setupDragAndDrop, confirm } from './ui.js';
import {
    renderCalendar,
    renderMiniCalendar,
    setCurrentView,
    setCurrentDate,
    setSelectedDate,
    nextPeriod,
    previousPeriod,
    goToToday,
    getNavigationTitle,
    getCalendarState
} from './calendar.js';
import {
    createEvent,
    updateEvent,
    deleteEvent,
    getEvent,
    toggleEventCompletion,
    moveEvent,
    searchEvents,
    getAllEvents
} from './events.js';
import {
    renderPomodoroWidget,
    startTimer,
    pauseTimer,
    resetTimer,
    skipSession,
    setMode,
    getPomodoroState,
    formatPomodoroTime
} from './pomodoro.js';
import { renderStatsDashboard, renderUpcomingWidget, updateStreak } from './stats.js';
import { formatDate, getTimeString, debounce } from './utils.js';

// DOM Elements
let calendarContainer;
let sidebarCalendar;
let pomodoroContainer;
let statsContainer;
let upcomingContainer;
let navTitle;
let searchInput;

/**
 * Initialize the application
 */
function init() {
    // Initialize UI
    initUI();

    // Update streak
    updateStreak();

    // Cache DOM elements
    calendarContainer = document.getElementById('calendar-container');
    sidebarCalendar = document.getElementById('sidebar-calendar');
    pomodoroContainer = document.getElementById('pomodoro-container');
    statsContainer = document.getElementById('stats-container');
    upcomingContainer = document.getElementById('upcoming-container');
    navTitle = document.getElementById('nav-title');
    searchInput = document.getElementById('search-input');

    // Setup event listeners
    setupNavigation();
    setupViewTabs();
    setupEventModal();
    setupKeyboardShortcuts();
    setupSearch();
    setupSidebar();

    // Initial render
    render();

    // Add sample events if empty
    if (getAllEvents().length === 0) {
        addSampleEvents();
    }

    console.log('🗓️ Scheduler Assistant initialized!');
}

/**
 * Render all components
 */
function render() {
    renderMainCalendar();
    renderSidebarWidgets();
    updateNavigationTitle();
}

/**
 * Render main calendar
 */
function renderMainCalendar() {
    if (!calendarContainer) return;

    calendarContainer.innerHTML = renderCalendar();

    // Setup drag and drop
    setupDragAndDrop(calendarContainer, (eventId, newDate) => {
        moveEvent(eventId, newDate);
        renderMainCalendar();
        showToast('Event moved!', 'success');
    });

    // Setup event click handlers
    calendarContainer.querySelectorAll('[data-event-id]').forEach(el => {
        el.addEventListener('click', (e) => {
            e.stopPropagation();
            openEventModal(el.dataset.eventId);
        });
    });

    // Setup cell click handlers
    calendarContainer.querySelectorAll('.calendar-cell, .calendar-day-content').forEach(el => {
        el.addEventListener('click', (e) => {
            if (e.target.closest('[data-event-id]')) return;
            const date = el.dataset.date;
            if (date) {
                openEventModal(null, new Date(date));
            }
        });
    });
}

/**
 * Render sidebar widgets
 */
function renderSidebarWidgets() {
    if (sidebarCalendar) {
        sidebarCalendar.innerHTML = renderMiniCalendar();
        setupMiniCalendarEvents();
    }

    if (pomodoroContainer) {
        pomodoroContainer.innerHTML = renderPomodoroWidget();
        setupPomodoroEvents();
    }

    if (upcomingContainer) {
        upcomingContainer.innerHTML = renderUpcomingWidget();
    }
}

/**
 * Update navigation title
 */
function updateNavigationTitle() {
    if (navTitle) {
        navTitle.textContent = getNavigationTitle();
    }
}

/**
 * Setup navigation buttons
 */
function setupNavigation() {
    document.getElementById('nav-prev')?.addEventListener('click', () => {
        previousPeriod();
        render();
    });

    document.getElementById('nav-next')?.addEventListener('click', () => {
        nextPeriod();
        render();
    });

    document.getElementById('nav-today')?.addEventListener('click', () => {
        goToToday();
        render();
    });

    document.getElementById('theme-toggle')?.addEventListener('click', () => {
        const newTheme = toggleTheme();
        showToast(`Switched to ${newTheme} mode`, 'info');
    });

    document.getElementById('add-event-btn')?.addEventListener('click', () => {
        openEventModal();
    });
}

/**
 * Setup view tabs
 */
function setupViewTabs() {
    document.querySelectorAll('.view-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.view-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            setCurrentView(tab.dataset.view);
            renderMainCalendar();
            updateNavigationTitle();
        });
    });
}

/**
 * Setup sidebar navigation
 */
function setupSidebar() {
    document.querySelectorAll('.nav-item[data-view]').forEach(item => {
        item.addEventListener('click', () => {
            document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
            item.classList.add('active');

            const view = item.dataset.view;
            if (view === 'stats') {
                calendarContainer.innerHTML = renderStatsDashboard();
            } else {
                setCurrentView(view);
                renderMainCalendar();
            }
            updateNavigationTitle();
        });
    });
}

/**
 * Setup mini calendar events
 */
function setupMiniCalendarEvents() {
    sidebarCalendar?.querySelectorAll('.mini-calendar-day:not(.header):not(.other)').forEach(day => {
        day.addEventListener('click', () => {
            const date = day.dataset.date;
            if (date) {
                setSelectedDate(date);
                setCurrentDate(date);
                render();
            }
        });
    });

    sidebarCalendar?.querySelector('[data-action="mini-prev"]')?.addEventListener('click', () => {
        const state = getCalendarState();
        const newDate = new Date(state.currentDate);
        newDate.setMonth(newDate.getMonth() - 1);
        setCurrentDate(newDate);
        render();
    });

    sidebarCalendar?.querySelector('[data-action="mini-next"]')?.addEventListener('click', () => {
        const state = getCalendarState();
        const newDate = new Date(state.currentDate);
        newDate.setMonth(newDate.getMonth() + 1);
        setCurrentDate(newDate);
        render();
    });
}

/**
 * Setup Pomodoro events
 */
function setupPomodoroEvents() {
    const container = pomodoroContainer;
    if (!container) return;

    container.querySelector('[data-action="start"]')?.addEventListener('click', () => {
        startTimer(
            (remaining, formatted) => {
                const timeEl = container.querySelector('.pomodoro-time');
                if (timeEl) timeEl.textContent = formatted;
                updatePomodoroProgress();
            },
            (result) => {
                renderSidebarWidgets();
            }
        );
        renderSidebarWidgets();
    });

    container.querySelector('[data-action="pause"]')?.addEventListener('click', () => {
        pauseTimer();
        renderSidebarWidgets();
    });

    container.querySelector('[data-action="reset"]')?.addEventListener('click', () => {
        const result = resetTimer();
        const timeEl = container.querySelector('.pomodoro-time');
        if (timeEl) timeEl.textContent = result.formattedTime;
        renderSidebarWidgets();
    });

    container.querySelector('[data-action="skip"]')?.addEventListener('click', () => {
        skipSession((result) => {
            renderSidebarWidgets();
        });
    });

    container.querySelectorAll('.pomodoro-mode-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            const result = setMode(tab.dataset.mode);
            const timeEl = container.querySelector('.pomodoro-time');
            if (timeEl) timeEl.textContent = result.formattedTime;
            renderSidebarWidgets();
        });
    });
}

/**
 * Update Pomodoro progress ring
 */
function updatePomodoroProgress() {
    const state = getPomodoroState();
    const settings = storage.getPreferences().pomodoroSettings || { workDuration: 25 };
    const total = settings.workDuration * 60;
    const progress = ((total - state.timeRemaining) / total) * 100;

    const ring = pomodoroContainer?.querySelector('.pomodoro-ring-progress');
    if (ring) {
        ring.style.strokeDashoffset = 283 - (283 * progress / 100);
    }
}

/**
 * Open event modal
 */
function openEventModal(eventId = null, defaultDate = null) {
    const modal = document.getElementById('event-modal');
    if (!modal) return;

    const form = modal.querySelector('#event-form');
    const titleEl = modal.querySelector('.modal-title');
    const deleteBtn = modal.querySelector('#delete-event-btn');

    // Reset form
    form.reset();

    if (eventId) {
        // Edit mode
        const event = getEvent(eventId);
        if (!event) return;

        titleEl.textContent = 'Edit Event';
        deleteBtn.style.display = 'block';
        form.dataset.eventId = eventId;

        // Fill form
        form.querySelector('#event-title').value = event.title;
        form.querySelector('#event-description').value = event.description || '';
        form.querySelector('#event-start-date').value = event.startDate.split('T')[0];
        form.querySelector('#event-start-time').value = getTimeString(event.startDate);
        form.querySelector('#event-end-date').value = event.endDate.split('T')[0];
        form.querySelector('#event-end-time').value = getTimeString(event.endDate);
        form.querySelector('#event-category').value = event.category;
        form.querySelector('#event-priority').value = event.priority;
        form.querySelector('#event-recurring').checked = event.isRecurring;

        if (event.isCompleted) {
            form.querySelector('#event-completed')?.checked;
        }
    } else {
        // Create mode
        titleEl.textContent = 'New Event';
        deleteBtn.style.display = 'none';
        delete form.dataset.eventId;

        // Set default date
        const date = defaultDate || new Date();
        form.querySelector('#event-start-date').value = formatDate(date, 'iso');
        form.querySelector('#event-end-date').value = formatDate(date, 'iso');
        form.querySelector('#event-start-time').value = '09:00';
        form.querySelector('#event-end-time').value = '10:00';
    }

    openModal('event-modal');
}

/**
 * Setup event modal
 */
function setupEventModal() {
    const form = document.getElementById('event-form');
    const deleteBtn = document.getElementById('delete-event-btn');

    form?.addEventListener('submit', (e) => {
        e.preventDefault();

        const formData = new FormData(form);
        const eventId = form.dataset.eventId;

        const startDateTime = `${formData.get('start-date')}T${formData.get('start-time')}`;
        const endDateTime = `${formData.get('end-date')}T${formData.get('end-time')}`;

        const eventData = {
            title: formData.get('title'),
            description: formData.get('description'),
            startDate: new Date(startDateTime).toISOString(),
            endDate: new Date(endDateTime).toISOString(),
            category: formData.get('category'),
            priority: formData.get('priority'),
            isRecurring: formData.get('recurring') === 'on'
        };

        if (eventId) {
            updateEvent(eventId, eventData);
            showToast('Event updated!', 'success');
        } else {
            createEvent(eventData);
            showToast('Event created!', 'success');
        }

        closeModal('event-modal');
        render();
    });

    deleteBtn?.addEventListener('click', () => {
        const eventId = form.dataset.eventId;
        if (!eventId) return;

        confirm('Are you sure you want to delete this event?', () => {
            deleteEvent(eventId);
            showToast('Event deleted!', 'success');
            closeModal('event-modal');
            render();
        });
    });

    // Close button
    document.querySelector('#event-modal .modal-close')?.addEventListener('click', () => {
        closeModal('event-modal');
    });

    document.getElementById('cancel-event-btn')?.addEventListener('click', () => {
        closeModal('event-modal');
    });
}

/**
 * Setup keyboard shortcuts
 */
function setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
        // Ignore if typing in input
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

        switch (e.key.toLowerCase()) {
            case 'n':
                openEventModal();
                break;
            case 't':
                goToToday();
                render();
                break;
            case 'm':
                setCurrentView('month');
                document.querySelectorAll('.view-tab').forEach(t => t.classList.remove('active'));
                document.querySelector('.view-tab[data-view="month"]')?.classList.add('active');
                render();
                break;
            case 'w':
                setCurrentView('week');
                document.querySelectorAll('.view-tab').forEach(t => t.classList.remove('active'));
                document.querySelector('.view-tab[data-view="week"]')?.classList.add('active');
                render();
                break;
            case 'd':
                setCurrentView('day');
                document.querySelectorAll('.view-tab').forEach(t => t.classList.remove('active'));
                document.querySelector('.view-tab[data-view="day"]')?.classList.add('active');
                render();
                break;
            case 'arrowleft':
                previousPeriod();
                render();
                break;
            case 'arrowright':
                nextPeriod();
                render();
                break;
            case '/':
                e.preventDefault();
                searchInput?.focus();
                break;
            case 'p':
                const state = getPomodoroState();
                if (state.isRunning) {
                    pauseTimer();
                } else {
                    startTimer();
                }
                renderSidebarWidgets();
                break;
        }
    });
}

/**
 * Setup search
 */
function setupSearch() {
    const debouncedSearch = debounce((query) => {
        if (!query) {
            renderMainCalendar();
            return;
        }

        const results = searchEvents(query);
        // Show search results in calendar container
        if (results.length === 0) {
            calendarContainer.innerHTML = `
        <div class="empty-state">
          <svg class="empty-state-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <circle cx="11" cy="11" r="8"/>
            <path d="m21 21-4.35-4.35"/>
          </svg>
          <h3 class="empty-state-title">No results found</h3>
          <p class="empty-state-description">Try a different search term</p>
        </div>
      `;
        } else {
            calendarContainer.innerHTML = `
        <div class="search-results card">
          <h3 class="mb-4">Search Results (${results.length})</h3>
          <div class="search-results-list">
            ${results.map(event => `
              <div class="agenda-event" data-event-id="${event.id}">
                <div class="agenda-event-time">${formatDate(event.startDate, 'datetime')}</div>
                <div class="agenda-event-title">${event.title}</div>
                <span class="badge badge-${event.category}">${event.category}</span>
              </div>
            `).join('')}
          </div>
        </div>
      `;

            // Add click handlers
            calendarContainer.querySelectorAll('[data-event-id]').forEach(el => {
                el.addEventListener('click', () => {
                    openEventModal(el.dataset.eventId);
                });
            });
        }
    }, 300);

    searchInput?.addEventListener('input', (e) => {
        debouncedSearch(e.target.value);
    });

    searchInput?.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            searchInput.value = '';
            searchInput.blur();
            renderMainCalendar();
        }
    });
}

/**
 * Add sample events for demo
 */
function addSampleEvents() {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const sampleEvents = [
        {
            title: 'Team Standup',
            description: 'Daily sync with the team',
            startDate: new Date(today.setHours(9, 0)).toISOString(),
            endDate: new Date(today.setHours(9, 30)).toISOString(),
            category: 'work',
            priority: 'high'
        },
        {
            title: 'Lunch Break',
            description: 'Take a healthy break',
            startDate: new Date(today.setHours(12, 0)).toISOString(),
            endDate: new Date(today.setHours(13, 0)).toISOString(),
            category: 'health',
            priority: 'medium'
        },
        {
            title: 'Project Review',
            description: 'Q1 project milestone review',
            startDate: new Date(today.setHours(14, 0)).toISOString(),
            endDate: new Date(today.setHours(15, 0)).toISOString(),
            category: 'work',
            priority: 'high'
        },
        {
            title: 'Learn TypeScript',
            description: 'Continue TypeScript course',
            startDate: new Date(tomorrow.setHours(10, 0)).toISOString(),
            endDate: new Date(tomorrow.setHours(11, 30)).toISOString(),
            category: 'learning',
            priority: 'medium'
        },
        {
            title: 'Gym Session',
            description: 'Cardio and strength training',
            startDate: new Date(tomorrow.setHours(18, 0)).toISOString(),
            endDate: new Date(tomorrow.setHours(19, 0)).toISOString(),
            category: 'health',
            priority: 'low'
        }
    ];

    sampleEvents.forEach(event => createEvent(event));
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', init);

// Export for external use
export { render, openEventModal };
