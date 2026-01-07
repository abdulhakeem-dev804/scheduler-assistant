/**
 * Stats Module - Scheduler Assistant
 * Statistics and analytics
 */

import { storage } from './storage.js';
import { getAllEvents, getCompletedEvents, getEventStats } from './events.js';
import { formatDate, isToday, addDays, getStartOfWeek, getDayNames } from './utils.js';

/**
 * Get today's stats
 */
export function getTodayStats() {
    const events = getAllEvents();
    const today = new Date();

    const todayEvents = events.filter(e => {
        const eventDate = new Date(e.startDate);
        return isToday(eventDate);
    });

    const completed = todayEvents.filter(e => e.isCompleted).length;
    const pending = todayEvents.filter(e => !e.isCompleted).length;

    return {
        total: todayEvents.length,
        completed,
        pending,
        completionRate: todayEvents.length > 0
            ? Math.round((completed / todayEvents.length) * 100)
            : 0
    };
}

/**
 * Get weekly stats
 */
export function getWeeklyStats() {
    const events = getAllEvents();
    const weekStart = getStartOfWeek(new Date());
    const dayNames = getDayNames(true);

    const weekData = [];

    for (let i = 0; i < 7; i++) {
        const day = addDays(weekStart, i);
        const dayEvents = events.filter(e => {
            const eventDate = new Date(e.startDate);
            return eventDate.toDateString() === day.toDateString();
        });

        weekData.push({
            day: dayNames[i],
            date: day,
            total: dayEvents.length,
            completed: dayEvents.filter(e => e.isCompleted).length
        });
    }

    return weekData;
}

/**
 * Get category breakdown
 */
export function getCategoryBreakdown() {
    const stats = getEventStats();
    const categories = storage.getCategories();

    return categories.map(cat => ({
        id: cat.id,
        name: cat.name,
        color: cat.color,
        icon: cat.icon,
        count: stats.byCategory[cat.id] || 0
    })).filter(c => c.count > 0);
}

/**
 * Get priority breakdown
 */
export function getPriorityBreakdown() {
    const stats = getEventStats();

    return [
        { id: 'high', name: 'High', color: '#ef4444', count: stats.byPriority.high },
        { id: 'medium', name: 'Medium', color: '#f59e0b', count: stats.byPriority.medium },
        { id: 'low', name: 'Low', color: '#22c55e', count: stats.byPriority.low }
    ].filter(p => p.count > 0);
}

/**
 * Get productivity streak
 */
export function getStreak() {
    const stats = storage.getStats();
    return stats.streakDays || 0;
}

/**
 * Update streak
 */
export function updateStreak() {
    const stats = storage.getStats();
    const today = new Date().toDateString();
    const yesterday = addDays(new Date(), -1).toDateString();

    if (stats.lastActiveDate === today) {
        // Already updated today
        return stats.streakDays;
    }

    let newStreak = 1;
    if (stats.lastActiveDate === yesterday) {
        // Continuing streak
        newStreak = (stats.streakDays || 0) + 1;
    }

    storage.updateStats({
        streakDays: newStreak,
        lastActiveDate: today
    });

    return newStreak;
}

/**
 * Get productivity score (0-100)
 */
export function getProductivityScore() {
    const todayStats = getTodayStats();
    const pomodoroStats = storage.getStats();

    // Factors: completion rate, pomodoro sessions, streak
    const completionScore = todayStats.completionRate * 0.4;
    const pomodoroScore = Math.min(pomodoroStats.pomodoroSessions * 5, 100) * 0.3;
    const streakScore = Math.min(pomodoroStats.streakDays * 5, 100) * 0.3;

    return Math.round(completionScore + pomodoroScore + streakScore);
}

/**
 * Get recent activity
 */
export function getRecentActivity(limit = 5) {
    const events = getAllEvents();

    return events
        .filter(e => e.isCompleted)
        .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
        .slice(0, limit)
        .map(e => ({
            id: e.id,
            title: e.title,
            category: e.category,
            completedAt: e.updatedAt
        }));
}

/**
 * Render stats dashboard HTML
 */
export function renderStatsDashboard() {
    const todayStats = getTodayStats();
    const weeklyStats = getWeeklyStats();
    const categoryBreakdown = getCategoryBreakdown();
    const streak = getStreak();
    const productivityScore = getProductivityScore();

    const maxWeeklyCount = Math.max(...weeklyStats.map(d => d.total), 1);

    return `
    <div class="stats-dashboard">
      <!-- Today's Summary -->
      <div class="stats-card card">
        <div class="card-header">
          <h3 class="card-title">📊 Today's Progress</h3>
        </div>
        <div class="stats-today">
          <div class="stats-progress-ring">
            <svg viewBox="0 0 100 100">
              <circle class="stats-ring-bg" cx="50" cy="50" r="40"/>
              <circle class="stats-ring-fill" cx="50" cy="50" r="40" 
                      style="stroke-dashoffset: ${251 - (251 * todayStats.completionRate / 100)}"/>
            </svg>
            <div class="stats-ring-value">${todayStats.completionRate}%</div>
          </div>
          <div class="stats-today-details">
            <div class="stats-item">
              <span class="stats-item-value text-success">${todayStats.completed}</span>
              <span class="stats-item-label">Completed</span>
            </div>
            <div class="stats-item">
              <span class="stats-item-value text-warning">${todayStats.pending}</span>
              <span class="stats-item-label">Pending</span>
            </div>
            <div class="stats-item">
              <span class="stats-item-value">${todayStats.total}</span>
              <span class="stats-item-label">Total</span>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Quick Stats -->
      <div class="stats-quick">
        <div class="stats-quick-item card">
          <span class="stats-quick-icon">🔥</span>
          <span class="stats-quick-value">${streak}</span>
          <span class="stats-quick-label">Day Streak</span>
        </div>
        <div class="stats-quick-item card">
          <span class="stats-quick-icon">⚡</span>
          <span class="stats-quick-value">${productivityScore}</span>
          <span class="stats-quick-label">Productivity</span>
        </div>
      </div>
      
      <!-- Weekly Chart -->
      <div class="stats-card card">
        <div class="card-header">
          <h3 class="card-title">📈 This Week</h3>
        </div>
        <div class="stats-chart">
          ${weeklyStats.map(day => `
            <div class="stats-bar-container">
              <div class="stats-bar" style="height: ${(day.total / maxWeeklyCount) * 100}%">
                <div class="stats-bar-fill" style="height: ${day.total > 0 ? (day.completed / day.total) * 100 : 0}%"></div>
              </div>
              <span class="stats-bar-label ${isToday(day.date) ? 'today' : ''}">${day.day}</span>
            </div>
          `).join('')}
        </div>
      </div>
      
      <!-- Categories -->
      ${categoryBreakdown.length > 0 ? `
        <div class="stats-card card">
          <div class="card-header">
            <h3 class="card-title">🏷️ Categories</h3>
          </div>
          <div class="stats-categories">
            ${categoryBreakdown.map(cat => `
              <div class="stats-category">
                <span class="stats-category-icon">${cat.icon}</span>
                <span class="stats-category-name">${cat.name}</span>
                <span class="stats-category-count">${cat.count}</span>
                <div class="stats-category-bar">
                  <div class="stats-category-bar-fill" 
                       style="width: ${(cat.count / Math.max(...categoryBreakdown.map(c => c.count))) * 100}%; 
                              background: ${cat.color}"></div>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      ` : ''}
    </div>
  `;
}

/**
 * Render upcoming events widget
 */
export function renderUpcomingWidget() {
    const events = getAllEvents()
        .filter(e => !e.isCompleted && new Date(e.startDate) >= new Date())
        .sort((a, b) => new Date(a.startDate) - new Date(b.startDate))
        .slice(0, 5);

    if (events.length === 0) {
        return `
      <div class="upcoming-widget card">
        <div class="card-header">
          <h3 class="card-title">📅 Upcoming</h3>
        </div>
        <div class="empty-state p-4">
          <p class="text-sm text-muted">No upcoming events</p>
        </div>
      </div>
    `;
    }

    return `
    <div class="upcoming-widget card">
      <div class="card-header">
        <h3 class="card-title">📅 Upcoming</h3>
      </div>
      <div class="upcoming-list">
        ${events.map(event => `
          <div class="upcoming-item" data-event-id="${event.id}">
            <div class="upcoming-item-color" style="background: var(--cat-${event.category})"></div>
            <div class="upcoming-item-content">
              <div class="upcoming-item-title">${event.title}</div>
              <div class="upcoming-item-time">${formatDate(event.startDate, 'datetime')}</div>
            </div>
            <span class="badge badge-${event.priority}">${event.priority}</span>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}
