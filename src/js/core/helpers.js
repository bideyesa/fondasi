/* fondasi — js/core/helpers.js
 * Internal DOM & utility helpers
 * ─────────────────────────────────────────────── */

/**
 * Query single element
 * @param {string} sel — CSS selector
 * @param {Element|Document} [ctx=document]
 * @returns {Element|null}
 */
export function $(sel, ctx) {
    return (ctx || document).querySelector(sel);
}

/**
 * Query all elements as array
 * @param {string} sel — CSS selector
 * @param {Element|Document} [ctx=document]
 * @returns {Element[]}
 */
export function $$(sel, ctx) {
    return Array.from((ctx || document).querySelectorAll(sel));
}

/**
 * Create DOM element with attributes and children
 * @param {string} tag
 * @param {Object} [attrs]
 * @param {...(string|Element)} [children]
 * @returns {Element}
 */
export function el(tag, attrs, ...children) {
    const e = document.createElement(tag);
    if (attrs) {
        Object.entries(attrs).forEach(([k, v]) => {
            if (k === 'class') {
                e.className = v;
            } else if (k === 'html') {
                e.innerHTML = v;
            } else if (k.startsWith('data-') || k.startsWith('aria-')) {
                e.setAttribute(k, v);
            } else {
                e[k] = v;
            }
        });
    }
    children.forEach(c => {
        if (typeof c === 'string') e.insertAdjacentHTML('beforeend', c);
        else if (c instanceof Element) e.appendChild(c);
    });
    return e;
}

/**
 * Escape HTML special characters
 * @param {string} str
 * @returns {string}
 */
export function esc(str) {
    const d = document.createElement('div');
    d.appendChild(document.createTextNode(String(str)));
    return d.innerHTML;
}

/**
 * Generate unique ID string
 * @param {string} [prefix='fondasi']
 * @returns {string}
 */
export function uid(prefix) {
    return (prefix || 'fondasi') + '-' + Math.random().toString(36).slice(2, 9);
}

/**
 * Attach event listener(s) to one or multiple elements
 * @param {Element|NodeList|Element[]} elem
 * @param {string} evt
 * @param {Function} handler
 * @param {AddEventListenerOptions} [opts]
 * @returns {void}
 */
export function on(elem, evt, handler, opts) {
    if (!elem) return;
    const targets = (elem instanceof NodeList) || Array.isArray(elem)
        ? Array.from(elem)
        : [elem];
    targets.forEach(t => t.addEventListener(evt, handler, opts));
}

/**
 * Dispatch a custom bubbling event
 * @param {Element} elem
 * @param {string} name  — will be prefixed with 'fondasi:'
 * @param {*} [detail={}]
 */
export function emit(elem, name, detail) {
    elem.dispatchEvent(new CustomEvent('fondasi:' + name, {
        bubbles: true,
        cancelable: true,
        detail: detail || {},
    }));
}

/**
 * Trap focus within a container (for modals/drawers)
 * Returns a cleanup function
 * @param {Element} container
 * @returns {Function} cleanup
 */
export function trapFocus(container) {
    const FOCUSABLE = [
        'a[href]', 'button:not([disabled])', 'input:not([disabled])',
        'select:not([disabled])', 'textarea:not([disabled])',
        '[tabindex]:not([tabindex="-1"])',
    ].join(', ');

    function getFocusable() {
        return Array.from(container.querySelectorAll(FOCUSABLE))
            .filter(el => !el.closest('[hidden]'));
    }

    function handleKeydown(e) {
        if (e.key !== 'Tab') return;
        const focusable = getFocusable();
        if (!focusable.length) { e.preventDefault(); return; }
        const first = focusable[0];
        const last  = focusable[focusable.length - 1];
        if (e.shiftKey) {
            if (document.activeElement === first) {
                e.preventDefault();
                last.focus();
            }
        } else {
            if (document.activeElement === last) {
                e.preventDefault();
                first.focus();
            }
        }
    }

    container.addEventListener('keydown', handleKeydown);

    // Auto-focus first focusable element
    const first = getFocusable()[0];
    if (first) first.focus();

    return () => container.removeEventListener('keydown', handleKeydown);
}

/**
 * Check if element or its ancestor matches selector
 * @param {Element} elem
 * @param {string} selector
 * @returns {Element|null}
 */
export function closest(elem, selector) {
    return elem ? elem.closest(selector) : null;
}

/**
 * Debounce a function
 * @param {Function} fn
 * @param {number} wait
 * @returns {Function}
 */
export function debounce(fn, wait) {
    let timer;
    return function (...args) {
        clearTimeout(timer);
        timer = setTimeout(() => fn.apply(this, args), wait);
    };
}
