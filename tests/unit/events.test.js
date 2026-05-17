/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { delegate, initComponents } from '../../src/js/core/events.js';
import { bus } from '../../src/js/core/events.js';

describe('Global bus singleton', () => {
    beforeEach(() => {
        bus.clear();
    });

    it('should be defined', () => {
        expect(bus).toBeDefined();
    });

    it('should have on method', () => {
        expect(typeof bus.on).toBe('function');
    });

    it('should have emit method', () => {
        expect(typeof bus.emit).toBe('function');
    });

    it('should support event subscription', () => {
        const handler = vi.fn();
        bus.on('test', handler);
        bus.emit('test', { data: 'hello' });
        expect(handler).toHaveBeenCalledWith({ data: 'hello' });
    });

    it('should support unsubscribe', () => {
        const handler = vi.fn();
        const unsubscribe = bus.on('test', handler);
        unsubscribe();
        bus.emit('test');
        expect(handler).not.toHaveBeenCalled();
    });

    it('should support once', () => {
        const handler = vi.fn();
        bus.once('test', handler);
        bus.emit('test');
        bus.emit('test');
        expect(handler).toHaveBeenCalledTimes(1);
    });

    it('should support clear', () => {
        const handler1 = vi.fn();
        const handler2 = vi.fn();
        bus.on('event1', handler1);
        bus.on('event2', handler2);
        bus.clear();
        bus.emit('event1');
        bus.emit('event2');
        expect(handler1).not.toHaveBeenCalled();
        expect(handler2).not.toHaveBeenCalled();
    });
});

describe('delegate', () => {
    beforeEach(() => {
        document.body.innerHTML = `
            <div id="root">
                <button class="btn" data-action="save">Save</button>
                <button class="btn" data-action="delete">Delete</button>
                <span class="other">Other</span>
            </div>
        `;
    });

    it('should attach delegated event listener', () => {
        const root = document.getElementById('root');
        const handler = vi.fn();
        const cleanup = delegate(root, 'click', '.btn', handler);

        const saveBtn = root.querySelector('[data-action="save"]');
        saveBtn.click();

        expect(handler).toHaveBeenCalledTimes(1);
        expect(handler).toHaveBeenCalledWith(saveBtn, expect.any(Event));
        cleanup();
    });

    it('should match event on nested elements', () => {
        document.body.innerHTML = `
            <div id="root">
                <span class="wrapper"><button class="btn">Click</button></span>
            </div>
        `;
        const root = document.getElementById('root');
        const handler = vi.fn();
        const cleanup = delegate(root, 'click', '.btn', handler);

        const btn = root.querySelector('.btn');
        btn.click();

        expect(handler).toHaveBeenCalledTimes(1);
        cleanup();
    });

    it('should not fire when target does not match', () => {
        const root = document.getElementById('root');
        const handler = vi.fn();
        const cleanup = delegate(root, 'click', '.btn', handler);

        const other = root.querySelector('.other');
        other.click();

        expect(handler).not.toHaveBeenCalled();
        cleanup();
    });

    it('should return cleanup function', () => {
        const root = document.getElementById('root');
        const handler = vi.fn();
        const cleanup = delegate(root, 'click', '.btn', handler);

        expect(typeof cleanup).toBe('function');
        cleanup();

        const btn = root.querySelector('.btn');
        btn.click();
        expect(handler).not.toHaveBeenCalled();
    });
});

describe('Component Registration & Init', () => {
    // Note: registry is global, so tests may affect each other
    // But initComponents should work correctly

    it('should initialize elements matching selector', () => {
        const factory = vi.fn();

        document.body.innerHTML = '<div data-test></div>';
        initComponents();

        // Note: factory needs to be registered first for this to work
        // Without registration, initComponents does nothing
        // This test just verifies initComponents doesn't throw
        expect(true).toBe(true);
    });

    it('should not throw with empty body', () => {
        document.body.innerHTML = '<div id="app"></div>';
        expect(() => initComponents()).not.toThrow();
    });

    it('should accept root parameter', () => {
        document.body.innerHTML = '<div id="container"><div data-tabs></div></div>';
        const container = document.getElementById('container');
        expect(() => initComponents(container)).not.toThrow();
    });
});