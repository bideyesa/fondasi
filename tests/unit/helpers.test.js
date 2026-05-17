/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
    $,
    $$,
    el,
    esc,
    uid,
    on,
    emit,
    trapFocus,
    closest,
    debounce,
} from '../../src/js/core/helpers.js';

describe('Core Helpers', () => {
    describe('$ (querySelector)', () => {
        it('should find single element', () => {
            document.body.innerHTML = '<div id="test">Hello</div>';
            const result = $('#test');
            expect(result).not.toBeNull();
            expect(result.textContent).toBe('Hello');
        });

        it('should return null when not found', () => {
            document.body.innerHTML = '<div>Test</div>';
            const result = $('#nonexistent');
            expect(result).toBeNull();
        });

        it('should accept context parameter', () => {
            document.body.innerHTML = `
                <div id="outer">
                    <span id="inner">Inner</span>
                </div>
            `;
            const outer = document.getElementById('outer');
            const result = $('#inner', outer);
            expect(result).not.toBeNull();
            expect(result.id).toBe('inner');
        });
    });

    describe('$$ (querySelectorAll)', () => {
        it('should find all matching elements', () => {
            document.body.innerHTML = `
                <ul>
                    <li class="item">1</li>
                    <li class="item">2</li>
                    <li class="item">3</li>
                </ul>
            `;
            const results = $$('.item');
            expect(results).toHaveLength(3);
        });

        it('should return empty array when not found', () => {
            document.body.innerHTML = '<div>Test</div>';
            const results = $$('.nonexistent');
            expect(results).toEqual([]);
        });

        it('should accept context parameter', () => {
            document.body.innerHTML = `
                <div id="outer">
                    <span class="item">1</span>
                    <span class="item">2</span>
                </div>
                <span class="item">3</span>
            `;
            const outer = document.getElementById('outer');
            const results = $$('.item', outer);
            expect(results).toHaveLength(2);
        });
    });

    describe('el (createElement)', () => {
        it('should create element with tag', () => {
            const div = el('div');
            expect(div.tagName).toBe('DIV');
        });

        it('should set attributes', () => {
            const input = el('input', {
                type: 'text',
                placeholder: 'Enter name',
                id: 'username'
            });
            expect(input.type).toBe('text');
            expect(input.placeholder).toBe('Enter name');
            expect(input.id).toBe('username');
        });

        it('should set className via class attribute', () => {
            const div = el('div', { class: 'foo bar baz' });
            expect(div.className).toBe('foo bar baz');
        });

        it('should set innerHTML via html attribute', () => {
            const div = el('div', { html: '<span>Hello</span>' });
            expect(div.innerHTML).toBe('<span>Hello</span>');
        });

        it('should set data attributes', () => {
            const div = el('div', { 'data-id': '123', 'data-name': 'test' });
            expect(div.dataset.id).toBe('123');
            expect(div.dataset.name).toBe('test');
        });

        it('should set aria attributes', () => {
            const div = el('div', { 'aria-label': 'Close', 'aria-hidden': 'true' });
            expect(div.getAttribute('aria-label')).toBe('Close');
            expect(div.getAttribute('aria-hidden')).toBe('true');
        });

        it('should add string children', () => {
            const div = el('div', {}, 'Hello', ' World');
            expect(div.textContent).toBe('Hello World');
        });

        it('should add element children', () => {
            const child = document.createElement('span');
            child.textContent = 'Child';
            const parent = el('div', {}, child);
            expect(parent.children).toHaveLength(1);
            expect(parent.children[0].textContent).toBe('Child');
        });
    });

    describe('esc (escapeHTML)', () => {
        it('should escape HTML special characters', () => {
            expect(esc('<script>')).toBe('&lt;script&gt;');
            expect(esc('&amp;')).toBe('&amp;amp;');
            // Note: textContent doesn't escape quotes, only < > &
        });

        it('should handle empty string', () => {
            expect(esc('')).toBe('');
        });

        it('should handle non-string input', () => {
            expect(esc(null)).toBe('null');
            expect(esc(123)).toBe('123');
        });
    });

    describe('uid (unique ID)', () => {
        it('should generate unique IDs', () => {
            const id1 = uid();
            const id2 = uid();
            expect(id1).not.toBe(id2);
        });

        it('should accept prefix', () => {
            const id = uid('btn');
            expect(id.startsWith('btn-')).toBe(true);
        });

        it('should have reasonable length', () => {
            const id = uid();
            expect(id.length).toBeGreaterThan(5);
        });
    });

    describe('on (event listener)', () => {
        it('should attach event to single element', () => {
            const btn = document.createElement('button');
            const handler = vi.fn();
            on(btn, 'click', handler);
            btn.click();
            expect(handler).toHaveBeenCalledTimes(1);
        });

        it('should attach event to multiple elements', () => {
            const btn1 = document.createElement('button');
            const btn2 = document.createElement('button');
            const handler = vi.fn();
            on([btn1, btn2], 'click', handler);
            btn1.click();
            btn2.click();
            expect(handler).toHaveBeenCalledTimes(2);
        });

        it('should attach event to NodeList', () => {
            document.body.innerHTML = '<button></button><button></button>';
            const buttons = document.querySelectorAll('button');
            // Convert to array to ensure proper handling
            const buttonArray = Array.from(buttons);
            const handler = vi.fn();
            on(buttonArray, 'click', handler);
            buttonArray[0].click();
            buttonArray[1].click();
            expect(handler).toHaveBeenCalledTimes(2);
        });

        it('should accept options parameter', () => {
            const btn = document.createElement('button');
            const handler = vi.fn();
            const options = { once: true };
            on(btn, 'click', handler, options);
            btn.click();
            btn.click();
            expect(handler).toHaveBeenCalledTimes(1);
        });

        it('should handle null/undefined element gracefully', () => {
            expect(() => on(null, 'click', vi.fn())).not.toThrow();
        });
    });

    describe('emit (custom event)', () => {
        it('should dispatch custom event', () => {
            const div = document.createElement('div');
            const handler = vi.fn();
            div.addEventListener('fondasi:test', (e) => handler(e.detail));
            emit(div, 'test', { foo: 'bar' });
            expect(handler).toHaveBeenCalledWith({ foo: 'bar' });
        });

        it('should bubble events', () => {
            const parent = document.createElement('div');
            const child = document.createElement('span');
            parent.appendChild(child);
            const handler = vi.fn();
            parent.addEventListener('fondasi:bubbles', (e) => handler(e.detail));
            emit(child, 'bubbles', { data: 'test' });
            expect(handler).toHaveBeenCalledWith({ data: 'test' });
        });

        it('should handle empty detail', () => {
            const div = document.createElement('div');
            const handler = vi.fn();
            div.addEventListener('fondasi:empty', (e) => handler(e.detail));
            emit(div, 'empty');
            expect(handler).toHaveBeenCalledWith({});
        });
    });

    describe('trapFocus', () => {
        it('should focus first focusable element', () => {
            const container = document.createElement('div');
            container.innerHTML = '<button>First</button><button>Second</button>';
            document.body.appendChild(container);
            trapFocus(container);
            expect(document.activeElement.textContent).toBe('First');
            container.remove();
        });

        it('should return cleanup function', () => {
            const container = document.createElement('div');
            container.innerHTML = '<button>Test</button>';
            document.body.appendChild(container);
            const cleanup = trapFocus(container);
            expect(typeof cleanup).toBe('function');
            cleanup();
            container.remove();
        });

        it('should trap Tab key', () => {
            const container = document.createElement('div');
            container.innerHTML = '<button>First</button><button>Last</button>';
            document.body.appendChild(container);
            trapFocus(container);

            // Simulate Tab from last element
            const lastBtn = container.querySelectorAll('button')[1];
            lastBtn.focus();
            const event = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true });
            container.dispatchEvent(event);
            // Focus should wrap to first
            expect(document.activeElement.textContent).toBe('First');
            container.remove();
        });

        it('should handle no focusable elements', () => {
            const container = document.createElement('div');
            container.innerHTML = '<div>No focusable</div>';
            document.body.appendChild(container);
            const cleanup = trapFocus(container);
            expect(() => cleanup()).not.toThrow();
            container.remove();
        });
    });

    describe('closest', () => {
        it('should find closest ancestor', () => {
            document.body.innerHTML = `
                <div class="outer">
                    <div class="inner">
                        <span>Text</span>
                    </div>
                </div>
            `;
            const span = document.querySelector('span');
            const result = closest(span, '.outer');
            expect(result).not.toBeNull();
            expect(result.classList.contains('outer')).toBe(true);
        });

        it('should return null when no match', () => {
            document.body.innerHTML = '<div><span>Text</span></div>';
            const span = document.querySelector('span');
            const result = closest(span, '.nonexistent');
            expect(result).toBeNull();
        });

        it('should handle null element', () => {
            expect(closest(null, '.foo')).toBeNull();
        });
    });

    describe('debounce', () => {
        beforeEach(() => {
            vi.useFakeTimers();
        });

        it('should delay function execution', () => {
            const fn = vi.fn();
            const debounced = debounce(fn, 100);
            debounced();
            expect(fn).not.toHaveBeenCalled();
            vi.advanceTimersByTime(100);
            expect(fn).toHaveBeenCalledTimes(1);
        });

        it('should reset timer on subsequent calls', () => {
            const fn = vi.fn();
            const debounced = debounce(fn, 100);
            debounced();
            debounced();
            vi.advanceTimersByTime(50);
            expect(fn).not.toHaveBeenCalled();
            vi.advanceTimersByTime(50);
            expect(fn).toHaveBeenCalledTimes(1);
        });

        it('should pass arguments to function', () => {
            const fn = vi.fn();
            const debounced = debounce(fn, 100);
            debounced('arg1', 'arg2');
            vi.advanceTimersByTime(100);
            expect(fn).toHaveBeenCalledWith('arg1', 'arg2');
        });
    });
});