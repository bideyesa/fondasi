/* fondasi — js/components/modal.js
 * Modal & dialog manager
 * ─────────────────────────────────────────── */

import { $, emit, trapFocus, uid } from '../core/helpers.js';
import { register }                from '../core/events.js';

const ATTR_OPEN   = 'data-modal-open';
const ATTR_CLOSE  = 'data-modal-close';
const ATTR_TARGET = 'data-modal-target';
const KEY_ESC     = 'Escape';

/* ── Single Modal instance ───────────────────────────────────────────── */

class Modal {
    /**
     * @param {Element} overlay — .modal-overlay element
     * @param {Object}  [options]
     * @param {boolean} [options.closeOnOverlay=true]
     * @param {boolean} [options.closeOnEsc=true]
     * @param {Function} [options.onOpen]
     * @param {Function} [options.onClose]
     */
    constructor(overlay, options) {
        const opts = options || {};
        this._overlay         = overlay;
        this._modal           = overlay.querySelector('.modal');
        this._closeOnOverlay  = opts.closeOnOverlay !== false;
        this._closeOnEsc      = opts.closeOnEsc     !== false;
        this._onOpen          = opts.onOpen  || null;
        this._onClose         = opts.onClose || null;
        this._releaseFocus    = null;
        this._previousFocus   = null;
        this._isOpen          = false;

        this._id = overlay.id || uid('modal');
        overlay.id = this._id;

        this._bindEvents();
    }

    get isOpen()  { return this._isOpen; }
    get id()      { return this._id; }
    get element() { return this._overlay; }

    /* ── Public ───────────────────────────────────────────────────────── */

    open() {
        if (this._isOpen) return;
        this._isOpen = true;

        this._previousFocus = document.activeElement;
        this._overlay.removeAttribute('hidden');
        this._overlay.setAttribute('aria-hidden', 'false');
        this._overlay.classList.add('modal-overlay-open');

        document.body.classList.add('modal-open');
        document.addEventListener('keydown', this._onKeydown);

        requestAnimationFrame(() => {
            this._releaseFocus = trapFocus(this._modal);
        });

        emit(this._overlay, 'modal:open', { modal: this });
        this._onOpen?.({ modal: this });
    }

    close() {
        if (!this._isOpen) return;
        this._isOpen = false;

        this._overlay.setAttribute('hidden', '');
        this._overlay.setAttribute('aria-hidden', 'true');
        this._overlay.classList.remove('modal-overlay-open');
        document.body.classList.remove('modal-open');
        document.removeEventListener('keydown', this._onKeydown);

        this._releaseFocus?.();
        this._releaseFocus = null;
        this._previousFocus?.focus?.();

        emit(this._overlay, 'modal:close', { modal: this });
        this._onClose?.({ modal: this });
    }

    toggle() {
        this._isOpen ? this.close() : this.open();
    }

    destroy() {
        document.removeEventListener('keydown', this._onKeydown);
        this._overlay.removeEventListener('click', this._onOverlayClick);
        this._overlay.querySelectorAll(`[${ATTR_CLOSE}]`).forEach(btn => {
            btn.removeEventListener('click', this._onClose);
        });
    }

    /* ── Private ─────────────────────────────────────────────────────── */

    _bindEvents() {
        this._onKeydown      = this._handleKeydown.bind(this);
        this._onOverlayClick = this._handleOverlayClick.bind(this);

        this._overlay.addEventListener('click', this._onOverlayClick);

        this._overlay.querySelectorAll(`[${ATTR_CLOSE}]`).forEach(btn => {
            btn.addEventListener('click', () => this.close());
        });
    }

    _handleKeydown(e) {
        if (this._closeOnEsc && e.key === KEY_ESC) {
            e.preventDefault();
            this.close();
        }
    }

    _handleOverlayClick(e) {
        if (this._closeOnOverlay && e.target === this._overlay) {
            this.close();
        }
    }
}

/* ── Modal Registry ─────────────────────────────────────────────────── */

const _modals = new Map();

/**
 * Get or create a Modal instance for an overlay element or id.
 * @param {string|Element} target
 * @param {Object} [options]
 * @returns {Modal|null}
 */
export function getModal(target, options) {
    const el = (typeof target === 'string')
        ? document.getElementById(target) || $(target)
        : target;

    if (!el) return null;
    if (_modals.has(el)) return _modals.get(el);

    const instance = new Modal(el, options);
    _modals.set(el, instance);
    return instance;
}

/* ── Declarative init ───────────────────────────────────────────────── */

// [data-modal-open="modal-id"] triggers
document.addEventListener('click', e => {
    const trigger = e.target.closest(`[${ATTR_OPEN}]`);
    if (!trigger) return;
    const id = trigger.getAttribute(ATTR_OPEN);
    getModal(id)?.open();
});

// [data-modal-close] inside modal
document.addEventListener('click', e => {
    const trigger = e.target.closest(`[${ATTR_CLOSE}]`);
    if (!trigger) return;
    const overlay = trigger.closest('.modal-overlay');
    if (overlay) getModal(overlay)?.close();
});

// Auto-register all .modal-overlay elements
register('.modal-overlay', el => getModal(el));

/* ── Dialog helper ─────────────────────────────────────────────────── */

/**
 * Programmatically open a simple dialog (confirm/alert).
 * Returns a Promise that resolves to true (confirm) or false (cancel).
 *
 * @param {Object} options
 * @param {'danger'|'warning'|'success'|'info'} [options.type='info']
 * @param {string} options.title
 * @param {string} options.message
 * @param {string} [options.confirmLabel='Confirm']
 * @param {string} [options.cancelLabel='Cancel']
 * @param {boolean} [options.showCancel=true]
 * @returns {Promise<boolean>}
 */
export function dialog(options) {
    return new Promise(resolve => {
        const id = uid('dialog');
        const type = options.type || 'info';

        const ICONS = {
            danger:  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="24" height="24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>`,
            warning: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="24" height="24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>`,
            success: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="24" height="24"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 1 1-18 0 9 9 0 0 1 18 0z"/></svg>`,
            info:    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="24" height="24"><path stroke-linecap="round" stroke-linejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z"/></svg>`,
        };

        const showCancel   = options.showCancel !== false;
        const confirmLabel = options.confirmLabel || 'Confirm';
        const cancelLabel  = options.cancelLabel  || 'Cancel';

        const html = `
<div class="modal-overlay" id="${id}" aria-modal="true" role="dialog" aria-labelledby="${id}-title" hidden>
  <div class="modal dialog modal-sm">
    <div class="modal-body">
      <div class="dialog-icon ${type}">${ICONS[type] || ''}</div>
      <div class="dialog-title" id="${id}-title">${options.title || ''}</div>
      <div class="dialog-message">${options.message || ''}</div>
    </div>
    <div class="modal-footer">
      ${showCancel ? `<button class="btn btn-ghost" data-action="cancel" type="button">${cancelLabel}</button>` : ''}
      <button class="btn btn-${type === 'info' ? 'primary' : type}" data-action="confirm" type="button">${confirmLabel}</button>
    </div>
  </div>
</div>`;

        document.body.insertAdjacentHTML('beforeend', html);
        const overlay = document.getElementById(id);
        const modal   = getModal(overlay, { closeOnOverlay: false });

        overlay.addEventListener('click', e => {
            const action = e.target.closest('[data-action]')?.dataset.action;
            if (action === 'confirm') { modal.close(); resolve(true);  overlay.remove(); }
            if (action === 'cancel')  { modal.close(); resolve(false); overlay.remove(); }
        });

        modal.open();
    });
}

export { Modal };
export default Modal;
