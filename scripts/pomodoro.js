/**
 * Pomodoro Module - Scheduler Assistant
 * Timer functionality for productivity
 */

import { storage } from './storage.js';
import { showToast } from './ui.js';

// State
let timerInterval = null;
let timeRemaining = 0;
let isRunning = false;
let isPaused = false;
let currentMode = 'work'; // work, shortBreak, longBreak
let sessionsCompleted = 0;

// Default settings
const defaultSettings = {
    workDuration: 25,
    shortBreak: 5,
    longBreak: 15,
    sessionsBeforeLongBreak: 4,
    autoStartBreaks: false,
    soundEnabled: true
};

/**
 * Get settings
 */
export function getSettings() {
    const prefs = storage.getPreferences();
    return { ...defaultSettings, ...prefs.pomodoroSettings };
}

/**
 * Get current state
 */
export function getPomodoroState() {
    return {
        timeRemaining,
        isRunning,
        isPaused,
        currentMode,
        sessionsCompleted
    };
}

/**
 * Format time for display
 */
export function formatPomodoroTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

/**
 * Get duration for current mode
 */
function getDuration() {
    const settings = getSettings();
    switch (currentMode) {
        case 'work':
            return settings.workDuration * 60;
        case 'shortBreak':
            return settings.shortBreak * 60;
        case 'longBreak':
            return settings.longBreak * 60;
        default:
            return settings.workDuration * 60;
    }
}

/**
 * Get mode label
 */
export function getModeLabel() {
    switch (currentMode) {
        case 'work':
            return 'Focus Time';
        case 'shortBreak':
            return 'Short Break';
        case 'longBreak':
            return 'Long Break';
        default:
            return 'Focus Time';
    }
}

/**
 * Start timer
 */
export function startTimer(onTick, onComplete) {
    if (isRunning && !isPaused) return;

    if (!isPaused) {
        timeRemaining = getDuration();
    }

    isRunning = true;
    isPaused = false;

    timerInterval = setInterval(() => {
        timeRemaining--;

        if (onTick) {
            onTick(timeRemaining, formatPomodoroTime(timeRemaining));
        }

        if (timeRemaining <= 0) {
            completeSession(onComplete);
        }
    }, 1000);

    return { timeRemaining, formattedTime: formatPomodoroTime(timeRemaining) };
}

/**
 * Pause timer
 */
export function pauseTimer() {
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
    isPaused = true;
    isRunning = false;
}

/**
 * Resume timer
 */
export function resumeTimer(onTick, onComplete) {
    if (!isPaused) return;
    return startTimer(onTick, onComplete);
}

/**
 * Reset timer
 */
export function resetTimer() {
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
    isRunning = false;
    isPaused = false;
    timeRemaining = getDuration();
    return { timeRemaining, formattedTime: formatPomodoroTime(timeRemaining) };
}

/**
 * Stop timer completely
 */
export function stopTimer() {
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
    isRunning = false;
    isPaused = false;
    currentMode = 'work';
    timeRemaining = getDuration();
    sessionsCompleted = 0;
}

/**
 * Complete session
 */
function completeSession(onComplete) {
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }

    isRunning = false;
    isPaused = false;

    const settings = getSettings();

    if (currentMode === 'work') {
        sessionsCompleted++;
        storage.addPomodoroSession(settings.workDuration);

        playNotificationSound();
        showToast('Great job! Take a break.', 'success');

        // Determine next break type
        if (sessionsCompleted % settings.sessionsBeforeLongBreak === 0) {
            currentMode = 'longBreak';
        } else {
            currentMode = 'shortBreak';
        }
    } else {
        playNotificationSound();
        showToast('Break is over. Ready to focus?', 'info');
        currentMode = 'work';
    }

    timeRemaining = getDuration();

    if (onComplete) {
        onComplete({
            mode: currentMode,
            sessionsCompleted,
            timeRemaining,
            formattedTime: formatPomodoroTime(timeRemaining)
        });
    }
}

/**
 * Skip to next session
 */
export function skipSession(onComplete) {
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }

    const settings = getSettings();

    if (currentMode === 'work') {
        // Skip to break
        if (sessionsCompleted % settings.sessionsBeforeLongBreak === 0) {
            currentMode = 'longBreak';
        } else {
            currentMode = 'shortBreak';
        }
    } else {
        currentMode = 'work';
    }

    isRunning = false;
    isPaused = false;
    timeRemaining = getDuration();

    if (onComplete) {
        onComplete({
            mode: currentMode,
            sessionsCompleted,
            timeRemaining,
            formattedTime: formatPomodoroTime(timeRemaining)
        });
    }
}

/**
 * Set mode manually
 */
export function setMode(mode) {
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }

    currentMode = mode;
    isRunning = false;
    isPaused = false;
    timeRemaining = getDuration();

    return { timeRemaining, formattedTime: formatPomodoroTime(timeRemaining) };
}

/**
 * Play notification sound
 */
function playNotificationSound() {
    const settings = getSettings();
    if (!settings.soundEnabled) return;

    try {
        const audio = new Audio('data:audio/mp3;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4Ljc2LjEwMAAAAAAAAAAAAAAA/+M4wAAAAAAAAAAAAEluZm8AAAAPAAAAAwAAAbAAqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq1dXV1dXV1dXV1dXV1dXV1dXV1dXV1dXV1dXV1dXV1dXV////////////////////////////////////////////AAAAAExhdmM1OC4xMzQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABsM/');
        audio.volume = 0.5;
        audio.play().catch(() => {
            // Fallback: use Web Audio API for a simple tone
            try {
                const audioContext = new (window.AudioContext || window.webkitAudioContext)();
                const oscillator = audioContext.createOscillator();
                const gainNode = audioContext.createGain();

                oscillator.connect(gainNode);
                gainNode.connect(audioContext.destination);

                oscillator.frequency.value = 800;
                oscillator.type = 'sine';
                gainNode.gain.value = 0.3;

                oscillator.start();
                oscillator.stop(audioContext.currentTime + 0.3);
            } catch (e) {
                console.log('Audio not available');
            }
        });
    } catch (e) {
        console.log('Audio not available');
    }
}

/**
 * Get progress percentage
 */
export function getProgress() {
    const total = getDuration();
    return ((total - timeRemaining) / total) * 100;
}

/**
 * Get session stats
 */
export function getSessionStats() {
    const stats = storage.getStats();
    return {
        todaySessions: sessionsCompleted,
        totalSessions: stats.pomodoroSessions,
        totalFocusMinutes: stats.totalFocusMinutes,
        totalFocusHours: Math.floor(stats.totalFocusMinutes / 60)
    };
}

/**
 * Render Pomodoro widget HTML
 */
export function renderPomodoroWidget() {
    const progress = getProgress();
    const state = getPomodoroState();
    const stats = getSessionStats();

    return `
    <div class="pomodoro-widget card">
      <div class="pomodoro-header">
        <h3 class="pomodoro-title">🍅 Pomodoro Timer</h3>
        <div class="pomodoro-mode-tabs">
          <button class="pomodoro-mode-tab ${currentMode === 'work' ? 'active' : ''}" data-mode="work">Focus</button>
          <button class="pomodoro-mode-tab ${currentMode === 'shortBreak' ? 'active' : ''}" data-mode="shortBreak">Short</button>
          <button class="pomodoro-mode-tab ${currentMode === 'longBreak' ? 'active' : ''}" data-mode="longBreak">Long</button>
        </div>
      </div>
      
      <div class="pomodoro-timer">
        <div class="pomodoro-ring">
          <svg viewBox="0 0 100 100">
            <circle class="pomodoro-ring-bg" cx="50" cy="50" r="45"/>
            <circle class="pomodoro-ring-progress" cx="50" cy="50" r="45" 
                    style="stroke-dashoffset: ${283 - (283 * progress / 100)}"/>
          </svg>
          <div class="pomodoro-time">${formatPomodoroTime(state.timeRemaining || getDuration())}</div>
          <div class="pomodoro-mode-label">${getModeLabel()}</div>
        </div>
      </div>
      
      <div class="pomodoro-controls">
        <button class="btn btn-ghost btn-icon pomodoro-reset" data-action="reset" title="Reset">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/>
            <path d="M21 3v5h-5"/>
            <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/>
            <path d="M8 16H3v5"/>
          </svg>
        </button>
        <button class="btn btn-primary pomodoro-start" data-action="${state.isRunning ? 'pause' : 'start'}">
          ${state.isRunning ? `
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <rect x="6" y="4" width="4" height="16"/>
              <rect x="14" y="4" width="4" height="16"/>
            </svg>
            Pause
          ` : `
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <polygon points="5 3 19 12 5 21 5 3"/>
            </svg>
            ${state.isPaused ? 'Resume' : 'Start'}
          `}
        </button>
        <button class="btn btn-ghost btn-icon pomodoro-skip" data-action="skip" title="Skip">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polygon points="5 4 15 12 5 20 5 4"/>
            <line x1="19" y1="5" x2="19" y2="19"/>
          </svg>
        </button>
      </div>
      
      <div class="pomodoro-stats">
        <div class="pomodoro-stat">
          <span class="pomodoro-stat-value">${stats.todaySessions}</span>
          <span class="pomodoro-stat-label">Today</span>
        </div>
        <div class="pomodoro-stat">
          <span class="pomodoro-stat-value">${stats.totalSessions}</span>
          <span class="pomodoro-stat-label">Total</span>
        </div>
        <div class="pomodoro-stat">
          <span class="pomodoro-stat-value">${stats.totalFocusHours}h</span>
          <span class="pomodoro-stat-label">Focus</span>
        </div>
      </div>
    </div>
  `;
}
