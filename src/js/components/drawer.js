/* fondasi — js/components/drawer.js
 * Off-canvas drawer / slide-over panel
 * ─────────────────────────────────────────── */

import { $, emit, trapFocus, uid } from '../core/helpers.js';
import { register }                from '../core/events.js';

const ATTR_OPEN  = 'data-drawer-open';
const ATTR_CLOSE = 'data-drawer-close';
const KEY_ESC    = 'Escape';

class Drawer {
    /**
     * @param {Element} element — .drawer element (not the overlay)
     * @param {Object}  [options]
     * @param {boolean} [options.closeOnOverlay=true]
     * @param {boolean} [options.closeOnEsc=true]
     * @param {Function} [options.onOpen]
     * @param {Function} [options.onClose]
     */
    constructor(element, options) {
        const opts = options || {};
        this._el             = element;
        this._closeOnOverlay = opts.closeOnOverlay !== false;
        this._closeOnEsc     = opts.closeOnEsc     !== false;
        this._onOpen         = opts.onOpen  || null;
        this._onClose        = opts.onClose || null;
        this._releaseFocus   = null;
        this._previousFocus  = null;
        this._isOpen         = false;
        this._overlay        = null;

        this._id = element.id || uid('drawer');
        element.id = this._id;

        // Determine placement from classes
        this._placement = ['drawer-start','drawer-end','drawer-top','drawer-bottom']
            .find(c => element.classList.contains(c))?.replace('drawer-', '') || 'right';

        this._bindInternalClose();
    }

    get isOpen()  { return this._isOpen; }
    get id()      { return this._id; }
    get element() { return this._el; }

    /* ── Public ───────────────────────────────────────────────────────── */

    open() {
        if (this._isOpen) return;
        this._isOpen = true;

        this._previousFocus = document.activeElement;

        // Create backdrop
        this._overlay = document.createElement('div');
        this._overlay.className = 'drawer-overlay';
        this._overlay.setAttribute('aria-hidden', 'true');
        document.body.appendChild(this._overlay);

        if (this._closeOnOverlay) {
            this._overlay.addEventListener('click', () => this.close(), { once: true });
        }

        this._el.removeAttribute('hidden');
        this._el.setAttribute('aria-hidden', 'false');
        document.body.classList.add('drawer-open');

        document.addEventListener('keydown', this._onKeydown = this._handleKeydown.bind(this));

        requestAnimationFrame(() => {
            this._el.classList.add('is-open');
            this._overlay.classList.add('drawer-overlay-open');
            this._releaseFocus = trapFocus(this._el);
        });

        emit(this._el, 'drawer:open', { drawer: this });
        this._onOpen?.({ drawer: this });
    }

    close() {
        if (!this._isOpen) return;
        this._isOpen = false;

        this._el.classList.remove('is-open');
        this._overlay?.classList.remove('drawer-overlay-open');

        const cleanup = () => {
            this._el.setAttribute('hidden', '');
            this._el.setAttribute('aria-hidden', 'true');
            this._overlay?.remove();
            this._overlay = null;
        };

        this._el.addEventListener('transitionend', cleanup, { once: true });
        setTimeout(cleanup, 400); // fallback

        document.body.classList.remove('drawer-open');
        document.removeEventListener('keydown', this._onKeydown);

        this._releaseFocus?.();
        this._releaseFocus = null;
        this._previousFocus?.focus?.();

        emit(this._el, 'drawer:close', { drawer: this });
        this._onClose?.({ drawer: this });
    }

    toggle() { this._isOpen ? this.close() : this.open(); }

    destroy() {
        document.removeEventListener('keydown', this._onKeydown);
        this._overlay?.remove();
    }

    /* ── Private ─────────────────────────────────────────────────────── */

    _bindInternalClose() {
        this._el.querySelectorAll(`[${ATTR_CLOSE}]`).forEach(btn => {
            btn.addEventListener('click', () => this.close());
        });
    }

    _handleKeydown(e) {
        if (this._closeOnEsc && e.key === KEY_ESC) {
            e.preventDefault();
            this.close();
        }
    }
}

/* ── Registry ───────────────────────────────────────────────────────── */

const _drawers = new Map();

/**
 * Get or create a Drawer instance.
 * @param {string|Element} target
 * @param {Object} [options]
 * @returns {Drawer|null}
 */
export function getDrawer(target, options) {
    const el = (typeof target === 'string')
        ? document.getElementById(target) || $(target)
        : target;
    if (!el) return null;
    if (_drawers.has(el)) return _drawers.get(el);
    const instance = new Drawer(el, options);
    _drawers.set(el, instance);
    return instance;
}

/* ── Declarative init ───────────────────────────────────────────────── */

document.addEventListener('click', e => {
    const trigger = e.target.closest(`[${ATTR_OPEN}]`);
    if (!trigger) return;
    const id = trigger.getAttribute(ATTR_OPEN);
    getDrawer(id)?.open();
});

document.addEventListener('click', e => {
    const trigger = e.target.closest(`[${ATTR_CLOSE}]`);
    if (!trigger) return;
    const drawer = trigger.closest('.drawer');
    if (drawer) getDrawer(drawer)?.close();
});

register('.drawer', el => getDrawer(el));

export { Drawer };
export default Drawer;
