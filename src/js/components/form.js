/* fondasi — js/components/form.js
 * Form utilities — validation, character counter, password toggle
 * ─────────────────────────────────────────── */

import { $, $$, emit, uid } from '../core/helpers.js';
import { register }                   from '../core/events.js';

/* ══════════════════════════════════════════════
   1. FIELD VALIDATION
   ══════════════════════════════════════════════ */

/**
 * Show or clear a validation error on a .form-group.
 * @param {Element} field  — input / select / textarea
 * @param {string|null} message — null or '' to clear the error
 */
export function setFieldError(field, message) {
    const group = field.closest('.form-group');
    if (!group) return;

    // Toggle error class on the field itself
    field.classList.toggle('is-error', !!message);
    field.classList.toggle('form-input-error', !!message);
    field.setAttribute('aria-invalid', message ? 'true' : 'false');

    // Find or create the .form-error element
    let errorEl = group.querySelector('.form-error[data-field-error]');

    if (message) {
        if (!errorEl) {
            errorEl = document.createElement('span');
            errorEl.className = 'form-error';
            errorEl.setAttribute('data-field-error', '');
            errorEl.setAttribute('role', 'alert');
            errorEl.setAttribute('aria-live', 'polite');

            // Insert after hint or at end of group
            const hint = group.querySelector('.form-hint');
            if (hint) hint.insertAdjacentElement('afterend', errorEl);
            else group.appendChild(errorEl);
        }

        const errId = errorEl.id || uid('err');
        errorEl.id = errId;
        errorEl.textContent = message;
        field.setAttribute('aria-describedby',
            [field.getAttribute('aria-describedby'), errId].filter(Boolean).join(' '));
    } else {
        if (errorEl) {
            errorEl.remove();
            // Clean up aria-describedby
            const errId = errorEl.id;
            if (errId) {
                const described = (field.getAttribute('aria-describedby') || '')
                    .split(' ').filter(id => id !== errId).join(' ');
                if (described) field.setAttribute('aria-describedby', described);
                else field.removeAttribute('aria-describedby');
            }
        }
    }
}

/**
 * Clear all field errors inside a form or container.
 * @param {Element} form
 */
export function clearFormErrors(form) {
    $$(`.is-error`, form).forEach(f => setFieldError(f, null));
}

/* ── Simple required / pattern checker ───────────────────────────────── */

const _rules = {
    required: (val) => val.trim().length > 0 || 'This field is required.',
    email:    (val) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val.trim()) || 'Enter a valid email address.',
    url:      (val) => { try { new URL(val); return true; } catch { return 'Enter a valid URL.'; } },
    min:      (val, attr) => Number(val) >= Number(attr) || `Minimum value is ${attr}.`,
    max:      (val, attr) => Number(val) <= Number(attr) || `Maximum value is ${attr}.`,
    minlength:(val, attr) => val.trim().length >= Number(attr) || `Minimum ${attr} characters required.`,
    maxlength:(val, attr) => val.trim().length <= Number(attr) || `Maximum ${attr} characters allowed.`,
    pattern:  (val, attr, field) => {
        const re = new RegExp(field.pattern);
        return re.test(val) || (field.title || 'Invalid format.');
    },
};

/**
 * Validate a single field against HTML5 + data-* attributes.
 * Returns null if valid, or an error string if invalid.
 *
 * @param {HTMLInputElement|HTMLSelectElement|HTMLTextAreaElement} field
 * @returns {string|null}
 */
export function validateField(field) {
    const val = field.value;

    // Skip hidden / disabled / readonly
    if (field.disabled || field.readOnly || field.type === 'hidden') return null;

    for (const [rule, fn] of Object.entries(_rules)) {
        const attrMap = { required: 'required', email: null, url: null,
                          min: 'min', max: 'max', minlength: 'minlength',
                          maxlength: 'maxlength', pattern: 'pattern' };
        const attr = attrMap[rule];
        const applies = attr === null
            ? field.getAttribute('data-validate')?.includes(rule) || field.type === rule
            : field.hasAttribute(attr);

        if (!applies) continue;

        const result = fn(val, attr !== null ? field.getAttribute(attr) : null, field);
        if (result !== true) return result;
    }

    return null;
}

/**
 * Validate all fields inside a form.
 * Returns true if the form is valid, false otherwise.
 * Applies / clears .form-error for each field.
 *
 * @param {Element} form
 * @returns {boolean}
 */
export function validateForm(form) {
    let valid = true;
    $$('input, select, textarea', form).forEach(field => {
        const error = validateField(field);
        setFieldError(field, error);
        if (error) valid = false;
    });
    if (!valid) {
        const firstErr = $('[aria-invalid="true"]', form);
        firstErr?.focus();
    }
    return valid;
}


/* ══════════════════════════════════════════════
   2. CHARACTER COUNTER
   ══════════════════════════════════════════════ */

class CharCounter {
    /**
     * @param {HTMLInputElement|HTMLTextAreaElement} field
     * @param {Object} [options]
     * @param {number} [options.max]       — defaults to field maxlength attribute
     * @param {number} [options.warnAt]    — percentage at which to show warning state (default 80)
     */
    constructor(field, options) {
        const opts = options || {};
        this._field  = field;
        this._max    = opts.max || Number(field.getAttribute('maxlength')) || 0;
        this._warnAt = opts.warnAt || 80;
        this._counter = null;

        if (!this._max) return; // nothing to count

        this._counter = field.closest('.form-group')?.querySelector('.form-counter')
            || this._createCounter();

        this._onInput = () => this._update();
        this._update();
        field.addEventListener('input', this._onInput);
    }

    _createCounter() {
        const counter = document.createElement('span');
        counter.className = 'form-counter';
        counter.setAttribute('aria-live', 'polite');
        this._field.closest('.form-group')?.appendChild(counter);
        return counter;
    }

    _update() {
        const len  = this._field.value.length;
        const pct  = this._max ? Math.round((len / this._max) * 100) : 0;

        this._counter.textContent = `${len} / ${this._max}`;
        this._counter.classList.toggle('is-warn',  pct >= this._warnAt && pct < 100);
        this._counter.classList.toggle('is-error', len > this._max);

        // Optionally enforce hard limit
        if (len > this._max) {
            setFieldError(this._field, `Maximum ${this._max} characters allowed.`);
        } else {
            setFieldError(this._field, null);
        }
    }

    destroy() {
        this._field.removeEventListener('input', this._onInput);
        this._counter?.remove();
    }
}

/**
 * Attach a character counter to a field.
 * @param {HTMLInputElement|HTMLTextAreaElement} field
 * @param {Object} [options]
 * @returns {CharCounter}
 */
export function charCounter(field, options) {
    return new CharCounter(field, options);
}

/* ── Auto-init [data-char-counter] ───────────────────────────────────── */
register('[data-char-counter]', el => {
    const max    = Number(el.dataset.charCounter) || undefined;
    const warnAt = Number(el.dataset.warnAt)      || undefined;
    charCounter(el, { max, warnAt });
});


/* ══════════════════════════════════════════════
   3. PASSWORD TOGGLE
   ══════════════════════════════════════════════ */

const SVG_SHOW = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0z"/><path stroke-linecap="round" stroke-linejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>`;
const SVG_HIDE = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M13.875 18.825A10.05 10.05 0 0 1 12 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 0 1 4.04-5.37M9.88 9.88a3 3 0 0 0 4.243 4.243M3 3l18 18"/></svg>`;

class PasswordToggle {
    /**
     * @param {HTMLInputElement} field — input[type="password"]
     * @param {Object} [options]
     * @param {string} [options.showLabel='Show password']
     * @param {string} [options.hideLabel='Hide password']
     */
    constructor(field, options) {
        const opts = options || {};
        this._field     = field;
        this._showLabel = opts.showLabel || 'Show password';
        this._hideLabel = opts.hideLabel || 'Hide password';
        this._visible   = false;

        // Find or create toggle button inside .input-wrap
        this._wrap   = field.closest('.input-wrap');
        this._button = this._wrap?.querySelector('.input-action[data-password-toggle]')
            || this._createButton();

        this._update();
        this._button.addEventListener('click', () => this.toggle());
    }

    toggle() {
        this._visible = !this._visible;
        this._field.type = this._visible ? 'text' : 'password';
        this._update();
        emit(this._field, 'password:toggle', { visible: this._visible });
    }

    show() { if (!this._visible) this.toggle(); }
    hide() { if (this._visible)  this.toggle(); }

    _createButton() {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'input-action';
        btn.setAttribute('data-password-toggle', '');
        btn.setAttribute('tabindex', '0');

        if (this._wrap) {
            this._wrap.appendChild(btn);
            this._wrap.classList.add('has-icon-right');
        } else {
            this._field.insertAdjacentElement('afterend', btn);
        }

        return btn;
    }

    _update() {
        this._button.innerHTML  = this._visible ? SVG_HIDE : SVG_SHOW;
        this._button.setAttribute('aria-label', this._visible ? this._hideLabel : this._showLabel);
        this._button.setAttribute('aria-pressed', String(this._visible));
    }
}

/**
 * Attach a password visibility toggle to a field.
 * @param {HTMLInputElement} field
 * @param {Object} [options]
 * @returns {PasswordToggle}
 */
export function passwordToggle(field, options) {
    return new PasswordToggle(field, options);
}

/* ── Auto-init [data-password-toggle] ────────────────────────────────── */
register('[data-password-toggle]', el => {
    if (el.tagName === 'INPUT') passwordToggle(el);
});


/* ── Auto-init inline validation (blur) ──────────────────────────────── */
register('[data-validate]', el => {
    el.addEventListener('blur', () => {
        const error = validateField(el);
        setFieldError(el, error);
    });
    el.addEventListener('input', () => {
        if (el.classList.contains('is-error')) {
            const error = validateField(el);
            setFieldError(el, error);
        }
    });
});

/* ── Auto-init form submission validation ────────────────────────────── */
register('form[data-validate-form]', form => {
    form.setAttribute('novalidate', '');
    form.addEventListener('submit', e => {
        if (!validateForm(form)) {
            e.preventDefault();
            emit(form, 'form:invalid', { form });
        } else {
            emit(form, 'form:valid', { form });
        }
    });
});

export { CharCounter, PasswordToggle };
