/* fondasi — js/components/toast.js
 * Toast / notification system
 * ─────────────────────────────────────────── */

import { el, uid } from '../core/helpers.js';
import { bus }     from '../core/events.js';

const ICONS = {
    success: `<svg viewBox="0 0 20 20" fill="currentColor" width="18" height="18"><path fill-rule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16zm3.707-9.293a1 1 0 0 0-1.414-1.414L9 10.586 7.707 9.293a1 1 0 0 0-1.414 1.414l2 2a1 1 0 0 0 1.414 0l4-4z" clip-rule="evenodd"/></svg>`,
    warning: `<svg viewBox="0 0 20 20" fill="currentColor" width="18" height="18"><path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 1 1-2 0 1 1 0 0 1 2 0zm-1-8a1 1 0 0 0-1 1v3a1 1 0 0 0 2 0V6a1 1 0 0 0-1-1z" clip-rule="evenodd"/></svg>`,
    danger:  `<svg viewBox="0 0 20 20" fill="currentColor" width="18" height="18"><path fill-rule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM8.707 7.293a1 1 0 0 0-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 1 0 1.414 1.414L10 11.414l1.293 1.293a1 1 0 0 0 1.414-1.414L11.414 10l1.293-1.293a1 1 0 0 0-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"/></svg>`,
    info:    `<svg viewBox="0 0 20 20" fill="currentColor" width="18" height="18"><path fill-rule="evenodd" d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0zm-7-4a1 1 0 1 1-2 0 1 1 0 0 1 2 0zM9 9a1 1 0 0 0 0 2v3a1 1 0 0 0 1 1h1a1 1 0 1 0 0-2v-3a1 1 0 0 0-1-1H9z" clip-rule="evenodd"/></svg>`,
};

const CLOSE_SVG = `<svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16"><path fill-rule="evenodd" d="M4.293 4.293a1 1 0 0 1 1.414 0L10 8.586l4.293-4.293a1 1 0 1 1 1.414 1.414L11.414 10l4.293 4.293a1 1 0 0 1-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 0 1-1.414-1.414L8.586 10 4.293 5.707a1 1 0 0 1 0-1.414z" clip-rule="evenodd"/></svg>`;

const DEFAULTS = {
    position: 'top-right', // top-right | top-left | top-center | bottom-right | bottom-left | bottom-center
    duration:  4000,
    closable:  true,
    progress:  true,
    max:       5,
};

class ToastManager {
    /**
     * @param {typeof DEFAULTS} [options]
     */
    constructor(options) {
        this._opts       = Object.assign({}, DEFAULTS, options);
        this._containers = {};
        this._queue      = [];

        // Listen to bus
        bus.on('toast:show', opts => this.show(opts));
        bus.on('toast:clear', ()   => this.clear());
    }

    /* ── Public API ──────────────────────────────────────────────────── */

    /**
     * Show a toast notification.
     * @param {Object|string} options  — string shorthand = { message }
     * @param {'success'|'warning'|'danger'|'info'} [options.type='info']
     * @param {string} [options.title]
     * @param {string} options.message
     * @param {number} [options.duration]
     * @param {boolean} [options.closable]
     * @param {boolean} [options.progress]
     * @param {string}  [options.position]
     * @param {Array<{label:string, action:Function}>} [options.actions]
     * @returns {string} toast id
     */
    show(options) {
        const opts = (typeof options === 'string')
            ? { message: options }
            : { ...options };

        opts.type     = opts.type     || 'info';
        opts.duration = opts.duration ?? this._opts.duration;
        opts.closable = opts.closable ?? this._opts.closable;
        opts.progress = opts.progress ?? this._opts.progress;
        opts.position = opts.position || this._opts.position;
        opts.id       = opts.id       || uid('toast');

        const container = this._getContainer(opts.position);
        const toastEl   = this._build(opts);

        // Respect max limit
        const existing = container.querySelectorAll('.toast');
        if (existing.length >= this._opts.max) {
            this._hide(existing[0]);
        }

        container.appendChild(toastEl);
        requestAnimationFrame(() => toastEl.style.opacity = '1');

        if (opts.duration > 0) {
            opts._timer = setTimeout(() => this._hide(toastEl), opts.duration);
        }

        return opts.id;
    }

    /** Convenience shortcuts */
    success(message, opts) { return this.show({ ...opts, type: 'success', message }); }
    warning(message, opts) { return this.show({ ...opts, type: 'warning', message }); }
    danger (message, opts) { return this.show({ ...opts, type: 'danger',  message }); }
    info   (message, opts) { return this.show({ ...opts, type: 'info',    message }); }

    /**
     * Hide a specific toast by id.
     * @param {string} id
     */
    dismiss(id) {
        const el = document.getElementById(id);
        if (el) this._hide(el);
    }

    /** Remove all toasts. */
    clear() {
        Object.values(this._containers).forEach(container => {
            container.querySelectorAll('.toast').forEach(t => this._hide(t));
        });
    }

    /* ── Private ─────────────────────────────────────────────────────── */

    _getContainer(position) {
        if (this._containers[position]) return this._containers[position];

        const c = el('div', { class: `toast-container ${position}` });
        document.body.appendChild(c);
        this._containers[position] = c;
        return c;
    }

    _build(opts) {
        const toast = el('div', {
            class: `toast toast-${opts.type}`,
            id:    opts.id,
            role:  'alert',
            'aria-live': opts.type === 'danger' ? 'assertive' : 'polite',
        });

        // Icon
        if (ICONS[opts.type]) {
            toast.appendChild(el('span', { class: 'toast-icon', html: ICONS[opts.type] }));
        }

        // Content
        const content = el('div', { class: 'toast-content' });
        if (opts.title) {
            content.appendChild(el('div', { class: 'toast-title', textContent: opts.title }));
        }
        content.appendChild(el('div', { class: 'toast-message', textContent: opts.message }));

        // Actions
        if (opts.actions?.length) {
            const actions = el('div', { class: 'toast-actions' });
            opts.actions.forEach(({ label, action }) => {
                const btn = el('button', { class: 'toast-action', textContent: label, type: 'button' });
                btn.addEventListener('click', () => {
                    action?.();
                    this._hide(toast);
                });
                actions.appendChild(btn);
            });
            content.appendChild(actions);
        }

        toast.appendChild(content);

        // Close button
        if (opts.closable) {
            const closeBtn = el('button', { class: 'toast-close', 'aria-label': 'Close', html: CLOSE_SVG, type: 'button' });
            closeBtn.addEventListener('click', () => this._hide(toast));
            toast.appendChild(closeBtn);
        }

        // Progress bar
        if (opts.progress && opts.duration > 0) {
            const bar = el('div', { class: 'toast-progress' });
            bar.style.animationDuration = `${opts.duration}ms`;
            toast.appendChild(bar);
        }

        toast.style.opacity = '0';
        return toast;
    }

    _hide(toastEl) {
        if (!toastEl || toastEl.classList.contains('toast-exit')) return;
        toastEl.classList.add('toast-exit');
        toastEl.addEventListener('animationend', () => toastEl.remove(), { once: true });
        // Fallback removal
        setTimeout(() => toastEl.remove(), 500);
    }
}

/* ── Singleton ──────────────────────────────────────────────────────── */

let _instance = null;

/**
 * Get (or create) the global toast manager.
 * @param {Object} [options]
 * @returns {ToastManager}
 */
export function getToast(options) {
    if (!_instance) _instance = new ToastManager(options);
    return _instance;
}

export { ToastManager };
export default ToastManager;
