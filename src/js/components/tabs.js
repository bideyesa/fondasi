/* fondasi — js/components/tabs.js
 * Tab navigation with panel switching
 * ─────────────────────────────────────────── */

import { $$, emit } from '../core/helpers.js';
import { register } from '../core/events.js';

class Tabs {
    /**
     * @param {Element} container — element containing .tabs and .tab-panel elements
     * @param {Object}  [options]
     * @param {Function} [options.onChange]
     * @param {boolean}  [options.hash=false]   — update URL hash on change
     */
    constructor(container, options) {
        const opts = options || {};
        this._container = container;
        this._onChange  = opts.onChange || null;
        this._hash      = opts.hash     || false;

        this._tabs   = $$('.tab, .tabs-trigger',       container);
        this._panels = $$('.tab-panel, .tabs-content', container);

        if (!this._tabs.length) return;

        this._bindEvents();

        // Activate initial tab
        const active = this._tabs.find(t => t.classList.contains('active'))
                    || (this._hash && this._tabForHash())
                    || this._tabs[0];
        if (active) this._activate(active, true);
    }

    /* ── Public ───────────────────────────────────────────────────────── */

    /**
     * Activate a tab by index or value.
     * @param {number|string} indexOrValue
     */
    select(indexOrValue) {
        let tab;
        if (typeof indexOrValue === 'number') {
            tab = this._tabs[indexOrValue];
        } else {
            tab = this._tabs.find(t =>
                t.dataset.tab === indexOrValue || t.textContent.trim() === indexOrValue
            );
        }
        if (tab) this._activate(tab);
    }

    /** Index of the currently active tab. */
    get activeIndex() {
        return this._tabs.findIndex(t => t.classList.contains('active'));
    }

    /* ── Private ─────────────────────────────────────────────────────── */

    _bindEvents() {
        this._tabs.forEach(tab => {
            tab.addEventListener('click', e => {
                if (tab.disabled || tab.getAttribute('aria-disabled') === 'true') return;
                e.preventDefault();
                this._activate(tab);
            });

            tab.addEventListener('keydown', e => {
                let idx = this._tabs.indexOf(tab);
                if (e.key === 'ArrowRight') { e.preventDefault(); this._focusTab(idx + 1); }
                if (e.key === 'ArrowLeft')  { e.preventDefault(); this._focusTab(idx - 1); }
                if (e.key === 'Home')       { e.preventDefault(); this._focusTab(0); }
                if (e.key === 'End')        { e.preventDefault(); this._focusTab(this._tabs.length - 1); }
            });
        });
    }

    _focusTab(idx) {
        const clamped = Math.max(0, Math.min(idx, this._tabs.length - 1));
        this._tabs[clamped]?.focus();
    }

    _activate(tab, silent) {
        const prev = this._tabs.find(t => t.classList.contains('active'));

        this._tabs.forEach(t => {
            t.classList.remove('active', 'tab-active', 'tabs-trigger-active');
            t.setAttribute('aria-selected', 'false');
            t.setAttribute('tabindex', '-1');
        });

        this._panels.forEach(p => p.classList.remove('active'));

        tab.classList.add('active', 'tab-active', 'tabs-trigger-active');
        tab.setAttribute('aria-selected', 'true');
        tab.setAttribute('tabindex', '0');

        // Match panel by data-tab or aria-controls
        const panelId = tab.dataset.tab || tab.getAttribute('aria-controls');
        const panel   = panelId
            ? this._panels.find(p => p.id === panelId || p.dataset.tab === panelId)
            : this._panels[this._tabs.indexOf(tab)];

        if (panel) panel.classList.add('active');

        if (this._hash && panelId) {
            history.replaceState(null, '', `#${panelId}`);
        }

        if (!silent) {
            emit(tab, 'tabs:change', { tab, panel, previous: prev });
            this._onChange?.({ tab, panel, previous: prev });
        }
    }

    _tabForHash() {
        const hash = location.hash.slice(1);
        if (!hash) return null;
        return this._tabs.find(t => t.dataset.tab === hash || t.getAttribute('aria-controls') === hash);
    }
}

/* ── Auto-init ───────────────────────────────────────────────────────── */
register('[data-tabs]', el => new Tabs(el));
register('.tabs-container', el => new Tabs(el));
register('.tabs', el => new Tabs(el));

export { Tabs };
export default Tabs;
