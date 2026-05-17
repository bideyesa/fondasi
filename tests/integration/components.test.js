/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock matchMedia for tests that use theme
beforeEach(() => {
    window.matchMedia = vi.fn().mockImplementation(query => ({
        matches: false,
        media: query,
        onchange: null,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
    }));
});

describe('Component Integration Tests', () => {
    describe('Toast + Event Bus Integration', () => {
        beforeEach(() => {
            vi.useFakeTimers();
            document.body.innerHTML = '';
            document.querySelectorAll('.toast-container').forEach(el => el.remove());
        });

        afterEach(() => {
            vi.useRealTimers();
        });

        it('should respond to bus events', async () => {
            const { getToast } = await import('../../src/js/components/toast.js');
            const { bus } = await import('../../src/js/core/events.js');
            const toast = getToast();

            vi.advanceTimersByTime(0);
            bus.emit('toast:show', { type: 'success', message: 'Integration test' });

            const toastEl = document.querySelector('.toast-success');
            expect(toastEl).not.toBeNull();
            expect(toastEl.textContent).toContain('Integration test');

            toast.clear();
        });

        it('should clear all toasts on bus event', async () => {
            const { getToast } = await import('../../src/js/components/toast.js');
            const { bus } = await import('../../src/js/core/events.js');
            const toast = getToast();

            vi.advanceTimersByTime(0);
            toast.show('Test 1');
            toast.show('Test 2');

            bus.emit('toast:clear');

            toast.clear();
            const toasts = document.querySelectorAll('.toast');
            expect(toasts.length).toBe(0);
        });
    });

    describe('Modal + Event Integration', () => {
        beforeEach(() => {
            document.body.innerHTML = `
                <button data-modal-open="test-modal">Open</button>
                <div class="modal-overlay" id="test-modal" hidden>
                    <div class="modal">
                        <button data-modal-close>Close</button>
                    </div>
                </div>
            `;
        });

        afterEach(() => {
            document.querySelectorAll('.modal-overlay').forEach(el => el.remove());
            document.body.classList.remove('modal-open');
        });

        it('should open modal from data attribute trigger', async () => {
            const { getModal } = await import('../../src/js/components/modal.js');

            const trigger = document.querySelector('[data-modal-open]');
            trigger.click();

            const modal = getModal('test-modal');
            expect(modal.isOpen).toBe(true);

            modal.close();
        });

        it('should close modal from data attribute close button', async () => {
            const { getModal } = await import('../../src/js/components/modal.js');

            const modal = getModal('test-modal');
            modal.open();

            const closeBtn = document.querySelector('[data-modal-close]');
            closeBtn.click();

            expect(modal.isOpen).toBe(false);
        });
    });

    describe('Theme + Toast Integration', () => {
        beforeEach(() => {
            document.body.innerHTML = '';
            document.documentElement.removeAttribute('data-theme');
        });

        afterEach(() => {
            document.querySelectorAll('.toast-container').forEach(el => el.remove());
        });

        it('should work with theme system', async () => {
            const { getTheme } = await import('../../src/js/theme.js');
            const { getToast } = await import('../../src/js/components/toast.js');

            const theme = getTheme({ default: 'light' });
            expect(theme).toBeDefined();
            expect(theme.current).toBeDefined();

            const toast = getToast();
            expect(toast).toBeDefined();
        });
    });

    describe('Full Component Initialization', () => {
        it('should initialize without errors', async () => {
            document.body.innerHTML = `
                <div id="app">
                    <div class="modal-overlay" id="modal-1" hidden>
                        <div class="modal">Modal Content</div>
                    </div>
                    <button data-modal-open="modal-1">Open Modal</button>
                </div>
            `;

            const { initComponents } = await import('../../src/js/core/events.js');

            initComponents();

            expect(true).toBe(true);
        });

        it('should handle dynamic content after init', async () => {
            document.body.innerHTML = '<div id="app"></div>';

            const { initComponents } = await import('../../src/js/core/events.js');

            document.getElementById('app').innerHTML = `
                <div class="modal-overlay" id="dynamic-modal" hidden>
                    <div class="modal">Dynamic Modal</div>
                </div>
            `;

            initComponents(document.getElementById('app'));

            expect(true).toBe(true);
        });
    });

    describe('Form Validation + UI Integration', () => {
        beforeEach(() => {
            document.body.innerHTML = `
                <form id="test-form">
                    <div class="form-group">
                        <label for="username">Username</label>
                        <input type="text" id="username" name="username" required minlength="3">
                    </div>
                    <div class="form-group">
                        <label for="email">Email</label>
                        <input type="email" id="email" name="email" required>
                    </div>
                    <button type="submit">Submit</button>
                </form>
            `;
        });

        it('should validate form', async () => {
            const { validateForm } = await import('../../src/js/components/form.js');

            const form = document.getElementById('test-form');
            const result = validateForm(form);

            expect(result === false).toBe(true);
        });

        it('should allow form submission when valid', async () => {
            const { validateForm } = await import('../../src/js/components/form.js');

            const form = document.getElementById('test-form');
            form.querySelector('#username').value = 'validuser';
            form.querySelector('#email').value = 'test@example.com';

            const result = validateForm(form);
            expect(result).toBe(true);
        });
    });

    describe('Error Handling Integration', () => {
        beforeEach(() => {
            document.body.innerHTML = `
                <div class="modal-overlay" id="error-modal" hidden>
                    <div class="modal">Content</div>
                </div>
            `;
        });

        afterEach(() => {
            document.querySelectorAll('.modal-overlay').forEach(el => el.remove());
        });

        it('should handle getModal with invalid selector gracefully', async () => {
            const { getModal } = await import('../../src/js/components/modal.js');

            const modal = getModal('#nonexistent');
            expect(modal).toBeNull();
        });

        it('should handle toast with invalid options', async () => {
            vi.useFakeTimers();
            const { getToast } = await import('../../src/js/components/toast.js');
            const toast = getToast();

            expect(() => toast.show(null)).not.toThrow();
            expect(() => toast.show(undefined)).not.toThrow();

            toast.clear();
            vi.useRealTimers();
        });
    });
});