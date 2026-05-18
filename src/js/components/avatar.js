/* fondasi — js/components/avatar.js
 * Avatar component with fallback support
 * ─────────────────────────────────────────── */

import { $$, emit } from '../core/helpers.js';
import { register } from '../core/events.js';

class Avatar {
    /**
     * @param {Element} element - .avatar element
     * @param {Object} [options]
     * @param {string} [options.src] - Image URL
     * @param {string} [options.alt] - Alt text
     * @param {string} [options.initial] - Initial text (e.g., "JD")
     * @param {string} [options.status] - Status: online, offline, busy, away
     * @param {string} [options.variant] - Color variant: brand, success, warning, danger, info
     * @param {boolean} [options.circle] - Use circle shape
     * @param {Function} [options.onError] - Callback when image fails to load
     * @param {Function} [options.onLoad] - Callback when image loads
     */
    constructor(element, options) {
        this._element = element;
        this._options = options || {};

        this._init();
    }

    /* ── Public ───────────────────────────────────────────────────────── */

    /** Update avatar source */
    setSrc(src) {
        this._loadImage(src);
    }

    /** Update initial text */
    setInitial(initial) {
        this._element.textContent = initial;
        this._element.classList.add('avatar-initial');
    }

    /** Set status indicator */
    setStatus(status) {
        this._element.classList.remove('avatar-status-online', 'avatar-status-offline', 'avatar-status-busy', 'avatar-status-away');
        if (status) {
            this._element.classList.add('avatar-status', `avatar-status-${status}`);
        }
    }

    /** Set variant color */
    setVariant(variant) {
        this._element.classList.remove('avatar-brand', 'avatar-success', 'avatar-warning', 'avatar-danger', 'avatar-info');
        if (variant) {
            this._element.classList.add(`avatar-${variant}`);
        }
    }

    /* ── Private ─────────────────────────────────────────────────────── */

    _init() {
        const opts = this._options;
        const el = this._element;

        const src = opts.src || el.dataset.src || null;
        const initial = opts.initial || el.dataset.initial || '';
        const alt = opts.alt || el.dataset.alt || '';
        const status = opts.status || el.dataset.status || null;
        const variant = opts.variant || el.dataset.variant || null;
        const circle = opts.circle !== undefined ? opts.circle : el.dataset.circle === 'true';

        if (circle) {
            el.classList.add('avatar-circle');
        }

        if (variant) {
            el.classList.add(`avatar-${variant}`);
        }

        if (status) {
            el.classList.add('avatar-status', `avatar-status-${status}`);
        }

        if (src) {
            this._loadImage(src, alt);
        } else if (initial) {
            this._setInitial(initial);
        } else {
            this._showIconFallback();
        }
    }

    _loadImage(src, alt = '') {
        const img = new Image();
        img.alt = alt;
        img.className = 'avatar-image';

        img.onload = () => {
            this._element.innerHTML = '';
            this._element.appendChild(img);
            this._element.classList.remove('avatar-initial');

            emit(this._element, 'avatar:load', { src, avatar: this });
            this._options.onLoad?.({ src, avatar: this });
        };

        img.onerror = () => {
            const initial = this._options.initial || this._element.dataset.initial;
            if (initial) {
                this._setInitial(initial);
            } else {
                this._showIconFallback();
            }

            emit(this._element, 'avatar:error', { src, avatar: this });
            this._options.onError?.({ src, avatar: this });
        };

        img.src = src;
    }

    _setInitial(initial) {
        this._element.innerHTML = '';
        this._element.textContent = initial;
        this._element.classList.add('avatar-initial');
    }

    _showIconFallback() {
        this._element.innerHTML = '';
        const wrapper = document.createElement('div');
        wrapper.className = 'avatar-icon';
        wrapper.innerHTML = `<svg class="avatar-icon-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>`;
        this._element.appendChild(wrapper);
    }
}

class AvatarGroup {
    /**
     * @param {Element} container - .avatar-group element
     * @param {Object} [options]
     * @param {number} [options.max=4] - Maximum visible avatars
     * @param {boolean} [options.overflow=true] - Show count for overflow
     * @param {string} [options.size] - Size: sm, md, lg, xl
     */
    constructor(container, options) {
        const opts = options || {};
        this._container = container;
        this._max = opts.max || parseInt(container.dataset.max) || 4;
        this._overflow = opts.overflow !== undefined ? opts.overflow : container.dataset.overflow !== 'false';
        this._size = opts.size || container.dataset.size || null;

        this._init();
    }

    /* ── Public ───────────────────────────────────────────────────────── */

    /** Get all avatars in the group */
    getAvatars() {
        return $$('.avatar', this._container);
    }

    /* ── Private ───────────────────────────────────────────────────────── */

    _init() {
        const avatars = this.getAvatars();
        const total = avatars.length;

        if (this._size) {
            this._container.classList.add(`avatar-group-${this._size}`);
        }

        if (this._overflow && total > this._max) {
            const hidden = total - this._max;

            avatars.forEach((avatar, idx) => {
                if (idx >= this._max) {
                    avatar.style.display = 'none';
                }
            });

            this._createCountIndicator(hidden);
        }
    }

    _createCountIndicator(count) {
        const countEl = document.createElement('span');
        countEl.className = 'avatar-group-count';
        countEl.textContent = `+${count}`;
        countEl.setAttribute('title', `${count} more`);

        this._container.appendChild(countEl);
    }
}

/* ── Auto-init ───────────────────────────────────────────────────────── */
register('.avatar:not([data-avatar-group])', (el) => {
    if (el.dataset.avatarGroup === 'false') return; // Opt-out
    new Avatar(el);
});

register('.avatar-group', (el) => new AvatarGroup(el));

/* ── Factory methods ─────────────────────────────────────────────────── */

/**
 * Create avatar element programmatically
 * @param {Object} options
 * @returns {Element}
 */
export function createAvatar(options = {}) {
    const {
        src,
        initial,
        size = 'md',
        shape = 'square',
        status,
        variant,
        alt = ''
    } = options;

    const avatar = document.createElement('div');
    avatar.className = `avatar avatar-${size} avatar-${shape}`;

    if (src) {
        avatar.dataset.src = src;
    }
    if (initial) {
        avatar.dataset.initial = initial;
    }
    if (alt) {
        avatar.dataset.alt = alt;
    }
    if (status) {
        avatar.dataset.status = status;
    }
    if (variant) {
        avatar.dataset.variant = variant;
    }

    new Avatar(avatar, options);
    return avatar;
}

/**
 * Create avatar group element
 * @param {Array<Object>} avatars - Array of avatar options
 * @param {Object} options
 * @returns {Element}
 */
export function createAvatarGroup(avatars = [], options = {}) {
    const { size = 'md', max = 4 } = options;

    const group = document.createElement('div');
    group.className = `avatar-group avatar-group-${size}`;
    group.dataset.max = max;

    avatars.forEach(avatarOptions => {
        const avatar = createAvatar(avatarOptions);
        group.appendChild(avatar);
    });

    new AvatarGroup(group, options);
    return group;
}

export { Avatar, AvatarGroup };
export default { Avatar, AvatarGroup, createAvatar, createAvatarGroup };