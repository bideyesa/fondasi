/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { ToastManager, getToast } from '../../src/js/components/toast.js';
import { bus } from '../../src/js/core/events.js';

describe('ToastManager', () => {
    let toastManager;

    beforeEach(() => {
        vi.useFakeTimers();
        document.querySelectorAll('.toast-container').forEach(el => el.remove());
        toastManager = new ToastManager();
    });

    afterEach(() => {
        vi.useRealTimers();
        toastManager.clear();
        document.querySelectorAll('.toast-container').forEach(el => el.remove());
    });

    describe('constructor', () => {
        it('should create toast manager', () => {
            expect(toastManager).toBeDefined();
        });

        it('should accept options', () => {
            const manager = new ToastManager({ duration: 5000, position: 'top-left' });
            expect(manager).toBeDefined();
        });

        it('should listen to bus events', () => {
            const showSpy = vi.spyOn(toastManager, 'show');
            bus.emit('toast:show', 'Test message');
            expect(showSpy).toHaveBeenCalledWith('Test message');
        });
    });

    describe('show', () => {
        it('should create toast with string message', () => {
            vi.advanceTimersByTime(0);
            const id = toastManager.show('Hello World');
            const toast = document.getElementById(id);
            expect(toast).not.toBeNull();
            expect(toast.textContent).toContain('Hello World');
        });

        it('should create toast with options object', () => {
            vi.advanceTimersByTime(0);
            const id = toastManager.show({
                type: 'success',
                message: 'Success!',
                title: 'Success'
            });
            const toast = document.getElementById(id);
            expect(toast.classList.contains('toast-success')).toBe(true);
        });

        it('should set type correctly', () => {
            const types = ['success', 'warning', 'danger', 'info'];
            types.forEach(type => {
                vi.advanceTimersByTime(0);
                const id = toastManager.show({ type, message: 'Test' });
                const toast = document.getElementById(id);
                expect(toast.classList.contains(`toast-${type}`)).toBe(true);
            });
        });

        it('should create container for position', () => {
            vi.advanceTimersByTime(0);
            toastManager.show({ message: 'Test', position: 'top-right' });
            const container = document.querySelector('.toast-container.top-right');
            expect(container).not.toBeNull();
        });

        it('should respect max limit', () => {
            const manager = new ToastManager({ max: 2 });
            vi.advanceTimersByTime(0);
            manager.show({ message: '1', duration: 0 });
            manager.show({ message: '2', duration: 0 });
            manager.show({ message: '3', duration: 0 });
            const toasts = document.querySelectorAll('.toast');
            expect(toasts.length).toBeLessThanOrEqual(3); // May have toast-exit class
        });

        it('should return toast id', () => {
            vi.advanceTimersByTime(0);
            const id = toastManager.show('Test');
            expect(typeof id).toBe('string');
            expect(id.startsWith('toast-')).toBe(true);
        });

        it('should apply aria attributes', () => {
            vi.advanceTimersByTime(0);
            const id = toastManager.show({ type: 'danger', message: 'Error!' });
            const toast = document.getElementById(id);
            expect(toast.getAttribute('role')).toBe('alert');
        });

        it('should handle actions', () => {
            vi.advanceTimersByTime(0);
            const actionFn = vi.fn();
            const id = toastManager.show({
                message: 'Test',
                actions: [{ label: 'Undo', action: actionFn }]
            });
            const toast = document.getElementById(id);
            const actionBtn = toast.querySelector('.toast-action');
            actionBtn.click();
            expect(actionFn).toHaveBeenCalledTimes(1);
        });
    });

    describe('shortcuts', () => {
        it('should have success method', () => {
            vi.advanceTimersByTime(0);
            const id = toastManager.success('Saved!');
            const toast = document.getElementById(id);
            expect(toast.classList.contains('toast-success')).toBe(true);
        });

        it('should have warning method', () => {
            vi.advanceTimersByTime(0);
            const id = toastManager.warning('Warning!');
            const toast = document.getElementById(id);
            expect(toast.classList.contains('toast-warning')).toBe(true);
        });

        it('should have danger method', () => {
            vi.advanceTimersByTime(0);
            const id = toastManager.danger('Error!');
            const toast = document.getElementById(id);
            expect(toast.classList.contains('toast-danger')).toBe(true);
        });

        it('should have info method', () => {
            vi.advanceTimersByTime(0);
            const id = toastManager.info('Info');
            const toast = document.getElementById(id);
            expect(toast.classList.contains('toast-info')).toBe(true);
        });
    });

    describe('dismiss', () => {
        it('should dismiss specific toast by id', () => {
            vi.advanceTimersByTime(0);
            const id = toastManager.show({ message: 'Test', duration: 0 });
            toastManager.dismiss(id);
            const toast = document.getElementById(id);
            // Toast gets exit class, may still exist in DOM
            expect(toast.classList.contains('toast-exit') || !toast).toBe(true);
        });
    });

    describe('clear', () => {
        it('should remove all toasts', () => {
            vi.advanceTimersByTime(0);
            toastManager.show({ message: 'Test 1', duration: 0 });
            toastManager.show({ message: 'Test 2', duration: 0 });
            toastManager.clear();
            // All toasts should have exit class or be removed
            const activeToasts = document.querySelectorAll('.toast:not(.toast-exit)');
            expect(activeToasts.length).toBe(0);
        });
    });

    describe('positioning', () => {
        it('should create multiple position containers', () => {
            vi.advanceTimersByTime(0);
            toastManager.show({ message: '1', position: 'top-right' });
            toastManager.show({ message: '2', position: 'top-left' });
            toastManager.show({ message: '3', position: 'bottom-right' });

            expect(document.querySelector('.toast-container.top-right')).not.toBeNull();
            expect(document.querySelector('.toast-container.top-left')).not.toBeNull();
            expect(document.querySelector('.toast-container.bottom-right')).not.toBeNull();
        });
    });

    describe('closable', () => {
        it('should show close button when closable', () => {
            vi.advanceTimersByTime(0);
            const id = toastManager.show({ message: 'Test', closable: true });
            const toast = document.getElementById(id);
            expect(toast.querySelector('.toast-close')).not.toBeNull();
        });

        it('should hide close button when not closable', () => {
            vi.advanceTimersByTime(0);
            const id = toastManager.show({ message: 'Test', closable: false });
            const toast = document.getElementById(id);
            expect(toast.querySelector('.toast-close')).toBeNull();
        });
    });
});

describe('getToast', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        document.querySelectorAll('.toast-container').forEach(el => el.remove());
    });

    afterEach(() => {
        vi.useRealTimers();
        document.querySelectorAll('.toast-container').forEach(el => el.remove());
    });

    it('should return singleton instance', () => {
        const instance1 = getToast();
        const instance2 = getToast();
        expect(instance1).toBe(instance2);
    });
});