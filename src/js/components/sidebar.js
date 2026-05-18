/* fondasi — js/components/sidebar.js
 * Collapsible sidebar navigation with active-link tracking
 * ─────────────────────────────────────────── */

import { $$, emit, uid } from '../core/helpers.js';
import { register }      from '../core/events.js';

const ATTR_TOGGLE   = 'data-sidebar-toggle';
const ATTR_COLLAPSE = 'data-sidebar-collapse';
const ATTR_EXPAND   = 'data-sidebar-expand';
const LS_KEY        = 'fondasi-sidebar-collapsed';

class Sidebar {
    /**
     * @param {Element} element — .sidebar element
     * @param {Object}  [options]
     * @param {boolean} [options.collapsed=false]       — start collapsed
     * @param {boolean} [options.persist=true]          — save collapsed state to localStorage
     * @param {boolean} [options.trackActive=true]      — auto-mark active link from location
     * @param {string}  [options.activeAttr='href']     — attribute to match against location
     * @param {Function} [options.onCollapse]
     * @param {Function} [options.onExpand]
     * @param {Function} [options.onChange]
     */
    constructor(element, options) {
        const opts = options || {};

        this._el          = element;
        this._persist     = opts.persist     !== false;
        this._trackActive = opts.trackActive !== false;
        this._onCollapse  = opts.onCollapse  || null;
        this._onExpand    = opts.onExpand    || null;
        this._onChange    = opts.onChange    || null;
        this._isCollapsed = false;

        this._id = element.id || uid('sidebar');
        element.id = this._id;

        const persisted = this._persist
            ? localStorage.getItem(`${LS_KEY}:${this._id}`)
            : null;

        const startCollapsed = persisted !== null
            ? persisted === 'true'
            : (opts.collapsed || element.classList.contains('collapsed') || false);

        if (startCollapsed) {
            this._isCollapsed = true;
            element.classList.add('collapsed', 'sidebar-collapsed');
        }

        if (this._trackActive) this._markActiveLinks();

        this._bindEvents();
        this._updateTogglerAria();
    }

    /* ── Getters ──────────────────────────────────────────────────────── */

    get isCollapsed() { return this._isCollapsed; }
    get element()     { return this._el; }
    get id()          { return this._id; }

    /* ── Public ───────────────────────────────────────────────────────── */

    /**
     * Collapse the sidebar.
     * @param {boolean} [silent=false] — suppress events
     */
    collapse(silent) {
        if (this._isCollapsed) return;
        this._isCollapsed = true;
        this._el.classList.add('collapsed', 'sidebar-collapsed');
        this._updateTogglerAria();
        this._persist && localStorage.setItem(`${LS_KEY}:${this._id}`, 'true');
        if (!silent) {
            emit(this._el, 'sidebar:collapse', { sidebar: this });
            this._onCollapse?.({ sidebar: this });
            this._onChange?.({ collapsed: true, sidebar: this });
        }
    }

    /**
     * Expand the sidebar.
     * @param {boolean} [silent=false] — suppress events
     */
    expand(silent) {
        if (!this._isCollapsed) return;
        this._isCollapsed = false;
        this._el.classList.remove('collapsed', 'sidebar-collapsed');
        this._updateTogglerAria();
        this._persist && localStorage.setItem(`${LS_KEY}:${this._id}`, 'false');
        if (!silent) {
            emit(this._el, 'sidebar:expand', { sidebar: this });
            this._onExpand?.({ sidebar: this });
            this._onChange?.({ collapsed: false, sidebar: this });
        }
    }

    /** Toggle collapsed state. */
    toggle() {
        this._isCollapsed ? this.expand() : this.collapse();
    }

    /**
     * Set the active sidebar item programmatically.
     * @param {string|Element} target — href string or .sidebar-item element
     */
    setActive(target) {
        $$('.sidebar-item', this._el).forEach(item => {
            item.classList.remove('active');
            item.removeAttribute('aria-current');
        });

        let activeItem = null;
        if (target instanceof Element) {
            activeItem = target.closest('.sidebar-item') || target;
        } else if (typeof target === 'string') {
            const link = this._el.querySelector(`.sidebar-item[href="${target}"], .sidebar-item [href="${target}"]`);
            activeItem = link?.closest('.sidebar-item') || link;
        }

        if (activeItem) {
            activeItem.classList.add('active');
            activeItem.setAttribute('aria-current', 'page');
        }
    }

    /** Clear persisted state. */
    clearStorage() {
        localStorage.removeItem(`${LS_KEY}:${this._id}`);
    }

    destroy() {
        this._el.querySelectorAll(`[${ATTR_TOGGLE}], [${ATTR_COLLAPSE}], [${ATTR_EXPAND}]`)
            .forEach(btn => btn.replaceWith(btn.cloneNode(true)));
    }

    /* ── Private ─────────────────────────────────────────────────────── */

    _bindEvents() {
        // Internal toggle / collapse / expand buttons
        this._el.addEventListener('click', (e) => {
            if (e.target.closest(`[${ATTR_TOGGLE}]`))   { e.stopPropagation(); this.toggle(); }
            if (e.target.closest(`[${ATTR_COLLAPSE}]`)) { e.stopPropagation(); this.collapse(); }
            if (e.target.closest(`[${ATTR_EXPAND}]`))   { e.stopPropagation(); this.expand(); }
        });

        if (this._trackActive) {
            this._el.addEventListener('click', (e) => {
                const item = e.target.closest('.sidebar-item');
                if (!item) return;
                // Don't intercept real anchor navigation
                const tag = item.tagName.toLowerCase();
                const parentTag = item.parentElement?.tagName.toLowerCase();
                if (tag === 'a' || parentTag === 'a') return;
                this.setActive(item);
            });
        }

        document.addEventListener('click', (e) => {
            const trigger = e.target.closest(`[${ATTR_TOGGLE}]`);
            if (!trigger) return;
            const targetId = trigger.getAttribute(ATTR_TOGGLE);
            if (targetId && targetId !== this._id) return;
            if (!targetId || targetId === this._id) this.toggle();
        });

        this._el.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && !this._isCollapsed) {
                this.collapse();
                const toggler = document.querySelector(`[${ATTR_TOGGLE}="${this._id}"]`);
                toggler?.focus();
            }
        });
    }

    _markActiveLinks() {
        const path = location.pathname;
        $$('.sidebar-item', this._el).forEach(item => {
            const href = item.getAttribute('href')
                || item.querySelector('a')?.getAttribute('href');
            if (!href) return;
            const isActive = href === path
                || (href !== '/' && path.startsWith(href));
            if (isActive) {
                item.classList.add('active');
                item.setAttribute('aria-current', 'page');
            }
        });
    }

    _updateTogglerAria() {
        $$(`[${ATTR_TOGGLE}]`, this._el).forEach(btn => {
            btn.setAttribute('aria-expanded', String(!this._isCollapsed));
            btn.setAttribute('aria-controls', this._id);
        });
    }
}

/* ── Sidebar Registry ────────────────────────────────────────────────── */

const _sidebars = new Map();

/**
 * Get or create a Sidebar instance.
 * @param {string|Element} target — element or id
 * @param {Object} [options]
 * @returns {Sidebar|null}
 */
export function getSidebar(target, options) {
    const el = (typeof target === 'string')
        ? document.getElementById(target) || document.querySelector(target)
        : target;
    if (!el) return null;
    if (_sidebars.has(el)) return _sidebars.get(el);
    const instance = new Sidebar(el, options);
    _sidebars.set(el, instance);
    return instance;
}

/* ── Declarative init ───────────────────────────────────────────────── */

// [data-sidebar-toggle="sidebar-id"] outside any sidebar triggers toggle
document.addEventListener('click', (e) => {
    const trigger = e.target.closest(`[${ATTR_TOGGLE}]`);
    if (!trigger || trigger.closest('.sidebar')) return; // inner ones handled by class
    const id = trigger.getAttribute(ATTR_TOGGLE);
    if (!id) return;
    getSidebar(id)?.toggle();
});

register('.sidebar', el => getSidebar(el));

export { Sidebar };
export default Sidebar;
