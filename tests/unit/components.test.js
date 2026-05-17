/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

// Import all components
import { Tabs } from '../../src/js/components/tabs.js';
import { Accordion } from '../../src/js/components/accordion.js';
import { Drawer, getDrawer } from '../../src/js/components/drawer.js';
import { Dropdown, getDropdown } from '../../src/js/components/dropdown.js';
import { Sidebar, getSidebar } from '../../src/js/components/sidebar.js';
import { DataTable, getTable } from '../../src/js/components/table.js';
import { Avatar, AvatarGroup, createAvatar, createAvatarGroup } from '../../src/js/components/avatar.js';

describe('Tabs Component', () => {
    let tabs;

    beforeEach(() => {
        document.body.innerHTML = `
            <div class="tabs-container">
                <div class="tabs">
                    <button class="tab" data-tab="tab1">Tab 1</button>
                    <button class="tab" data-tab="tab2">Tab 2</button>
                    <button class="tab" data-tab="tab3">Tab 3</button>
                </div>
                <div class="tab-panel" id="tab1">Content 1</div>
                <div class="tab-panel" id="tab2">Content 2</div>
                <div class="tab-panel" id="tab3">Content 3</div>
            </div>
        `;
        const container = document.querySelector('.tabs-container');
        tabs = new Tabs(container);
    });

    it('should create tabs instance', () => {
        expect(tabs).toBeDefined();
    });

    it('should have tabs and panels', () => {
        expect(tabs._tabs.length).toBe(3);
        expect(tabs._panels.length).toBe(3);
    });

    it('should activate first tab by default', () => {
        expect(tabs._tabs[0].classList.contains('active')).toBe(true);
    });

    it('should have activeIndex property', () => {
        expect(typeof tabs.activeIndex).toBe('number');
    });

    it('should select tab by index', () => {
        tabs.select(1);
        expect(tabs._tabs[1].classList.contains('active')).toBe(true);
    });

    it('should select tab by value', () => {
        tabs.select('tab2');
        expect(tabs._tabs[1].classList.contains('active')).toBe(true);
    });
});

describe('Accordion Component', () => {
    let accordion;

    beforeEach(() => {
        document.body.innerHTML = `
            <div class="accordion">
                <div class="accordion-item">
                    <button class="accordion-trigger" aria-expanded="false">
                        Item 1
                    </button>
                    <div class="accordion-panel" hidden>Content 1</div>
                </div>
                <div class="accordion-item">
                    <button class="accordion-trigger" aria-expanded="false">
                        Item 2
                    </button>
                    <div class="accordion-panel" hidden>Content 2</div>
                </div>
            </div>
        `;
        const container = document.querySelector('.accordion');
        accordion = new Accordion(container);
    });

    it('should create accordion instance', () => {
        expect(accordion).toBeDefined();
    });

    it('should have items', () => {
        expect(accordion._items.length).toBe(2);
    });
});

describe('Drawer Component', () => {
    let drawer;

    beforeEach(() => {
        document.body.innerHTML = `
            <div class="drawer-overlay" id="test-drawer" hidden>
                <div class="drawer drawer-right">
                    <div class="drawer-header">
                        <h3>Drawer Title</h3>
                    </div>
                    <div class="drawer-body">Drawer content</div>
                </div>
            </div>
        `;
    });

    afterEach(() => {
        document.querySelectorAll('.drawer-overlay').forEach(el => el.remove());
    });

    it('should create drawer instance', () => {
        const el = document.getElementById('test-drawer');
        drawer = new Drawer(el);
        expect(drawer).toBeDefined();
    });

    it('should get drawer from id', () => {
        drawer = getDrawer('test-drawer');
        expect(drawer).toBeInstanceOf(Drawer);
    });

    it('should open drawer', () => {
        drawer = getDrawer('test-drawer');
        drawer.open();
        expect(drawer.isOpen).toBe(true);
    });

    it('should close drawer', () => {
        drawer = getDrawer('test-drawer');
        drawer.open();
        drawer.close();
        expect(drawer.isOpen).toBe(false);
    });

    it('should toggle drawer', () => {
        drawer = getDrawer('test-drawer');
        drawer.toggle();
        expect(drawer.isOpen).toBe(true);
    });
});

describe('Dropdown Component', () => {
    let dropdown;

    beforeEach(() => {
        document.body.innerHTML = `
            <div class="dropdown" id="test-dropdown">
                <button class="dropdown-toggle">Toggle</button>
                <div class="dropdown-menu" hidden>
                    <a href="#" class="dropdown-item">Item 1</a>
                    <a href="#" class="dropdown-item">Item 2</a>
                </div>
            </div>
        `;
    });

    afterEach(() => {
        document.querySelectorAll('.dropdown').forEach(el => el.remove());
    });

    it('should create dropdown instance', () => {
        const el = document.getElementById('test-dropdown');
        dropdown = new Dropdown(el);
        expect(dropdown).toBeDefined();
    });

    it('should get dropdown from id', () => {
        dropdown = getDropdown('test-dropdown');
        expect(dropdown).toBeInstanceOf(Dropdown);
    });

    it('should open dropdown', () => {
        dropdown = getDropdown('test-dropdown');
        dropdown.open();
        expect(dropdown.isOpen).toBe(true);
    });

    it('should close dropdown', () => {
        dropdown = getDropdown('test-dropdown');
        dropdown.open();
        dropdown.close();
        expect(dropdown.isOpen).toBe(false);
    });
});

describe('Sidebar Component', () => {
    let sidebar;

    beforeEach(() => {
        document.body.innerHTML = `
            <aside class="sidebar" id="test-sidebar">
                <nav class="sidebar-nav">
                    <a href="#" class="sidebar-item">Home</a>
                    <a href="#" class="sidebar-item">Profile</a>
                </nav>
            </aside>
        `;
    });

    afterEach(() => {
        document.querySelectorAll('.sidebar').forEach(el => el.remove());
    });

    it('should create sidebar instance', () => {
        const el = document.getElementById('test-sidebar');
        sidebar = new Sidebar(el);
        expect(sidebar).toBeDefined();
    });

    it('should get sidebar from id', () => {
        sidebar = getSidebar('test-sidebar');
        expect(sidebar).toBeInstanceOf(Sidebar);
    });

    it('should have isCollapsed property', () => {
        sidebar = getSidebar('test-sidebar');
        expect(typeof sidebar.isCollapsed).toBe('boolean');
    });

    it('should collapse sidebar', () => {
        sidebar = getSidebar('test-sidebar');
        sidebar.collapse();
        expect(sidebar.isCollapsed).toBe(true);
    });

    it('should expand sidebar', () => {
        sidebar = getSidebar('test-sidebar');
        sidebar.collapse();
        sidebar.expand();
        expect(sidebar.isCollapsed).toBe(false);
    });
});

describe('DataTable Component', () => {
    let dataTable;

    beforeEach(() => {
        document.body.innerHTML = `
            <div class="table-wrap" id="test-table">
                <table class="table">
                    <thead>
                        <tr>
                            <th>Name</th>
                            <th>Age</th>
                            <th>City</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td>John</td>
                            <td>25</td>
                            <td>NYC</td>
                        </tr>
                        <tr>
                            <td>Jane</td>
                            <td>30</td>
                            <td>LA</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        `;
    });

    afterEach(() => {
        document.querySelectorAll('.table-wrap').forEach(el => el.remove());
    });

    it('should create table instance', () => {
        const el = document.getElementById('test-table');
        dataTable = new DataTable(el);
        expect(dataTable).toBeDefined();
    });

    it('should get table from id', () => {
        dataTable = getTable('test-table');
        expect(dataTable).toBeInstanceOf(DataTable);
    });

    it('should have table element', () => {
        dataTable = getTable('test-table');
        expect(dataTable._table).not.toBeNull();
    });
});

describe('Avatar Components', () => {
    describe('createAvatar', () => {
        it('should create avatar element', () => {
            const avatar = createAvatar({ name: 'Test' });
            expect(avatar).toBeDefined();
            expect(avatar.classList.contains('avatar')).toBe(true);
        });

        it('should create avatar with size', () => {
            const avatar = createAvatar({ size: 'lg' });
            expect(avatar.classList.contains('avatar-lg')).toBe(true);
        });

        it('should create avatar with shape', () => {
            const avatar = createAvatar({ shape: 'circle' });
            expect(avatar.classList.contains('avatar-circle')).toBe(true);
        });

        it('should create avatar with options', () => {
            const avatar = createAvatar({ initial: 'JD', src: 'img.jpg' });
            expect(avatar.dataset.initial).toBe('JD');
            expect(avatar.dataset.src).toBe('img.jpg');
        });
    });

    describe('createAvatarGroup', () => {
        it('should create avatar group element', () => {
            const group = createAvatarGroup([
                { name: 'John' },
                { name: 'Jane' },
                { name: 'Bob' }
            ]);
            expect(group).toBeDefined();
            expect(group.classList.contains('avatar-group')).toBe(true);
        });

        it('should set max attribute on group', () => {
            const group = createAvatarGroup([
                { name: 'A' },
                { name: 'B' },
                { name: 'C' },
                { name: 'D' }
            ], { max: 3 });
            expect(group.dataset.max).toBe('3');
        });
    });

    describe('Avatar class', () => {
        it('should initialize with element', () => {
            const el = document.createElement('div');
            el.className = 'avatar';
            const avatar = new Avatar(el, { name: 'Test' });
            expect(avatar).toBeDefined();
        });

        it('should set initial text', () => {
            const el = document.createElement('div');
            el.className = 'avatar';
            const avatar = new Avatar(el);
            avatar.setInitial('JD');
            expect(el.textContent).toBe('JD');
        });

        it('should set status', () => {
            const el = document.createElement('div');
            el.className = 'avatar';
            const avatar = new Avatar(el);
            avatar.setStatus('online');
            expect(el.classList.contains('avatar-status')).toBe(true);
            expect(el.classList.contains('avatar-status-online')).toBe(true);
        });
    });
});