/* fondasi — js/components/accordion.js
 * Collapsible accordion panels
 * ─────────────────────────────────────────── */

import { $$, emit, uid } from '../core/helpers.js';
import { register }      from '../core/events.js';

class Accordion {
    /**
     * @param {Element} container — .accordion element
     * @param {Object}  [options]
     * @param {boolean} [options.multiple=false]  — allow multiple items open at once
     * @param {boolean} [options.collapsible=true] — allow closing the only open item
     * @param {Function} [options.onChange]
     */
    constructor(container, options) {
        const opts = options || {};
        this._container   = container;
        this._multiple    = opts.multiple    || container.hasAttribute('data-multiple') || false;
        this._collapsible = opts.collapsible !== false;
        this._onChange    = opts.onChange    || null;

        this._items = $$('.accordion-item', container);
        if (!this._items.length) return;

        this._items.forEach(item => this._initItem(item));
    }

    /* ── Public ───────────────────────────────────────────────────────── */

    /**
     * Open an accordion item by index or element.
     * @param {number|Element} target
     */
    open(target) {
        const item = this._resolveItem(target);
        if (item) this._openItem(item);
    }

    /**
     * Close an accordion item by index or element.
     * @param {number|Element} target
     */
    close(target) {
        const item = this._resolveItem(target);
        if (item) this._closeItem(item);
    }

    /**
     * Toggle an accordion item by index or element.
     * @param {number|Element} target
     */
    toggle(target) {
        const item = this._resolveItem(target);
        if (!item) return;
        item.classList.contains('is-open') ? this._closeItem(item) : this._openItem(item);
    }

    /** Open all items (only useful in multiple mode). */
    openAll() {
        this._items.forEach(item => this._openItem(item, true));
    }

    /** Close all items. */
    closeAll() {
        this._items.forEach(item => this._closeItem(item, true));
    }

    /* ── Private ─────────────────────────────────────────────────────── */

    _initItem(item) {
        const trigger = item.querySelector('.accordion-trigger, .accordion-header');
        const body    = item.querySelector('.accordion-body, .accordion-content');
        if (!trigger || !body) return;

        // Ensure IDs for ARIA
        const itemId = item.id || uid('accordion-item');
        item.id = itemId;

        const bodyId = body.id || `${itemId}-body`;
        body.id = bodyId;

        trigger.setAttribute('aria-expanded', item.classList.contains('is-open') ? 'true' : 'false');
        trigger.setAttribute('aria-controls', bodyId);
        body.setAttribute('role', 'region');
        body.setAttribute('aria-labelledby', trigger.id || (trigger.id = `${itemId}-trigger`));

        // Set initial height for animation
        if (!item.classList.contains('is-open')) {
            body.style.height = '0px';
            body.style.overflow = 'hidden';
        }

        trigger.addEventListener('click', (e) => {
            e.preventDefault();
            this.toggle(item);
        });

        trigger.addEventListener('keydown', (e) => {
            const idx = this._items.indexOf(item);
            if (e.key === 'ArrowDown') { e.preventDefault(); this._focusTrigger(idx + 1); }
            if (e.key === 'ArrowUp')   { e.preventDefault(); this._focusTrigger(idx - 1); }
            if (e.key === 'Home')      { e.preventDefault(); this._focusTrigger(0); }
            if (e.key === 'End')       { e.preventDefault(); this._focusTrigger(this._items.length - 1); }
        });
    }

    _openItem(item, silent) {
        const isOpen = item.classList.contains('is-open');
        if (isOpen) return;

        // Close others if not multiple
        if (!this._multiple) {
            this._items.forEach(i => {
                if (i !== item && i.classList.contains('is-open')) {
                    this._closeItem(i, true);
                }
            });
        }

        const trigger = item.querySelector('.accordion-trigger, .accordion-header');
        const body    = item.querySelector('.accordion-body, .accordion-content');
        if (!trigger || !body) return;

        item.classList.add('is-open');
        trigger.setAttribute('aria-expanded', 'true');

        // Animate open
        body.style.overflow = 'hidden';
        body.style.height   = '0px';
        const fullHeight = body.scrollHeight;
        requestAnimationFrame(() => {
            body.style.height = `${fullHeight}px`;
        });

        body.addEventListener('transitionend', () => {
            if (item.classList.contains('is-open')) {
                body.style.height   = 'auto';
                body.style.overflow = '';
            }
        }, { once: true });

        if (!silent) {
            emit(item, 'accordion:open', { item, accordion: this });
            this._onChange?.({ item, open: true, accordion: this });
        }
    }

    _closeItem(item, silent) {
        if (!item.classList.contains('is-open')) return;

        if (!this._collapsible) {
            const openItems = this._items.filter(i => i.classList.contains('is-open'));
            if (openItems.length === 1) return; // can't close the only open item
        }

        const trigger = item.querySelector('.accordion-trigger, .accordion-header');
        const body    = item.querySelector('.accordion-body, .accordion-content');
        if (!trigger || !body) return;

        // Fix height before animating
        body.style.height   = `${body.scrollHeight}px`;
        body.style.overflow = 'hidden';

        requestAnimationFrame(() => {
            body.style.height = '0px';
        });

        item.classList.remove('is-open');
        trigger.setAttribute('aria-expanded', 'false');

        if (!silent) {
            emit(item, 'accordion:close', { item, accordion: this });
            this._onChange?.({ item, open: false, accordion: this });
        }
    }

    _resolveItem(target) {
        if (target instanceof Element) return target;
        if (typeof target === 'number') return this._items[target] || null;
        return null;
    }

    _focusTrigger(idx) {
        const clamped = Math.max(0, Math.min(idx, this._items.length - 1));
        const trigger = this._items[clamped]?.querySelector('.accordion-trigger');
        trigger?.focus();
    }
}

/* ── Auto-init ───────────────────────────────────────────────────────── */
register('.accordion', el => new Accordion(el));

export { Accordion };
export default Accordion;
