/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { FondasiTheme, THEMES, getTheme } from '../../src/js/theme.js';

// Mock matchMedia for all tests
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

describe('FondasiTheme', () => {
    let theme;

    beforeEach(() => {
        localStorage.clear();
        document.documentElement.removeAttribute('data-theme');
    });

    afterEach(() => {
        if (theme) {
            theme.destroy();
        }
    });

    describe('constructor', () => {
        it('should create theme with default options', () => {
            theme = new FondasiTheme();
            expect(theme.current).toBeDefined();
        });

        it('should accept custom default mode', () => {
            theme = new FondasiTheme({ default: 'dark' });
            expect(theme.preference).toBe('dark');
        });

        it('should accept custom root element', () => {
            const customRoot = document.createElement('div');
            theme = new FondasiTheme({ root: customRoot });
            expect(theme).toBeDefined();
        });

        it('should respect persist option', () => {
            theme = new FondasiTheme({ persist: false });
            expect(theme.preference).toBe('system');
        });

        it('should load saved preference from localStorage', () => {
            localStorage.setItem('fondasi-theme', 'dark');
            theme = new FondasiTheme();
            expect(theme.preference).toBe('dark');
        });
    });

    describe('set', () => {
        it('should set theme preference', () => {
            theme = new FondasiTheme();
            theme.set('dark');
            expect(theme.preference).toBe('dark');
            expect(theme.current).toBe('dark');
        });

        it('should set to system', () => {
            theme = new FondasiTheme();
            theme.set('system');
            expect(theme.preference).toBe('system');
        });

        it('should persist to localStorage', () => {
            theme = new FondasiTheme({ persist: true });
            theme.set('dark');
            expect(localStorage.getItem('fondasi-theme')).toBe('dark');
        });

        it('should warn on invalid mode', () => {
            const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
            theme = new FondasiTheme();
            theme.set('invalid');
            expect(consoleSpy).toHaveBeenCalled();
            consoleSpy.mockRestore();
        });

        it('should apply CSS variables to root', () => {
            theme = new FondasiTheme();
            theme.set('light');
            const style = document.documentElement.style;
            expect(style.getPropertyValue('--color-bg')).toBeTruthy();
        });
    });

    describe('toggle', () => {
        it('should toggle between light and dark', () => {
            theme = new FondasiTheme({ default: 'light' });
            theme.toggle();
            expect(theme.current).toBe('dark');
            theme.toggle();
            expect(theme.current).toBe('light');
        });

        it('should ignore system when toggling', () => {
            theme = new FondasiTheme({ default: 'system' });
            theme.set('light');
            theme.toggle();
            expect(theme.current).toBe('dark');
            expect(theme.preference).not.toBe('system');
        });
    });

    describe('listeners', () => {
        it('should call on listener on theme change', () => {
            theme = new FondasiTheme();
            const handler = vi.fn();
            theme.on(handler);
            theme.set('dark');
            expect(handler).toHaveBeenCalledWith({
                current: 'dark',
                previous: 'light',
            });
        });

        it('should not call listener when theme unchanged', () => {
            theme = new FondasiTheme({ default: 'light' });
            const handler = vi.fn();
            theme.on(handler);
            theme.set('light');
            expect(handler).not.toHaveBeenCalled();
        });

        it('should return unsubscribe function', () => {
            theme = new FondasiTheme({ default: 'light' });
            const handler = vi.fn();
            const unsubscribe = theme.on(handler);
            unsubscribe();
            theme.set('dark');
            expect(handler).not.toHaveBeenCalled();
        });

        it('should dispatch custom event', () => {
            theme = new FondasiTheme();
            const handler = vi.fn();
            document.addEventListener('fondasi:themechange', (e) => handler(e.detail));
            theme.set('dark');
            expect(handler).toHaveBeenCalledWith({
                current: 'dark',
                previous: 'light',
            });
            document.removeEventListener('fondasi:themechange', handler);
        });
    });

    describe('setTokens', () => {
        it('should override tokens for current theme', () => {
            theme = new FondasiTheme();
            theme.setTokens({ '--color-brand': '#ff0000' });
            const style = document.documentElement.style;
            expect(style.getPropertyValue('--color-brand')).toBe('#ff0000');
        });
    });

    describe('destroy', () => {
        it('should remove data-theme attribute', () => {
            theme = new FondasiTheme();
            theme.set('dark');
            theme.destroy();
            expect(document.documentElement.hasAttribute('data-theme')).toBe(false);
        });

        it('should clear listeners', () => {
            theme = new FondasiTheme();
            const handler = vi.fn();
            theme.on(handler);
            theme.destroy();
            theme.set('dark');
            expect(handler).not.toHaveBeenCalled();
        });
    });

    describe('system preference', () => {
        it('should use system preference when set to system', () => {
            theme = new FondasiTheme({ default: 'system' });
            // Without system matchMedia mock, default is light
            expect(theme.current).toBeDefined();
        });
    });
});

describe('THEMES', () => {
    it('should have light theme', () => {
        expect(THEMES.light).toBeDefined();
        expect(THEMES.light['--color-bg']).toBe('#f5f4f2');
    });

    it('should have dark theme', () => {
        expect(THEMES.dark).toBeDefined();
        expect(THEMES.dark['--color-bg']).toBe('#111110');
    });

    it('should have brand colors for both themes', () => {
        expect(THEMES.light['--color-brand']).toBeDefined();
        expect(THEMES.dark['--color-brand']).toBeDefined();
    });
});

describe('getTheme', () => {
    it('should return singleton instance', () => {
        const instance1 = getTheme({ default: 'light' });
        const instance2 = getTheme();
        expect(instance1).toBe(instance2);
    });
});