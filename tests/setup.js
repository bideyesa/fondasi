import { beforeEach, afterEach, vi } from 'vitest';
import { JSDOM } from 'jsdom';

// Setup JSDOM
const dom = new JSDOM('<!DOCTYPE html><html><body><div id="app"></div></body></html>', {
    url: 'http://localhost',
    pretendToBeVisual: true,
});

global.window = dom.window;
global.document = dom.window.document;
global.navigator = dom.window.navigator;
global.HTMLElement = dom.window.HTMLElement;
global.Element = dom.window.Element;
global.Node = dom.window.Node;
global.Event = dom.window.Event;
global.CustomEvent = dom.window.CustomEvent;
global.MutationObserver = dom.window.MutationObserver;
global.localStorage = dom.window.localStorage;
global.sessionStorage = dom.window.sessionStorage;

// Mock matchMedia with vi.fn()
const mockMatchMedia = vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn((event, handler) => {
        if (event === 'change') {
            // Store the handler for testing
            mockMatchMedia._changeHandler = handler;
        }
    }),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
}));

// Add property to access stored handler
mockMatchMedia._changeHandler = null;
mockMatchMedia.setMatches = (matches) => {
    mockMatchMedia.mock.results[0] = { value: { matches } };
};

global.window.matchMedia = mockMatchMedia;
global.matchMedia = mockMatchMedia;

// Reset DOM before each test
beforeEach(() => {
    document.body.innerHTML = '<div id="app"></div>';
    localStorage.clear();
    sessionStorage.clear();
    vi.clearAllMocks();
    // Reset matchMedia mock
    mockMatchMedia._changeHandler = null;
});

// Cleanup after each test
afterEach(() => {
    vi.restoreAllMocks();
});

// Mock requestAnimationFrame
global.requestAnimationFrame = (cb) => setTimeout(cb, 0);
global.cancelAnimationFrame = (id) => clearTimeout(id);

// Mock setTimeout for animation cleanup
const originalSetTimeout = global.setTimeout;
global.setTimeout = (...args) => originalSetTimeout(...args);