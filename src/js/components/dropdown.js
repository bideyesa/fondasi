/* fondasi — js/components/dropdown.js
 * Dropdown menu / select popover
 * ─────────────────────────────────────────── */

import { $$, emit, uid } from '../core/helpers.js';
import { register }      from '../core/events.js';

const ATTR_TOGGLE = 'data-dropdown-toggle';
const ATTR_ITEM   = 'data-dropdown-item';
const KEY_ESC     = 'Escape';

/** Currently open dropdown (singleton — only one open at a time by default). */
let _active = null;

class Dropdown {
    /**
     * @param {Element} container — .dropdown element
     * @param {Object}  [options]
     * @param {boolean} [options.closeOnSelect=true]
     * @param {boolean} [options.closeOnOutside=true]
     * @param {string}  [options.placement='bottom-start']  — bottom-start | bottom-end | top-start | top-end
     * @param {Function} [options.onOpen]
     * @param {Function} [options.onClose]
     * @param {Function} [options.onSelect]
     */
    constructor(container, options) {
        const opts = options || {};
        this._container      = container;
        this._closeOnSelect  = opts.closeOnSelect  !== false;
        this._closeOnOutside = opts.closeOnOutside !== false;
        this._placement      = opts.placement || container.dataset.placement || 'bottom-start';
        this._onOpen         = opts.onOpen   || null;
        this._onClose        = opts.onClose  || null;
        this._onSelect       = opts.onSelect || null;
        this._isOpen         = false;

        this._id      = container.id || uid('dropdown');
        container.id  = this._id;

        this._toggle  = container.querySelector('[data-dropdown-toggle], .dropdown-toggle');
        this._menu    = container.querySelector('.dropdown-menu');

        if (!this._toggle || !this._menu) return;

        // ARIA
        const menuId = this._menu.id || `${this._id}-menu`;
        this._menu.id = menuId;
        this._toggle.setAttribute('aria-haspopup', 'true');
        this._toggle.setAttribute('aria-expanded', 'false');
        this._toggle.setAttribute('aria-controls', menuId);

        this._bindEvents();
    }

    get isOpen()  { return this._isOpen; }
    get element() { return this._container; }

    /* ── Public ───────────────────────────────────────────────────────── */

    open() {
        if (this._isOpen) return;

        // Close any other open dropdown
        if (_active && _active !== this) _active.close();
        _active = this;

        this._isOpen = true;
        this._container.classList.add('dropdown-open', 'is-open');
        this._menu.removeAttribute('hidden');
        this._toggle.setAttribute('aria-expanded', 'true');

        this._position();

        // Focus first item
        requestAnimationFrame(() => {
            const first = this._getFocusableItems()[0];
            first?.focus();
        });

        emit(this._container, 'dropdown:open', { dropdown: this });
        this._onOpen?.({ dropdown: this });
    }

    close() {
        if (!this._isOpen) return;
        this._isOpen = false;
        if (_active === this) _active = null;

        this._container.classList.remove('dropdown-open', 'is-open');
        this._menu.setAttribute('hidden', '');
        this._toggle.setAttribute('aria-expanded', 'false');
        this._toggle.focus();

        emit(this._container, 'dropdown:close', { dropdown: this });
        this._onClose?.({ dropdown: this });
    }

    toggle() {
        this._isOpen ? this.close() : this.open();
    }

    destroy() {
        document.removeEventListener('click',   this._onDocClick);
        document.removeEventListener('keydown', this._onDocKeydown);
    }

    /* ── Private ─────────────────────────────────────────────────────── */

    _bindEvents() {
        this._toggle.addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggle();
        });

        this._toggle.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                if (!this._isOpen) this.open();
                else {
                    const first = this._getFocusableItems()[0];
                    first?.focus();
                }
            }
            if (e.key === 'ArrowUp') {
                e.preventDefault();
                if (!this._isOpen) this.open();
                else {
                    const items = this._getFocusableItems();
                    items[items.length - 1]?.focus();
                }
            }
        });

        this._menu.addEventListener('keydown', (e) => {
            const items = this._getFocusableItems();
            const idx   = items.indexOf(document.activeElement);

            if (e.key === 'ArrowDown') { e.preventDefault(); items[Math.min(idx + 1, items.length - 1)]?.focus(); }
            if (e.key === 'ArrowUp')   { e.preventDefault(); items[Math.max(idx - 1, 0)]?.focus(); }
            if (e.key === 'Home')      { e.preventDefault(); items[0]?.focus(); }
            if (e.key === 'End')       { e.preventDefault(); items[items.length - 1]?.focus(); }
            if (e.key === KEY_ESC)     { e.preventDefault(); this.close(); }
            if (e.key === 'Tab')       { this.close(); }
        });

        this._menu.addEventListener('click', (e) => {
            const item = e.target.closest('.dropdown-item, [data-dropdown-item]');
            if (!item || item.classList.contains('disabled') || item.hasAttribute('disabled')) return;

            const value = item.dataset.value ?? item.textContent.trim();
            emit(this._container, 'dropdown:select', { item, value, dropdown: this });
            this._onSelect?.({ item, value, dropdown: this });

            if (this._closeOnSelect) this.close();
        });

        // Outside click
        this._onDocClick = (e) => {
            if (this._isOpen && this._closeOnOutside && !this._container.contains(e.target)) {
                this.close();
            }
        };
        document.addEventListener('click', this._onDocClick);
    }

    _getFocusableItems() {
        return $$('.dropdown-item:not(.disabled):not([disabled]), [data-dropdown-item]:not(.disabled)', this._menu)
            .filter(el => !el.hasAttribute('hidden'));
    }

    _position() {
        const toggleRect = this._toggle.getBoundingClientRect();
        const menuStyle  = this._menu.style;

        // Reset first
        menuStyle.top = menuStyle.bottom = menuStyle.left = menuStyle.right = '';

        const [vPos, hPos] = this._placement.split('-');
        const menuHeight   = this._menu.offsetHeight || 200;
        const menuWidth    = this._menu.offsetWidth  || 180;

        const spaceBelow = window.innerHeight - toggleRect.bottom;
        const spaceAbove = toggleRect.top;

        // Auto-flip vertically if needed
        const placementV = (vPos === 'bottom' && spaceBelow < menuHeight && spaceAbove > menuHeight)
            ? 'top' : vPos;

        if (placementV === 'top') {
            menuStyle.bottom = `${this._container.offsetHeight}px`;
            menuStyle.top    = 'auto';
        } else {
            menuStyle.top    = `${this._container.offsetHeight}px`;
            menuStyle.bottom = 'auto';
        }

        if (hPos === 'end') {
            menuStyle.right = '0';
            menuStyle.left  = 'auto';
        } else {
            menuStyle.left  = '0';
            menuStyle.right = 'auto';
        }
    }
}

/* ── Dropdown Registry ───────────────────────────────────────────────── */

const _dropdowns = new Map();

/**
 * Get or create a Dropdown instance.
 * @param {string|Element} target
 * @param {Object} [options]
 * @returns {Dropdown|null}
 */
export function getDropdown(target, options) {
    const el = (typeof target === 'string')
        ? document.getElementById(target) || document.querySelector(target)
        : target;
    if (!el) return null;
    if (_dropdowns.has(el)) return _dropdowns.get(el);
    const instance = new Dropdown(el, options);
    _dropdowns.set(el, instance);
    return instance;
}

/* ── Declarative init ────────────────────────────────────────────────── */

// Close open dropdown on outside click (global fallback)
document.addEventListener('click', (e) => {
    if (_active && !_active.element.contains(e.target)) {
        _active.close();
    }
});

register('.dropdown', el => getDropdown(el));

export { Dropdown };
export default Dropdown;
