/* fondasi — js/index.js
 * Entry point — re-exports all modules in dependency order
 * ─────────────────────────────────────────────────────────
 *
 * Module order:
 *   1. core       — shared helpers & event bus
 *   2. theme      — light/dark mode manager
 *   3. components — interactive UI components
 *
 * Usage (ES module):
 *   import { Modal, getToast, initComponents } from 'fondasi';
 *
 * Usage (UMD / browser):
 *   <script src="dist/fondasi.js"></script>
 *   <script>
 *     Fondasi.getToast().show('Hello!');
 *     Fondasi.initComponents();
 *   </script>
 *
 * ─────────────────────────────────────────────────────────── */

/* ── 1. Core ──────────────────────────────────────────────── */
export * from './core/helpers.js';
export * from './core/events.js';

/* ── 2. Theme ─────────────────────────────────────────────── */
export { FondasiTheme, THEMES, getTheme } from './theme.js';
export { default as theme } from './theme.js';

/* ── 3. Components ────────────────────────────────────────── */

// Toast
export { ToastManager, getToast } from './components/toast.js';

// Modal
export { Modal, getModal, dialog } from './components/modal.js';

// Drawer
export { Drawer, getDrawer } from './components/drawer.js';

// Tabs
export { Tabs } from './components/tabs.js';

// Accordion
export { Accordion } from './components/accordion.js';

// Dropdown
export { Dropdown, getDropdown } from './components/dropdown.js';

// Sidebar
export { Sidebar, getSidebar } from './components/sidebar.js';

// Forms
export {
    CharCounter,
    PasswordToggle,
    setFieldError,
    clearFormErrors,
    validateField,
    validateForm,
    charCounter,
    passwordToggle,
} from './components/form.js';

// Search Select
export {
    SearchSelect,
    MultiSearchSelect,
    getSearchSelect,
    getMultiSearchSelect,
} from './components/search-select.js';

// Table
export { DataTable, getTable } from './components/table.js';

// Avatar
export { Avatar, AvatarGroup, createAvatar, createAvatarGroup } from './components/avatar.js';

