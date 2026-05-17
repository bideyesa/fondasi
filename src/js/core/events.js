/* fondasi — js/core/events.js
 * Centralised event bus + delegation helpers
 * ─────────────────────────────────────────── */

/**
 * Global event bus — lightweight pub/sub for cross-component communication.
 *
 * Usage:
 *   bus.on('toast:show', handler)
 *   bus.emit('toast:show', { message: 'Saved!' })
 *   bus.off('toast:show', handler)
 */
class EventBus {
    constructor() {
        this._map = new Map();
    }

    /**
     * Subscribe to a named event.
     * @param {string} event
     * @param {Function} handler
     * @returns {Function} unsubscribe
     */
    on(event, handler) {
        if (!this._map.has(event)) this._map.set(event, new Set());
        this._map.get(event).add(handler);
        return () => this.off(event, handler);
    }

    /**
     * Subscribe once — auto-removed after first fire.
     * @param {string} event
     * @param {Function} handler
     * @returns {Function} unsubscribe
     */
    once(event, handler) {
        const wrapper = (detail) => {
            handler(detail);
            this.off(event, wrapper);
        };
        return this.on(event, wrapper);
    }

    /**
     * Unsubscribe a handler (or all handlers for an event).
     * @param {string} event
     * @param {Function} [handler]
     */
    off(event, handler) {
        if (!handler) {
            this._map.delete(event);
        } else {
            this._map.get(event)?.delete(handler);
        }
    }

    /**
     * Emit an event to all subscribers.
     * @param {string} event
     * @param {*} [detail]
     */
    emit(event, detail) {
        this._map.get(event)?.forEach(fn => {
            try { fn(detail); } catch (e) { console.error('[fondasi-bus]', e); }
        });
    }

    /** Remove all subscriptions. */
    clear() {
        this._map.clear();
    }
}

export const bus = new EventBus();

/* ── Event delegation ────────────────────────────────────────────────── */

/**
 * Attach a delegated event listener on a root element.
 * The handler fires when the event target matches `selector`.
 *
 * @param {Element|Document} root
 * @param {string} event     — e.g. 'click'
 * @param {string} selector  — e.g. '[data-modal-open]'
 * @param {Function} handler — called with (matchedElement, originalEvent)
 * @returns {Function} cleanup
 */
export function delegate(root, event, selector, handler) {
    function listener(e) {
        const match = e.target.closest(selector);
        if (match && root.contains(match)) {
            handler(match, e);
        }
    }
    root.addEventListener(event, listener);
    return () => root.removeEventListener(event, listener);
}

/* ── Global auto-init via data-attributes ────────────────────────────── */

/**
 * Registry of [selector → init function] pairs.
 * Components register themselves here so init() can bootstrap everything.
 */
const _registry = [];

/**
 * Register a component for auto-init.
 * @param {string} selector  — e.g. '[data-tabs]'
 * @param {Function} factory — called with each matched element
 */
export function register(selector, factory) {
    _registry.push({ selector, factory });
}

/**
 * Initialise all registered components found inside `root`.
 * Call once on DOMContentLoaded, or again after dynamic DOM insertion.
 *
 * @param {Element|Document} [root=document]
 */
export function initComponents(root) {
    const ctx = root || document;
    _registry.forEach(({ selector, factory }) => {
        ctx.querySelectorAll(selector).forEach(el => {
            if (el._fondasiInit) return; // skip already-initialised
            el._fondasiInit = true;
            try { factory(el); } catch (e) { console.error('[fondasi-init]', selector, e); }
        });
    });
}

export default bus;
