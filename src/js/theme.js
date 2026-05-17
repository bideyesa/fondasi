/* fondasi — js/theme.js
 * Theme manager: light/dark mode, token overrides, persistence
 * ─────────────────────────────────────────────────────────── */

const STORAGE_KEY = 'fondasi-theme';
const ATTR        = 'data-theme';

/* ── Token maps ─────────────────────────────────────────────────────── */

const THEMES = {
    light: {
        /* Surface & Background */
        '--color-bg':        '#f5f4f2',
        '--color-surface':   '#ffffff',
        '--color-surface-2': '#f8f7f5',
        '--color-surface-3': '#f0eeec',
        '--color-surface-4': '#e8e6e3',

        /* Border */
        '--color-border':        '#dddbd8',
        '--color-border-strong': '#c4c1bc',
        '--color-border-subtle': '#eae8e5',

        /* Text */
        '--color-text':     '#1e1c1a',
        '--color-text-2':   '#4e4a47',
        '--color-text-3':   '#88837b',
        '--color-text-4':   '#aaa69f',
        '--color-text-inv': '#ffffff',

        /* Brand */
        '--color-brand':        '#1e3a5f',
        '--color-brand-dark':   '#132a4a',
        '--color-brand-darker': '#0a1b32',
        '--color-brand-light':  '#e8edf5',
        '--color-brand-mid':    '#b3bfd3',
        '--color-brand-text':   '#1e3a5f',
        '--color-brand-rgb':    '30, 58, 95',
    },

    dark: {
        /* Surface & Background */
        '--color-bg':        '#111110',
        '--color-surface':   '#1c1b1a',
        '--color-surface-2': '#242322',
        '--color-surface-3': '#2d2c2a',
        '--color-surface-4': '#363533',

        /* Border */
        '--color-border':        '#3a3835',
        '--color-border-strong': '#4e4b47',
        '--color-border-subtle': '#2c2b29',

        /* Text */
        '--color-text':     '#f0eeec',
        '--color-text-2':   '#c8c4bf',
        '--color-text-3':   '#8a8680',
        '--color-text-4':   '#5c5955',
        '--color-text-inv': '#1e1c1a',

        /* Brand (lightened for dark bg) */
        '--color-brand':        '#6b91bf',
        '--color-brand-dark':   '#8aaed4',
        '--color-brand-darker': '#adc5e3',
        '--color-brand-light':  '#1a2535',
        '--color-brand-mid':    '#3a4e6a',
        '--color-brand-text':   '#a5c0e0',
        '--color-brand-rgb':    '107, 145, 191',

        /* Semantic overrides for dark */
        '--color-success':        '#2ea65e',
        '--color-success-bg':     '#0f2c1c',
        '--color-success-text':   '#6cd49a',
        '--color-success-border': '#1e5c38',

        '--color-warning':        '#d4920a',
        '--color-warning-bg':     '#2c200a',
        '--color-warning-text':   '#e8b84d',
        '--color-warning-border': '#6a4a10',

        '--color-danger':         '#d45555',
        '--color-danger-bg':      '#2c1010',
        '--color-danger-text':    '#e88a8a',
        '--color-danger-border':  '#6a2020',

        '--color-info':           '#4a82cc',
        '--color-info-bg':        '#101c2c',
        '--color-info-text':      '#7aabe0',
        '--color-info-border':    '#1e3d6a',
    },
};

/* ── Internal helpers ───────────────────────────────────────────────── */

function applyTokens(tokens, root) {
    const el = root || document.documentElement;
    Object.entries(tokens).forEach(([prop, val]) => {
        el.style.setProperty(prop, val);
    });
}

function clearTokens(tokens, root) {
    const el = root || document.documentElement;
    Object.keys(tokens).forEach(prop => {
        el.style.removeProperty(prop);
    });
}

function getSystemPreference() {
    return window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light';
}

/* ── FondasiTheme class ─────────────────────────────────────────────── */

class FondasiTheme {

    /**
     * @param {Object} [options]
     * @param {'light'|'dark'|'system'} [options.default='system']
     * @param {boolean} [options.persist=true]  — save to localStorage
     * @param {Element} [options.root]           — token target (default: <html>)
     * @param {Record<string,Record<string,string>>} [options.themes] — custom theme overrides
     */
    constructor(options) {
        const opts = options || {};
        this._defaultMode = opts.default || 'system';
        this._persist     = opts.persist !== false;
        this._root        = opts.root || document.documentElement;
        this._themes      = Object.assign({}, THEMES, opts.themes || {});
        this._listeners   = [];

        // Bind system preference change
        this._mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        this._onSystemChange = this._onSystemChange.bind(this);
        this._mediaQuery.addEventListener('change', this._onSystemChange);

        // Initialize
        this._init();
    }

    /* ── Public API ──────────────────────────────────────────────────── */

    /** Current resolved theme ('light' | 'dark') */
    get current() {
        return this._current;
    }

    /** Raw saved preference ('light' | 'dark' | 'system') */
    get preference() {
        return this._preference;
    }

    /**
     * Set theme preference
     * @param {'light'|'dark'|'system'} mode
     */
    set(mode) {
        if (!['light', 'dark', 'system'].includes(mode)) {
            console.warn('[fondasi-theme] Unknown mode:', mode);
            return;
        }
        this._preference = mode;
        if (this._persist) {
            try { localStorage.setItem(STORAGE_KEY, mode); } catch (_) {}
        }
        this._apply();
    }

    /** Toggle between light and dark (ignores system) */
    toggle() {
        this.set(this._current === 'dark' ? 'light' : 'dark');
    }

    /** Listen to theme change events */
    on(fn) {
        this._listeners.push(fn);
        return () => this.off(fn);
    }

    /** Remove a listener */
    off(fn) {
        this._listeners = this._listeners.filter(l => l !== fn);
    }

    /**
     * Override individual CSS tokens at runtime
     * @param {Record<string,string>} tokens — e.g. { '--color-brand': '#e63946' }
     * @param {'light'|'dark'} [themeName]   — omit to apply to both
     */
    setTokens(tokens, themeName) {
        if (themeName) {
            this._themes[themeName] = Object.assign({}, this._themes[themeName], tokens);
            if (this._current === themeName) {
                applyTokens(tokens, this._root);
            }
        } else {
            applyTokens(tokens, this._root);
        }
    }

    /** Remove the theme manager and clean up listeners */
    destroy() {
        this._mediaQuery.removeEventListener('change', this._onSystemChange);
        this._listeners = [];
        this._root.removeAttribute(ATTR);
        clearTokens({ ...THEMES.light, ...THEMES.dark }, this._root);
    }

    /* ── Private ─────────────────────────────────────────────────────── */

    _init() {
        let saved = null;
        if (this._persist) {
            try { saved = localStorage.getItem(STORAGE_KEY); } catch (_) {}
        }
        this._preference = saved || this._defaultMode;
        this._apply(true);
    }

    _resolve() {
        return this._preference === 'system'
            ? getSystemPreference()
            : this._preference;
    }

    _apply(silent) {
        const resolved = this._resolve();
        const prev     = this._current;
        this._current  = resolved;

        // Set data-theme attribute
        this._root.setAttribute(ATTR, resolved);

        // Apply token overrides
        const tokens = this._themes[resolved];
        if (tokens) applyTokens(tokens, this._root);

        if (!silent && resolved !== prev) {
            this._emit(resolved, prev);
        }
    }

    _onSystemChange() {
        if (this._preference === 'system') {
            this._apply();
        }
    }

    _emit(current, previous) {
        const detail = { current, previous };
        this._listeners.forEach(fn => fn(detail));
        this._root.dispatchEvent(new CustomEvent('fondasi:themechange', {
            bubbles: true,
            detail,
        }));
    }
}

/* ── Singleton ──────────────────────────────────────────────────────── */

let _instance = null;

/**
 * Get (or create) the global FondasiTheme singleton.
 * @param {Object} [options] — only used on first call
 * @returns {FondasiTheme}
 */
export function getTheme(options) {
    if (!_instance) {
        _instance = new FondasiTheme(options);
    }
    return _instance;
}

export { FondasiTheme, THEMES };
export default FondasiTheme;
