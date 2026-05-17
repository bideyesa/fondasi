/* fondasi — js/components/table.js
 * DataTable — live search · sorting · row selection · bulk actions
 *             row expand · CSV export · numbered pagination · skeleton
 * ─────────────────────────────────────────────────────────────────── */

import { $$, emit, uid, debounce } from '../core/helpers.js';
import { register }                from '../core/events.js';

const ICON_SORT_NONE = `<span class="th-sort-icon" aria-hidden="true">▲▼</span>`;
const ICON_SORT_ASC  = `<span class="th-sort-icon asc" aria-hidden="true">▲</span>`;
const ICON_SORT_DESC = `<span class="th-sort-icon desc" aria-hidden="true">▼</span>`;

const ICON_PREV = `<svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clip-rule="evenodd"/></svg>`;
const ICON_NEXT = `<svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clip-rule="evenodd"/></svg>`;

/* ══════════════════════════════════════════════
   DataTable class
   ══════════════════════════════════════════════ */

class DataTable {
    /**
     * @param {Element} container   — wrapper element (ideally .table-wrap)
     * @param {Object}  [options]
     *
     * Sorting:
     * @param {boolean}          [options.sortable=true]
     * @param {string}           [options.sortCol=null]      initial sort column (data-col)
     * @param {'asc'|'desc'}     [options.sortDir='asc']
     *
     * Selection:
     * @param {boolean}          [options.selectable=false]
     * @param {boolean}          [options.multiSelect=true]
     *
     * Pagination:
     * @param {boolean}          [options.paginate=false]
     * @param {number}           [options.pageSize=10]
     *
     * Search:
     * @param {Element|string}   [options.searchInput]       element or ID of search <input>
     *
     * Page-size selector:
     * @param {Element|string}   [options.pageSizeSelect]    element or ID of <select>
     *
     * Row expand:
     * @param {boolean}          [options.expandable=false]
     *
     * States:
     * @param {boolean}          [options.loading=false]
     * @param {string}           [options.emptyMessage]
     * @param {string}           [options.emptyIcon]
     *
     * Callbacks:
     * @param {Function}         [options.onSort]            ({col, dir, table})
     * @param {Function}         [options.onSelect]          ({selected, row, table})
     * @param {Function}         [options.onPage]            ({page, pageSize, table})
     * @param {Function}         [options.onSearch]          ({query, table})
     * @param {Function}         [options.onBulk]            ({action, selected, table})
     */
    constructor(container, options) {
        const opts = options || {};

        this._container = container;
        this._table     = container.querySelector('.table') || container;
        this._thead     = this._table.querySelector('thead');
        this._tbody     = this._table.querySelector('tbody');

        if (!this._thead || !this._tbody) {
            console.warn('[DataTable] Missing <thead> or <tbody>.');
            return;
        }

        // ── Options ────────────────────────────────────────────
        this._sortable     = opts.sortable      !== false;
        this._selectable   = opts.selectable    || false;
        this._multiSelect  = opts.multiSelect   !== false;
        this._paginate     = opts.paginate      || false;
        this._pageSize     = opts.pageSize      || Number(container.dataset.pageSize) || 10;
        this._expandable   = opts.expandable    || container.dataset.expandable === 'true';
        this._emptyMessage = opts.emptyMessage  || container.dataset.emptyMessage || 'Tidak ada data.';
        this._emptyIcon    = opts.emptyIcon     || container.dataset.emptyIcon    || '📭';
        this._onSort       = opts.onSort        || null;
        this._onSelect     = opts.onSelect      || null;
        this._onPage       = opts.onPage        || null;
        this._onSearch     = opts.onSearch      || null;
        this._onBulk       = opts.onBulk        || null;

        // ── State ──────────────────────────────────────────────
        this._sortCol    = opts.sortCol  || null;
        this._sortDir    = opts.sortDir  || 'asc';
        this._sortedRows = null;          // sorted copy; null = use _allRows order
        this._searchQuery = '';
        this._selected   = new Set();
        this._page       = 1;
        this._loading    = false;
        this._id         = container.id || uid('table');
        container.id     = this._id;

        // Snapshot original rows
        this._allRows = Array.from(this._tbody.querySelectorAll('tr'));

        // ── Init features ──────────────────────────────────────
        if (this._sortable)   this._initSorting();
        if (this._selectable) this._initSelection();
        if (this._expandable) this._initRowExpand();
        if (this._paginate)   this._pagerEl = container.querySelector('.table-footer') || this._createPager();

        this._initSearch(opts.searchInput);
        this._initPageSizeSelect(opts.pageSizeSelect);
        this._initBulkBar();

        if (opts.loading) {
            this.setLoading(true);
        } else {
            this._render();
        }

        // Apply initial sort after first render
        if (this._sortCol) this.sort(this._sortCol, this._sortDir);
    }

    /* ── Getters ──────────────────────────────────────────────────────── */

    get selectedRows()  { return [...this._selected]; }
    get selectedCount() { return this._selected.size; }
    get currentPage()   { return this._page; }
    get element()       { return this._container; }

    get totalPages() {
        const n = this._getDisplayRows().length;
        return Math.max(1, Math.ceil(n / this._pageSize));
    }

    /* ── Public: Search ───────────────────────────────────────────────── */

    /**
     * Filter table rows by query string (searches all cell text).
     * @param {string} query
     */
    search(query) {
        this._searchQuery = (query || '').trim();
        this._page = 1;
        this._render();
        emit(this._container, 'table:search', { query: this._searchQuery, table: this });
        this._onSearch?.({ query: this._searchQuery, table: this });
    }

    /* ── Public: Sort ─────────────────────────────────────────────────── */

    /**
     * Sort by column key. Toggles direction if same column clicked.
     * @param {string}           col
     * @param {'asc'|'desc'}     [dir]
     */
    sort(col, dir) {
        const th = this._thead.querySelector(`[data-col="${col}"]`);
        if (!th) return;

        const newDir = dir || (this._sortCol === col && this._sortDir === 'asc' ? 'desc' : 'asc');
        this._sortCol = col;
        this._sortDir = newDir;
        this._sortRows(col, newDir, th.dataset.type || 'string');
        this._updateSortHeaders();
        this._render();

        emit(this._container, 'table:sort', { col, dir: newDir, table: this });
        this._onSort?.({ col, dir: newDir, table: this });
    }

    /* ── Public: Selection ────────────────────────────────────────────── */

    selectRow(target) {
        const row = this._resolveRow(target);
        if (!row || row.classList.contains('disabled')) return;

        if (!this._multiSelect) {
            this._selected.forEach(r => this._deselect(r, true));
        }

        row.classList.add('selected');
        row.setAttribute('aria-selected', 'true');
        this._selected.add(row);

        const cb = row.querySelector('input[type="checkbox"][data-row-check]');
        if (cb) cb.checked = true;

        this._updateSelectAll();
        this._updateBulkBar();
        emit(this._container, 'table:select', { selected: this.selectedRows, row, table: this });
        this._onSelect?.({ selected: this.selectedRows, row, table: this });
    }

    deselectRow(target) {
        const row = this._resolveRow(target);
        if (!row) return;
        this._deselect(row);
        emit(this._container, 'table:select', { selected: this.selectedRows, row, table: this });
        this._onSelect?.({ selected: this.selectedRows, row, table: this });
    }

    selectAll() {
        this._getVisibleRows().forEach(r => this.selectRow(r));
    }

    deselectAll() {
        [...this._selected].forEach(r => this._deselect(r, true));
        this._selected.clear();
        this._updateSelectAll();
        this._updateBulkBar();
        emit(this._container, 'table:select', { selected: [], row: null, table: this });
        this._onSelect?.({ selected: [], row: null, table: this });
    }

    /* ── Public: Pagination ───────────────────────────────────────────── */

    goTo(page) {
        this._page = Math.max(1, Math.min(page, this.totalPages));
        this._render();
        emit(this._container, 'table:page', { page: this._page, pageSize: this._pageSize, table: this });
        this._onPage?.({ page: this._page, pageSize: this._pageSize, table: this });
    }

    next() { this.goTo(this._page + 1); }
    prev() { this.goTo(this._page - 1); }

    /* ── Public: Export ───────────────────────────────────────────────── */

    /**
     * Export current filtered rows to a CSV file.
     * @param {string} [filename='data-export.csv']
     */
    exportCSV(filename) {
        const fn = filename || 'data-export.csv';

        // Determine checkbox-only columns to skip
        const thEls = Array.from(this._thead.querySelectorAll('th'));
        const skipIdx = new Set(
            thEls.map((th, i) => th.querySelector('input[type="checkbox"]') ? i : -1).filter(i => i >= 0)
        );

        const headers = thEls
            .filter((_, i) => !skipIdx.has(i))
            .map(th => `"${th.textContent.trim().replace(/"/g, '""')}"`)
            .join(',');

        const rows = this._getDisplayRows().map(row =>
            Array.from(row.cells)
                .filter((_, i) => !skipIdx.has(i))
                .map(cell => {
                    const text = (cell.dataset.value || cell.textContent).trim();
                    return `"${text.replace(/"/g, '""')}"`;
                })
                .join(',')
        );

        const csv = '﻿' + [headers, ...rows].join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url  = URL.createObjectURL(blob);
        const a    = document.createElement('a');
        a.href = url; a.download = fn; a.click();
        URL.revokeObjectURL(url);
    }

    /* ── Public: States ───────────────────────────────────────────────── */

    /**
     * Toggle loading skeleton.
     * @param {boolean} state
     * @param {number}  [skeletonCount=5]
     */
    setLoading(state, skeletonCount) {
        this._loading = !!state;
        this._container.classList.toggle('table-loading', this._loading);

        if (this._loading) {
            const n    = skeletonCount || 5;
            const cols = this._thead.querySelectorAll('th').length || 4;
            this._tbody.innerHTML = Array.from({ length: n }, () =>
                `<tr class="tr-skeleton">${'<td></td>'.repeat(cols)}</tr>`
            ).join('');
        } else {
            this._restoreRows();
            this._render();
        }
    }

    /**
     * Replace all data rows. Accepts Element[] or HTML string.
     * @param {Element[]|string} rows
     */
    setRows(rows) {
        if (typeof rows === 'string') {
            this._tbody.innerHTML = rows;
        } else {
            this._tbody.innerHTML = '';
            rows.forEach(r => this._tbody.appendChild(r));
        }

        this._allRows    = Array.from(this._tbody.querySelectorAll('tr'));
        this._sortedRows = null;
        this._selected.clear();
        this._page = 1;

        if (this._selectable) this._rebindRowCheckboxes();
        this._render();
    }

    /* ── Private: Core render pipeline ───────────────────────────────── */

    /**
     * Returns sorted + search-filtered rows (not yet paginated).
     */
    _getDisplayRows() {
        let rows = this._sortedRows ? [...this._sortedRows] : [...this._allRows];

        if (this._searchQuery) {
            const q = this._searchQuery.toLowerCase();
            rows = rows.filter(row =>
                Array.from(row.cells).some(cell => {
                    const text = (cell.dataset.searchText || cell.textContent).trim().toLowerCase();
                    return text.includes(q);
                })
            );
        }

        return rows;
    }

    _render() {
        if (this._loading) return;

        const display = this._getDisplayRows();

        // Hide all original rows
        this._allRows.forEach(r => { r.hidden = true; });

        if (this._paginate) {
            this._renderPage(display);
        } else {
            display.forEach(r => { r.hidden = false; this._tbody.appendChild(r); });
        }

        this._checkEmpty(display);
        this._updateSelectAll();
        this._updateBulkBar();
    }

    /* ── Private: Sorting ─────────────────────────────────────────────── */

    _initSorting() {
        this._thead.querySelectorAll('th[data-col]').forEach(th => {
            th.classList.add('th-sortable');
            th.setAttribute('role', 'columnheader');
            th.setAttribute('aria-sort', 'none');
            th.setAttribute('tabindex', '0');
            th.insertAdjacentHTML('beforeend', ICON_SORT_NONE);

            th.addEventListener('click',   () => this.sort(th.dataset.col));
            th.addEventListener('keydown', e  => {
                if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); this.sort(th.dataset.col); }
            });
        });
    }

    _sortRows(col, dir, type) {
        const colIdx = this._getColIndex(col);
        if (colIdx < 0) return;

        const rows = [...this._allRows];
        rows.sort((a, b) => {
            const aVal = a.cells[colIdx]?.dataset.value ?? a.cells[colIdx]?.textContent.trim() ?? '';
            const bVal = b.cells[colIdx]?.dataset.value ?? b.cells[colIdx]?.textContent.trim() ?? '';

            let cmp = 0;
            if (type === 'number')    cmp = parseFloat(aVal)  - parseFloat(bVal);
            else if (type === 'date') cmp = new Date(aVal) - new Date(bVal);
            else                      cmp = aVal.localeCompare(bVal, undefined, { numeric: true, sensitivity: 'base' });

            return dir === 'asc' ? cmp : -cmp;
        });

        this._sortedRows = rows;
    }

    _updateSortHeaders() {
        this._thead.querySelectorAll('th[data-col]').forEach(th => {
            const active = th.dataset.col === this._sortCol;
            th.classList.toggle('sort-asc',  active && this._sortDir === 'asc');
            th.classList.toggle('sort-desc', active && this._sortDir === 'desc');
            const icon = th.querySelector('.th-sort-icon');
            if (icon) icon.outerHTML = active
                ? (this._sortDir === 'asc' ? ICON_SORT_ASC : ICON_SORT_DESC)
                : ICON_SORT_NONE;
            th.setAttribute('aria-sort', active
                ? (this._sortDir === 'asc' ? 'ascending' : 'descending')
                : 'none');
        });
    }

    _getColIndex(col) {
        return Array.from(this._thead.querySelectorAll('th')).findIndex(th => th.dataset.col === col);
    }

    /* ── Private: Search ──────────────────────────────────────────────── */

    _initSearch(inputRef) {
        // Resolve: passed option → data-search-input attr → [data-table-search] inside container
        let input;
        if (inputRef instanceof Element) {
            input = inputRef;
        } else if (typeof inputRef === 'string') {
            input = document.getElementById(inputRef) || document.querySelector(inputRef);
        } else {
            const refId = this._container.dataset.searchInput;
            input = refId
                ? (document.getElementById(refId) || document.querySelector(`[data-table-search="${this._id}"]`))
                : this._container.querySelector('[data-table-search]');
        }

        if (!input) return;
        this._searchInput = input;

        const doSearch = debounce(q => this.search(q), 250);
        input.addEventListener('input', () => doSearch(input.value));

        // Clear button (if [data-search-clear] exists near the input)
        const clearBtn = input.parentElement?.querySelector('[data-search-clear]');
        if (clearBtn) {
            clearBtn.addEventListener('click', () => {
                input.value = '';
                this.search('');
            });
        }
    }

    /* ── Private: Page size selector ─────────────────────────────────── */

    _initPageSizeSelect(selectRef) {
        let selectEl;
        if (selectRef instanceof Element) {
            selectEl = selectRef;
        } else if (typeof selectRef === 'string') {
            selectEl = document.getElementById(selectRef) || document.querySelector(selectRef);
        } else {
            const refId = this._container.dataset.pageSizeSelectId;
            selectEl = refId
                ? document.getElementById(refId)
                : this._container.querySelector('[data-page-size-select]');
        }

        if (!selectEl) return;

        selectEl.value = String(this._pageSize);
        selectEl.addEventListener('change', () => {
            this._pageSize = Number(selectEl.value) || 10;
            this._page = 1;
            this._render();
        });
    }

    /* ── Private: Bulk action bar ─────────────────────────────────────── */

    _initBulkBar() {
        this._bulkBar = this._container.querySelector('.table-bulk-bar');
        if (!this._bulkBar) return;

        this._bulkCountEl = this._bulkBar.querySelector('.table-bulk-count');

        // Bind action buttons
        this._bulkBar.querySelectorAll('[data-bulk-action]').forEach(btn => {
            btn.addEventListener('click', () => {
                emit(this._container, 'table:bulk', { action: btn.dataset.bulkAction, selected: this.selectedRows, table: this });
                this._onBulk?.({ action: btn.dataset.bulkAction, selected: this.selectedRows, table: this });
            });
        });

        // Dismiss button
        const dismiss = this._bulkBar.querySelector('[data-bulk-dismiss]');
        if (dismiss) dismiss.addEventListener('click', () => this.deselectAll());

        this._updateBulkBar();
    }

    _updateBulkBar() {
        if (!this._bulkBar) return;
        const n = this._selected.size;
        this._bulkBar.hidden = n === 0;
        if (this._bulkCountEl) this._bulkCountEl.textContent = `${n} baris dipilih`;
    }

    /* ── Private: Selection ───────────────────────────────────────────── */

    _initSelection() {
        this._table.classList.add('table-selectable');

        const selectAllCb = this._thead.querySelector('input[type="checkbox"][data-select-all]');
        if (selectAllCb) {
            selectAllCb.addEventListener('change', () => {
                selectAllCb.checked ? this.selectAll() : this.deselectAll();
            });
        }

        this._rebindRowCheckboxes();

        // Row click (skip interactive elements + expand/skeleton rows)
        this._tbody.addEventListener('click', e => {
            if (e.target.closest('input, button, a, [data-no-select]')) return;
            const row = e.target.closest('tr');
            if (!row || row.classList.contains('tr-expand-row') ||
                        row.classList.contains('tr-skeleton') ||
                        row.classList.contains('tr-empty')) return;
            this._selected.has(row) ? this.deselectRow(row) : this.selectRow(row);
        });
    }

    _rebindRowCheckboxes() {
        $$('input[type="checkbox"][data-row-check]', this._tbody).forEach(cb => {
            cb.addEventListener('change', () => {
                const row = cb.closest('tr');
                if (!row) return;
                cb.checked ? this.selectRow(row) : this.deselectRow(row);
            });
        });
    }

    _deselect(row, silent) {
        row.classList.remove('selected');
        row.setAttribute('aria-selected', 'false');
        this._selected.delete(row);
        const cb = row.querySelector('input[type="checkbox"][data-row-check]');
        if (cb) cb.checked = false;
        if (!silent) { this._updateSelectAll(); this._updateBulkBar(); }
    }

    _updateSelectAll() {
        const cb = this._thead.querySelector('input[type="checkbox"][data-select-all]');
        if (!cb) return;
        const visible = this._getVisibleRows();
        const allSel  = visible.length > 0 && visible.every(r => this._selected.has(r));
        const someSel = visible.some(r => this._selected.has(r));
        cb.checked       = allSel;
        cb.indeterminate = !allSel && someSel;
    }

    _getVisibleRows() {
        return Array.from(this._tbody.querySelectorAll(
            'tr:not([hidden]):not(.tr-skeleton):not(.tr-empty):not(.tr-expand-row)'
        ));
    }

    _resolveRow(target) {
        if (target instanceof Element) return target;
        if (typeof target === 'number') return this._allRows[target] || null;
        return null;
    }

    /* ── Private: Row expand ──────────────────────────────────────────── */

    _initRowExpand() {
        this._tbody.addEventListener('click', e => {
            const btn = e.target.closest('[data-expand-btn]');
            if (!btn) return;
            e.stopPropagation();

            const row = btn.closest('tr');
            if (!row) return;

            const isExpanded = row.classList.toggle('tr-expanded');
            btn.setAttribute('aria-expanded', String(isExpanded));

            // Look for existing expand row immediately after
            let expandRow = row.nextElementSibling;
            if (expandRow && expandRow.classList.contains('tr-expand-row')) {
                expandRow.hidden = !isExpanded;
                return;
            }

            // Create from data-expand-content attribute
            const content = row.dataset.expandContent;
            if (!content) return;

            expandRow = document.createElement('tr');
            expandRow.className = 'tr-expand-row';
            expandRow.innerHTML = `<td colspan="${row.cells.length}" class="tr-expand-cell">${content}</td>`;
            expandRow.hidden = !isExpanded;
            row.after(expandRow);
        });
    }

    /* ── Private: Pagination ──────────────────────────────────────────── */

    _createPager() {
        const el = document.createElement('div');
        el.className = 'table-footer';
        this._container.appendChild(el);
        return el;
    }

    _renderPage(displayRows) {
        const total = Math.max(1, Math.ceil(displayRows.length / this._pageSize));
        this._page  = Math.max(1, Math.min(this._page, total));
        const start = (this._page - 1) * this._pageSize;
        const end   = Math.min(start + this._pageSize, displayRows.length);

        displayRows.slice(start, end).forEach(r => {
            r.hidden = false;
            this._tbody.appendChild(r);
        });

        if (this._pagerEl) {
            this._renderPagerUI(
                displayRows.length > 0 ? start + 1 : 0,
                end,
                displayRows.length,
                total
            );
        }
    }

    _renderPagerUI(from, to, total, totalPages) {
        const el     = this._pagerEl;
        const pages  = this._pageNumbers(totalPages);
        const filter = !!this._searchQuery;

        el.innerHTML = `
            <span class="table-footer-info">
                Menampilkan <strong>${from}–${to}</strong> dari <strong>${total}</strong>
                ${filter ? `<span class="table-filter-badge">terfilter</span>` : ''}
            </span>
            <div class="table-footer-pages">
                <button class="btn btn-ghost btn-sm" data-page-prev aria-label="Halaman sebelumnya"
                    ${this._page <= 1 ? 'disabled' : ''}>${ICON_PREV}</button>
                ${pages.map(p => p === '…'
                    ? `<span class="table-page-ellipsis">…</span>`
                    : `<button class="btn btn-sm ${p === this._page ? 'btn-primary' : 'btn-ghost'}"
                            data-page="${p}" aria-label="Halaman ${p}">${p}</button>`
                ).join('')}
                <button class="btn btn-ghost btn-sm" data-page-next aria-label="Halaman berikutnya"
                    ${this._page >= totalPages ? 'disabled' : ''}>${ICON_NEXT}</button>
            </div>
        `;

        el.querySelector('[data-page-prev]')?.addEventListener('click', () => this.prev());
        el.querySelector('[data-page-next]')?.addEventListener('click', () => this.next());
        el.querySelectorAll('[data-page]').forEach(btn => {
            btn.addEventListener('click', () => this.goTo(Number(btn.dataset.page)));
        });
    }

    _pageNumbers(total) {
        if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
        const cur = this._page;
        if (cur <= 3) return [1, 2, 3, 4, '…', total];
        if (cur >= total - 2) return [1, '…', total - 3, total - 2, total - 1, total];
        return [1, '…', cur - 1, cur, cur + 1, '…', total];
    }

    /* ── Private: States ──────────────────────────────────────────────── */

    _checkEmpty(displayRows) {
        if (this._loading) return;
        const isEmpty  = displayRows.length === 0;
        const existing = this._tbody.querySelector('.tr-empty');

        if (isEmpty && !existing) {
            const cols = this._thead.querySelectorAll('th').length || 1;
            const tr   = document.createElement('tr');
            tr.className  = 'tr-empty';
            tr.innerHTML  = `<td colspan="${cols}">
                <span class="empty-icon">${this._emptyIcon}</span>
                <div class="empty-title">${this._emptyMessage}</div>
                ${this._searchQuery
                    ? `<div class="empty-desc">Tidak ditemukan hasil untuk "<em>${this._searchQuery}</em>"</div>`
                    : ''}
            </td>`;
            this._tbody.appendChild(tr);
        } else if (!isEmpty && existing) {
            existing.remove();
        }
    }

    _restoreRows() {
        this._allRows.forEach(r => {
            r.hidden = false;
            this._tbody.appendChild(r);
        });
    }
}

/* ══════════════════════════════════════════════
   Registry
   ══════════════════════════════════════════════ */

const _tables = new Map();

/**
 * Get or create a DataTable instance.
 * @param {string|Element} target
 * @param {Object} [options]
 * @returns {DataTable|null}
 */
export function getTable(target, options) {
    const el = (typeof target === 'string')
        ? (document.getElementById(target) || document.querySelector(target))
        : target;
    if (!el) return null;
    if (_tables.has(el)) return _tables.get(el);
    const instance = new DataTable(el, options);
    _tables.set(el, instance);
    return instance;
}

/* ── Declarative init ───────────────────────────────────────────────── */

register('[data-table]', el => {
    getTable(el, {
        sortable:    el.dataset.sortable    !== 'false',
        selectable:  el.dataset.selectable  === 'true',
        multiSelect: el.dataset.multiSelect !== 'false',
        paginate:    el.dataset.paginate    === 'true',
        pageSize:    Number(el.dataset.pageSize) || 10,
        expandable:  el.dataset.expandable  === 'true',
        sortCol:     el.dataset.sortCol     || null,
        sortDir:     el.dataset.sortDir     || 'asc',
        emptyMessage:el.dataset.emptyMessage || undefined,
        emptyIcon:   el.dataset.emptyIcon   || undefined,
    });
});

export { DataTable };
export default DataTable;
