/* fondasi — js/components/search-select.js
 * Search Select (single) and Multi Search Select (multi-value combobox)
 * ─────────────────────────────────────────── */

import { $$, emit, uid, debounce } from '../core/helpers.js';
import { register }                from '../core/events.js';


/* ══════════════════════════════════════════════
   1. SEARCH-SELECT (Single Combobox)
   ══════════════════════════════════════════════ */

class SearchSelect {
    /**
     * @param {Element} container — .search-select element
     * @param {Object}  [options]
     * @param {Array}   [options.items]              — [{ value, label }] or string[]
     * @param {string}  [options.placeholder='Search…']
     * @param {boolean} [options.clearable=true]
     * @param {number}  [options.debounce=200]
     * @param {Function} [options.onSelect]
     * @param {Function} [options.onClear]
     * @param {Function} [options.filter]            — custom filter(items, query) → items
     */
    constructor(container, options) {
        const opts   = options || {};
        this._el          = container;
        this._items       = this._normaliseItems(opts.items || this._readDataItems());
        this._placeholder = opts.placeholder || container.dataset.placeholder || 'Search…';
        this._clearable   = opts.clearable !== false;
        this._onSelect    = opts.onSelect || null;
        this._onClear     = opts.onClear  || null;
        this._filterFn    = opts.filter   || this._defaultFilter.bind(this);
        this._noDataText  = opts.noDataText  || container.dataset.noDataText  || 'No data available.';
        this._emptyText   = opts.emptyText   || container.dataset.emptyText   || 'No results found.';
        this._selected    = null;
        this._isOpen      = false;
        this._activeIdx   = -1;
        this._listId      = uid('ss-list');

        this._input    = container.querySelector('.search-input') || this._buildInput();
        this._list     = container.querySelector('.search-select-list') || this._buildList();
        this._dropdown = container.querySelector('.search-select-dropdown') || this._list;
        this._hidden   = container.querySelector('input[type="hidden"]') || this._buildHidden();

        this._input.setAttribute('role', 'combobox');
        this._input.setAttribute('aria-autocomplete', 'list');
        this._input.setAttribute('aria-expanded', 'false');
        this._input.setAttribute('aria-controls', this._listId);
        this._list.setAttribute('role', 'listbox');
        this._list.id = this._listId;

        this._handleInput = debounce((e) => this._onInput(e), opts.debounce || 200);
        this._bindEvents();

        // Seed initial value if hidden input already has one
        const init = this._hidden.value;
        if (init) {
            const match = this._items.find(i => i.value === init);
            if (match) this._selectItem(match, true);
        }
    }

    /* ── Public ───────────────────────────────────────────────────────── */

    get value()    { return this._selected?.value ?? null; }
    get selected() { return this._selected; }
    get isOpen()   { return this._isOpen; }

    /**
     * Programmatically select an item by value.
     * @param {string} value
     */
    select(value) {
        const item = this._items.find(i => i.value === value);
        if (item) this._selectItem(item);
    }

    /** Clear the selection. */
    clear() {
        this._selected = null;
        this._input.value = '';
        this._hidden.value = '';
        this._renderList(this._items);
        emit(this._el, 'searchselect:clear', { searchSelect: this });
        this._onClear?.({ searchSelect: this });
    }

    /** Set or replace the items list. */
    setItems(items) {
        this._items = this._normaliseItems(items);
        if (this._isOpen) this._renderList(this._filterFn(this._items, this._input.value));
    }

    destroy() {
        this._input.removeEventListener('input',   this._handleInput);
        this._input.removeEventListener('keydown', this._handleKeydown);
        this._input.removeEventListener('focus',   this._onFocus);
        document.removeEventListener('click', this._onDocClick);
    }

    /* ── Private ─────────────────────────────────────────────────────── */

    _normaliseItems(items) {
        return items.map(i => typeof i === 'string' ? { value: i, label: i } : i);
    }

    _readDataItems() {
        return $$('.search-select-item[data-value]', this._el).map(el => ({
            value: el.dataset.value,
            label: el.textContent.trim(),
        }));
    }

    _defaultFilter(items, query) {
        if (!query) return items;
        const q = query.toLowerCase();
        return items.filter(i => i.label.toLowerCase().includes(q));
    }

    _buildInput() {
        const input = document.createElement('input');
        input.type        = 'text';
        input.className   = 'search-input';
        input.placeholder = this._placeholder;
        this._el.appendChild(input);
        return input;
    }

    _buildList() {
        const dropdown = document.createElement('div');
        dropdown.className = 'search-select-dropdown';
        dropdown.setAttribute('hidden', '');
        this._el.appendChild(dropdown);

        const list = document.createElement('div');
        list.className = 'search-select-list';
        dropdown.appendChild(list);
        return list;
    }

    _buildHidden() {
        const h = document.createElement('input');
        h.type = 'hidden';
        h.name = this._el.dataset.name || '';
        this._el.appendChild(h);
        return h;
    }

    _bindEvents() {
        this._handleKeydown = this._onKeydown.bind(this);
        this._onFocus       = () => this._open();
        this._onDocClick    = (e) => {
            if (!this._el.contains(e.target)) this._close();
        };

        this._input.addEventListener('input',   this._handleInput);
        this._input.addEventListener('keydown', this._handleKeydown);
        this._input.addEventListener('focus',   this._onFocus);
        this._input.addEventListener('click',   () => this._open());

        this._list.addEventListener('click', (e) => {
            const item = e.target.closest('[data-value]');
            if (item) this._selectItem({ value: item.dataset.value, label: item.textContent });
        });

        document.addEventListener('click', this._onDocClick);
    }

    _onInput() {
        const filtered = this._filterFn(this._items, this._input.value);
        this._renderList(filtered);
        this._open();
    }

    _onKeydown(e) {
        const items = $$('[data-value]', this._list).filter(i => !i.hidden);
        if (!items.length && e.key !== 'Escape') return;

        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                this._activeIdx = Math.min(this._activeIdx + 1, items.length - 1);
                this._updateActive(items);
                break;
            case 'ArrowUp':
                e.preventDefault();
                this._activeIdx = Math.max(this._activeIdx - 1, 0);
                this._updateActive(items);
                break;
            case 'Enter':
                e.preventDefault();
                if (this._activeIdx >= 0 && items[this._activeIdx]) {
                    const el = items[this._activeIdx];
                    this._selectItem({ value: el.dataset.value, label: el.textContent });
                }
                break;
            case 'Escape':
                this._close();
                break;
            case 'Tab':
                this._close();
                break;
        }
    }

    _updateActive(items) {
        items.forEach((el, i) => {
            el.classList.toggle('active', i === this._activeIdx);
            if (i === this._activeIdx) {
                el.scrollIntoView({ block: 'nearest' });
                this._input.setAttribute('aria-activedescendant', el.id || (el.id = uid('ss-opt')));
            }
        });
    }

    _renderList(items) {
        this._list.innerHTML = '';
        this._activeIdx = -1;
        this._input.removeAttribute('aria-activedescendant');

        if (!items.length) {
            const empty = document.createElement('div');
            empty.className = 'search-select-empty';
            empty.textContent = this._items.length === 0
                ? this._noDataText
                : this._emptyText;
            this._list.appendChild(empty);
            return;
        }

        items.forEach(item => {
            const div = document.createElement('div');
            div.className = 'search-select-item';
            div.setAttribute('data-value', item.value);
            div.setAttribute('role', 'option');
            div.setAttribute('aria-selected', this._selected?.value === item.value ? 'true' : 'false');
            div.textContent = item.label;
            if (this._selected?.value === item.value) div.classList.add('active');
            this._list.appendChild(div);
        });
    }

    _selectItem(item, silent) {
        this._selected     = item;
        this._input.value  = item.label;
        this._hidden.value = item.value;
        this._close();

        if (!silent) {
            emit(this._el, 'searchselect:select', { item, searchSelect: this });
            this._onSelect?.({ item, searchSelect: this });
        }
    }

    _open() {
        if (this._isOpen) return;
        this._isOpen = true;
        this._renderList(this._filterFn(this._items, this._input.value));
        this._dropdown.removeAttribute('hidden');
        this._input.setAttribute('aria-expanded', 'true');
        this._el.classList.add('is-open');
    }

    _close() {
        if (!this._isOpen) return;
        this._isOpen = false;
        this._dropdown.setAttribute('hidden', '');
        this._input.setAttribute('aria-expanded', 'false');
        this._el.classList.remove('is-open');
        this._activeIdx = -1;
        if (this._selected) this._input.value = this._selected.label;
    }
}

/**
 * Get or create a SearchSelect instance.
 * @param {string|Element} target
 * @param {Object} [options]
 * @returns {SearchSelect|null}
 */
export function getSearchSelect(target, options) {
    const el = (typeof target === 'string')
        ? document.getElementById(target) || document.querySelector(target)
        : target;
    if (!el) return null;
    if (el._fondasiSearchSelect) return el._fondasiSearchSelect;
    const instance = new SearchSelect(el, options);
    el._fondasiSearchSelect = instance;
    return instance;
}

register('.search-select', el => {
    if (el.closest('pre, code')) return;
    getSearchSelect(el);
});


/* ══════════════════════════════════════════════
   2. MULTI SEARCH-SELECT (Multi-value Combobox)
   ══════════════════════════════════════════════ */

class MultiSearchSelect {
    /**
     * @param {Element} container — .search-select-multi element
     * @param {Object}  [options]
     * @param {Array}   [options.items]              — [{ value, label }] or string[]
     * @param {string}  [options.placeholder='Search…']
     * @param {number}  [options.debounce=200]
     * @param {Function} [options.onSelect]
     * @param {Function} [options.onRemove]
     * @param {Function} [options.filter]            — custom filter(items, query, selected) → items
     */
    constructor(container, options) {
        const opts = options || {};
        this._el          = container;
        this._items       = this._normaliseItems(opts.items || this._readDataItems());
        this._placeholder = opts.placeholder || container.dataset.placeholder || 'Search…';
        this._onSelect    = opts.onSelect || null;
        this._onRemove    = opts.onRemove || null;
        this._filterFn    = opts.filter   || this._defaultFilter.bind(this);
        this._noDataText  = opts.noDataText  || container.dataset.noDataText  || 'No data available.';
        this._emptyText   = opts.emptyText   || container.dataset.emptyText   || 'No results found.';
        this._name        = container.dataset.name || '';
        this._selected    = [];
        this._isOpen      = false;
        this._activeIdx   = -1;
        this._listId      = uid('ms-list');

        this._build();
        this._bindEvents();

        // Seed initial values from data-value="val1,val2"
        const initVals = (container.dataset.value || '').split(',').filter(Boolean);
        initVals.forEach(v => {
            const match = this._items.find(i => i.value === v);
            if (match) this._selectItem(match, true);
        });
    }

    /* ── Public ───────────────────────────────────────────────────────── */

    get values()   { return this._selected.map(i => i.value); }
    get selected() { return [...this._selected]; }
    get isOpen()   { return this._isOpen; }

    select(value) {
        const item = this._items.find(i => i.value === value);
        if (item && !this._isSelected(item)) this._selectItem(item);
    }

    deselect(value) {
        const idx = this._selected.findIndex(i => i.value === value);
        if (idx !== -1) this._removeItem(idx);
    }

    clear() {
        this._selected = [];
        this._renderTags();
        this._updateHiddenInputs();
        emit(this._el, 'multisearchselect:clear', { instance: this });
    }

    setItems(items) {
        this._items = this._normaliseItems(items);
        if (this._isOpen) this._renderList(this._filterFn(this._items, this._input.value, this._selected));
    }

    destroy() {
        this._input.removeEventListener('input',    this._handleInput);
        this._input.removeEventListener('keydown',  this._handleKeydown);
        this._tagsWrap.removeEventListener('click', this._onTagsClick);
        document.removeEventListener('click', this._onDocClick);
    }

    /* ── Private ─────────────────────────────────────────────────────── */

    _normaliseItems(items) {
        return items.map(i => typeof i === 'string' ? { value: i, label: i } : i);
    }

    _readDataItems() {
        return $$('.search-select-item[data-value]', this._el).map(el => ({
            value: el.dataset.value,
            label: el.textContent.trim(),
        }));
    }

    _isSelected(item) {
        return this._selected.some(s => s.value === item.value);
    }

    _defaultFilter(items, query) {
        const unselected = items.filter(i => !this._isSelected(i));
        if (!query) return unselected;
        const q = query.toLowerCase();
        return unselected.filter(i => i.label.toLowerCase().includes(q));
    }

    _build() {
        this._tagsWrap = document.createElement('div');
        this._tagsWrap.className = 'search-select-tags';

        this._input = document.createElement('input');
        this._input.type        = 'text';
        this._input.className   = 'search-select-tag-input';
        this._input.placeholder = this._placeholder;
        this._input.setAttribute('role', 'combobox');
        this._input.setAttribute('aria-autocomplete', 'list');
        this._input.setAttribute('aria-expanded', 'false');
        this._input.setAttribute('aria-controls', this._listId);
        this._tagsWrap.appendChild(this._input);

        this._dropdown = document.createElement('div');
        this._dropdown.className = 'search-select-dropdown';
        this._dropdown.setAttribute('hidden', '');

        this._list = document.createElement('div');
        this._list.className = 'search-select-list';
        this._list.id        = this._listId;
        this._list.setAttribute('role', 'listbox');
        this._list.setAttribute('aria-multiselectable', 'true');
        this._dropdown.appendChild(this._list);

        this._el.innerHTML = '';
        this._el.appendChild(this._tagsWrap);
        this._el.appendChild(this._dropdown);
    }

    _bindEvents() {
        this._handleInput   = debounce(() => this._onInput(), 200);
        this._handleKeydown = this._onKeydown.bind(this);
        this._onTagsClick   = (e) => {
            const removeBtn = e.target.closest('.search-select-tag-remove');
            if (removeBtn) {
                const idx = parseInt(removeBtn.dataset.idx, 10);
                this._removeItem(idx);
            } else {
                this._input.focus();
            }
        };
        this._onDocClick = (e) => {
            if (!this._el.contains(e.target)) this._close();
        };

        this._input.addEventListener('input',   this._handleInput);
        this._input.addEventListener('keydown', this._handleKeydown);
        this._input.addEventListener('focus',   () => this._open());
        this._input.addEventListener('click',   () => this._open());

        this._list.addEventListener('click', (e) => {
            const item = e.target.closest('[data-value]');
            if (item) this._selectItem({ value: item.dataset.value, label: item.textContent.trim() });
        });

        this._tagsWrap.addEventListener('click', this._onTagsClick);
        document.addEventListener('click', this._onDocClick);
    }

    _onInput() {
        const filtered = this._filterFn(this._items, this._input.value, this._selected);
        this._renderList(filtered);
        this._open();
    }

    _onKeydown(e) {
        const items = $$('[data-value]', this._list).filter(i => !i.hidden);

        if (e.key === 'Backspace' && !this._input.value && this._selected.length > 0) {
            this._removeItem(this._selected.length - 1);
            return;
        }

        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                this._activeIdx = Math.min(this._activeIdx + 1, items.length - 1);
                this._updateActive(items);
                break;
            case 'ArrowUp':
                e.preventDefault();
                this._activeIdx = Math.max(this._activeIdx - 1, 0);
                this._updateActive(items);
                break;
            case 'Enter':
                e.preventDefault();
                if (this._activeIdx >= 0 && items[this._activeIdx]) {
                    const el = items[this._activeIdx];
                    this._selectItem({ value: el.dataset.value, label: el.textContent.trim() });
                }
                break;
            case 'Escape':
                this._close();
                break;
        }
    }

    _updateActive(items) {
        items.forEach((el, i) => {
            el.classList.toggle('active', i === this._activeIdx);
            if (i === this._activeIdx) {
                el.scrollIntoView({ block: 'nearest' });
                this._input.setAttribute('aria-activedescendant', el.id || (el.id = uid('ms-opt')));
            }
        });
    }

    _renderList(items) {
        this._list.innerHTML = '';
        this._activeIdx = -1;
        this._input.removeAttribute('aria-activedescendant');

        if (!items.length) {
            const empty = document.createElement('div');
            empty.className = 'search-select-empty';
            empty.textContent = this._items.filter(i => !this._isSelected(i)).length === 0
                ? this._noDataText
                : this._emptyText;
            this._list.appendChild(empty);
            return;
        }

        items.forEach(item => {
            const div = document.createElement('div');
            div.className = 'search-select-item';
            div.setAttribute('data-value', item.value);
            div.setAttribute('role', 'option');
            div.setAttribute('aria-selected', 'false');
            div.textContent = item.label;
            this._list.appendChild(div);
        });
    }

    _renderTags() {
        Array.from(this._tagsWrap.querySelectorAll('.search-select-tag')).forEach(t => t.remove());

        this._selected.forEach((item, idx) => {
            const tag = document.createElement('span');
            tag.className = 'search-select-tag';
            tag.innerHTML = `<span class="search-select-tag-label">${item.label}</span><button type="button" class="search-select-tag-remove" data-idx="${idx}" aria-label="Remove ${item.label}"><svg viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="2" width="10" height="10" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M1 1l12 12M13 1L1 13"/></svg></button>`;
            this._tagsWrap.insertBefore(tag, this._input);
        });

        this._input.placeholder = this._selected.length ? '' : this._placeholder;
    }

    _updateHiddenInputs() {
        Array.from(this._el.querySelectorAll('input[type="hidden"]')).forEach(i => i.remove());
        this._selected.forEach(item => {
            const h = document.createElement('input');
            h.type  = 'hidden';
            h.name  = this._name;
            h.value = item.value;
            this._el.appendChild(h);
        });
    }

    _selectItem(item, silent) {
        if (this._isSelected(item)) return;
        this._selected.push(item);
        this._input.value = '';
        this._renderTags();
        this._updateHiddenInputs();
        const filtered = this._filterFn(this._items, '', this._selected);
        this._renderList(filtered);

        if (!silent) {
            emit(this._el, 'multisearchselect:select', { item, instance: this });
            this._onSelect?.({ item, instance: this });
        }
    }

    _removeItem(idx) {
        const item = this._selected[idx];
        if (!item) return;
        this._selected.splice(idx, 1);
        this._renderTags();
        this._updateHiddenInputs();
        if (this._isOpen) {
            const filtered = this._filterFn(this._items, this._input.value, this._selected);
            this._renderList(filtered);
        }
        emit(this._el, 'multisearchselect:remove', { item, instance: this });
        this._onRemove?.({ item, instance: this });
    }

    _open() {
        if (this._isOpen) return;
        this._isOpen = true;
        const filtered = this._filterFn(this._items, this._input.value, this._selected);
        this._renderList(filtered);
        this._dropdown.removeAttribute('hidden');
        this._input.setAttribute('aria-expanded', 'true');
        this._el.classList.add('is-open');
    }

    _close() {
        if (!this._isOpen) return;
        this._isOpen = false;
        this._dropdown.setAttribute('hidden', '');
        this._input.setAttribute('aria-expanded', 'false');
        this._el.classList.remove('is-open');
        this._activeIdx = -1;
    }
}

/**
 * Get or create a MultiSearchSelect instance.
 * @param {string|Element} target
 * @param {Object} [options]
 * @returns {MultiSearchSelect|null}
 */
export function getMultiSearchSelect(target, options) {
    const el = (typeof target === 'string')
        ? document.getElementById(target) || document.querySelector(target)
        : target;
    if (!el) return null;
    if (el._fondasiMultiSearchSelect) return el._fondasiMultiSearchSelect;
    const instance = new MultiSearchSelect(el, options);
    el._fondasiMultiSearchSelect = instance;
    return instance;
}

register('.search-select-multi', el => {
    if (el.closest('pre, code')) return;
    getMultiSearchSelect(el);
});

export { SearchSelect, MultiSearchSelect };
export default { SearchSelect, MultiSearchSelect, getSearchSelect, getMultiSearchSelect };
