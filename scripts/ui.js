/**
 * UI Module - Scheduler Assistant
 * Handles UI utilities like modals, toasts, and theme
 */

import { storage } from './storage.js';

// ==================== Theme ====================

/**
 * Initialize theme
 */
export function initTheme() {
    const theme = storage.getTheme();
    applyTheme(theme);

    // Check for system preference
    if (!storage.get('scheduler_preferences')) {
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        if (prefersDark) {
            applyTheme('dark');
        }
    }
}

/**
 * Apply theme to document
 */
export function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    storage.setTheme(theme);
}

/**
 * Toggle theme
 */
export function toggleTheme() {
    const current = storage.getTheme();
    const newTheme = current === 'dark' ? 'light' : 'dark';
    applyTheme(newTheme);
    return newTheme;
}

// ==================== Modals ====================

/**
 * Open a modal
 */
export function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';

        // Focus first input
        setTimeout(() => {
            const firstInput = modal.querySelector('input, textarea, select');
            if (firstInput) firstInput.focus();
        }, 100);
    }
}

/**
 * Close a modal
 */
export function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('active');
        document.body.style.overflow = '';
    }
}

/**
 * Close all modals
 */
export function closeAllModals() {
    document.querySelectorAll('.modal-overlay.active').forEach(modal => {
        modal.classList.remove('active');
    });
    document.body.style.overflow = '';
}

/**
 * Setup modal close on overlay click
 */
export function setupModalListeners() {
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                overlay.classList.remove('active');
                document.body.style.overflow = '';
            }
        });
    });

    // Close on Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeAllModals();
        }
    });
}

// ==================== Toast Notifications ====================

let toastContainer = null;

/**
 * Initialize toast container
 */
function initToastContainer() {
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.className = 'toast-container';
        document.body.appendChild(toastContainer);
    }
}

/**
 * Show a toast notification
 */
export function showToast(message, type = 'info', duration = 3000) {
    initToastContainer();

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;

    const icons = {
        success: `<svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 6L9 17l-5-5"/></svg>`,
        error: `<svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="m15 9-6 6M9 9l6 6"/></svg>`,
        warning: `<svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 9v4M12 17h.01"/><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/></svg>`,
        info: `<svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>`
    };

    toast.innerHTML = `
    ${icons[type] || icons.info}
    <span class="toast-message">${message}</span>
    <button class="toast-close">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M18 6L6 18M6 6l12 12"/>
      </svg>
    </button>
  `;

    const closeBtn = toast.querySelector('.toast-close');
    closeBtn.addEventListener('click', () => removeToast(toast));

    toastContainer.appendChild(toast);

    // Auto remove
    if (duration > 0) {
        setTimeout(() => removeToast(toast), duration);
    }

    return toast;
}

/**
 * Remove a toast
 */
function removeToast(toast) {
    toast.classList.add('removing');
    setTimeout(() => toast.remove(), 200);
}

// ==================== Dropdowns ====================

/**
 * Toggle dropdown
 */
export function toggleDropdown(element) {
    const dropdown = element.closest('.dropdown');
    if (dropdown) {
        const isActive = dropdown.classList.contains('active');
        closeAllDropdowns();
        if (!isActive) {
            dropdown.classList.add('active');
        }
    }
}

/**
 * Close all dropdowns
 */
export function closeAllDropdowns() {
    document.querySelectorAll('.dropdown.active').forEach(dropdown => {
        dropdown.classList.remove('active');
    });
}

/**
 * Setup dropdown listeners
 */
export function setupDropdownListeners() {
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.dropdown')) {
            closeAllDropdowns();
        }
    });
}

// ==================== Switch/Toggle ====================

/**
 * Toggle switch state
 */
export function toggleSwitch(element) {
    element.classList.toggle('active');
    return element.classList.contains('active');
}

// ==================== Drag and Drop ====================

let draggedElement = null;
let dragData = null;

/**
 * Setup drag and drop for events
 */
export function setupDragAndDrop(container, onDrop) {
    container.addEventListener('dragstart', (e) => {
        const eventEl = e.target.closest('[data-event-id]');
        if (eventEl) {
            draggedElement = eventEl;
            dragData = eventEl.dataset.eventId;
            eventEl.classList.add('dragging');
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/plain', dragData);
        }
    });

    container.addEventListener('dragend', (e) => {
        if (draggedElement) {
            draggedElement.classList.remove('dragging');
            draggedElement = null;
            dragData = null;
        }
        document.querySelectorAll('.drop-target').forEach(el => {
            el.classList.remove('drop-target', 'drop-target-active');
        });
    });

    container.addEventListener('dragover', (e) => {
        e.preventDefault();
        const dropTarget = e.target.closest('[data-date]');
        if (dropTarget) {
            e.dataTransfer.dropEffect = 'move';
            dropTarget.classList.add('drop-target');
        }
    });

    container.addEventListener('dragleave', (e) => {
        const dropTarget = e.target.closest('[data-date]');
        if (dropTarget) {
            dropTarget.classList.remove('drop-target');
        }
    });

    container.addEventListener('drop', (e) => {
        e.preventDefault();
        const dropTarget = e.target.closest('[data-date]');
        if (dropTarget && dragData) {
            const targetDate = dropTarget.dataset.date;
            dropTarget.classList.remove('drop-target', 'drop-target-active');
            if (onDrop) {
                onDrop(dragData, targetDate);
            }
        }
    });
}

// ==================== Loading States ====================

/**
 * Show loading state
 */
export function showLoading(element) {
    element.classList.add('loading');
    const spinner = document.createElement('div');
    spinner.className = 'spinner';
    element.appendChild(spinner);
}

/**
 * Hide loading state
 */
export function hideLoading(element) {
    element.classList.remove('loading');
    const spinner = element.querySelector('.spinner');
    if (spinner) spinner.remove();
}

// ==================== Confirmation Dialog ====================

/**
 * Show confirmation dialog
 */
export function confirm(message, onConfirm, onCancel) {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay active';
    overlay.innerHTML = `
    <div class="modal" style="max-width: 400px;">
      <div class="modal-header">
        <h3 class="modal-title">Confirm</h3>
      </div>
      <div class="modal-body">
        <p>${message}</p>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary cancel-btn">Cancel</button>
        <button class="btn btn-danger confirm-btn">Confirm</button>
      </div>
    </div>
  `;

    document.body.appendChild(overlay);

    overlay.querySelector('.confirm-btn').addEventListener('click', () => {
        overlay.remove();
        if (onConfirm) onConfirm();
    });

    overlay.querySelector('.cancel-btn').addEventListener('click', () => {
        overlay.remove();
        if (onCancel) onCancel();
    });

    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
            overlay.remove();
            if (onCancel) onCancel();
        }
    });
}

// ==================== Color Picker ====================

/**
 * Setup color picker
 */
export function setupColorPicker(container, onSelect) {
    const swatches = container.querySelectorAll('.color-swatch');
    swatches.forEach(swatch => {
        swatch.addEventListener('click', () => {
            swatches.forEach(s => s.classList.remove('selected'));
            swatch.classList.add('selected');
            if (onSelect) {
                onSelect(swatch.dataset.color);
            }
        });
    });
}

// ==================== Initialize ====================

/**
 * Initialize all UI components
 */
export function initUI() {
    initTheme();
    setupModalListeners();
    setupDropdownListeners();
}
