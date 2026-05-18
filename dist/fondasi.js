(function(global, factory) {
	typeof exports === "object" && typeof module !== "undefined" ? factory(exports) : typeof define === "function" && define.amd ? define(["exports"], factory) : (global = typeof globalThis !== "undefined" ? globalThis : global || self, factory(global.Fondasi = {}));
})(this, function(exports) {
	Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
	//#region src/js/core/helpers.js
	/**
	* Query single element
	* @param {string} sel — CSS selector
	* @param {Element|Document} [ctx=document]
	* @returns {Element|null}
	*/
	function $(sel, ctx) {
		return (ctx || document).querySelector(sel);
	}
	/**
	* Query all elements as array
	* @param {string} sel — CSS selector
	* @param {Element|Document} [ctx=document]
	* @returns {Element[]}
	*/
	function $$(sel, ctx) {
		return Array.from((ctx || document).querySelectorAll(sel));
	}
	/**
	* Create DOM element with attributes and children
	* @param {string} tag
	* @param {Object} [attrs]
	* @param {...(string|Element)} [children]
	* @returns {Element}
	*/
	function el(tag, attrs, ...children) {
		const e = document.createElement(tag);
		if (attrs) Object.entries(attrs).forEach(([k, v]) => {
			if (k === "class") e.className = v;
			else if (k === "html") e.innerHTML = v;
			else if (k.startsWith("data-") || k.startsWith("aria-")) e.setAttribute(k, v);
			else e[k] = v;
		});
		children.forEach((c) => {
			if (typeof c === "string") e.insertAdjacentHTML("beforeend", c);
			else if (c instanceof Element) e.appendChild(c);
		});
		return e;
	}
	/**
	* Escape HTML special characters
	* @param {string} str
	* @returns {string}
	*/
	function esc(str) {
		const d = document.createElement("div");
		d.appendChild(document.createTextNode(String(str)));
		return d.innerHTML;
	}
	/**
	* Generate unique ID string
	* @param {string} [prefix='fondasi']
	* @returns {string}
	*/
	function uid(prefix) {
		return (prefix || "fondasi") + "-" + Math.random().toString(36).slice(2, 9);
	}
	/**
	* Attach event listener(s) to one or multiple elements
	* @param {Element|NodeList|Element[]} elem
	* @param {string} evt
	* @param {Function} handler
	* @param {AddEventListenerOptions} [opts]
	* @returns {void}
	*/
	function on(elem, evt, handler, opts) {
		if (!elem) return;
		(elem instanceof NodeList || Array.isArray(elem) ? Array.from(elem) : [elem]).forEach((t) => t.addEventListener(evt, handler, opts));
	}
	/**
	* Dispatch a custom bubbling event
	* @param {Element} elem
	* @param {string} name  — will be prefixed with 'fondasi:'
	* @param {*} [detail={}]
	*/
	function emit(elem, name, detail) {
		elem.dispatchEvent(new CustomEvent("fondasi:" + name, {
			bubbles: true,
			cancelable: true,
			detail: detail || {}
		}));
	}
	/**
	* Trap focus within a container (for modals/drawers)
	* Returns a cleanup function
	* @param {Element} container
	* @returns {Function} cleanup
	*/
	function trapFocus(container) {
		const FOCUSABLE = [
			"a[href]",
			"button:not([disabled])",
			"input:not([disabled])",
			"select:not([disabled])",
			"textarea:not([disabled])",
			"[tabindex]:not([tabindex=\"-1\"])"
		].join(", ");
		function getFocusable() {
			return Array.from(container.querySelectorAll(FOCUSABLE)).filter((el) => !el.closest("[hidden]"));
		}
		function handleKeydown(e) {
			if (e.key !== "Tab") return;
			const focusable = getFocusable();
			if (!focusable.length) {
				e.preventDefault();
				return;
			}
			const first = focusable[0];
			const last = focusable[focusable.length - 1];
			if (e.shiftKey) {
				if (document.activeElement === first) {
					e.preventDefault();
					last.focus();
				}
			} else if (document.activeElement === last) {
				e.preventDefault();
				first.focus();
			}
		}
		container.addEventListener("keydown", handleKeydown);
		const first = getFocusable()[0];
		if (first) first.focus();
		return () => container.removeEventListener("keydown", handleKeydown);
	}
	/**
	* Check if element or its ancestor matches selector
	* @param {Element} elem
	* @param {string} selector
	* @returns {Element|null}
	*/
	function closest(elem, selector) {
		return elem ? elem.closest(selector) : null;
	}
	/**
	* Debounce a function
	* @param {Function} fn
	* @param {number} wait
	* @returns {Function}
	*/
	function debounce(fn, wait) {
		let timer;
		return function(...args) {
			clearTimeout(timer);
			timer = setTimeout(() => fn.apply(this, args), wait);
		};
	}
	//#endregion
	//#region src/js/core/events.js
	/**
	* Global event bus — lightweight pub/sub for cross-component communication.
	*
	* Usage:
	*   bus.on('toast:show', handler)
	*   bus.emit('toast:show', { message: 'Saved!' })
	*   bus.off('toast:show', handler)
	*/
	var EventBus = class {
		constructor() {
			this._map = /* @__PURE__ */ new Map();
		}
		/**
		* Subscribe to a named event.
		* @param {string} event
		* @param {Function} handler
		* @returns {Function} unsubscribe
		*/
		on(event, handler) {
			if (!this._map.has(event)) this._map.set(event, /* @__PURE__ */ new Set());
			this._map.get(event).add(handler);
			return () => this.off(event, handler);
		}
		/**
		* Subscribe once — auto-removed after first fire.
		* @param {string} event
		* @param {Function} handler
		* @returns {Function} unsubscribe
		*/
		once(event, handler) {
			const wrapper = (detail) => {
				handler(detail);
				this.off(event, wrapper);
			};
			return this.on(event, wrapper);
		}
		/**
		* Unsubscribe a handler (or all handlers for an event).
		* @param {string} event
		* @param {Function} [handler]
		*/
		off(event, handler) {
			if (!handler) this._map.delete(event);
			else this._map.get(event)?.delete(handler);
		}
		/**
		* Emit an event to all subscribers.
		* @param {string} event
		* @param {*} [detail]
		*/
		emit(event, detail) {
			this._map.get(event)?.forEach((fn) => {
				try {
					fn(detail);
				} catch (e) {
					console.error("[fondasi-bus]", e);
				}
			});
		}
		/** Remove all subscriptions. */
		clear() {
			this._map.clear();
		}
	};
	var bus = new EventBus();
	/**
	* Attach a delegated event listener on a root element.
	* The handler fires when the event target matches `selector`.
	*
	* @param {Element|Document} root
	* @param {string} event     — e.g. 'click'
	* @param {string} selector  — e.g. '[data-modal-open]'
	* @param {Function} handler — called with (matchedElement, originalEvent)
	* @returns {Function} cleanup
	*/
	function delegate(root, event, selector, handler) {
		function listener(e) {
			const match = e.target.closest(selector);
			if (match && root.contains(match)) handler(match, e);
		}
		root.addEventListener(event, listener);
		return () => root.removeEventListener(event, listener);
	}
	/**
	* Registry of [selector → init function] pairs.
	* Components register themselves here so init() can bootstrap everything.
	*/
	var _registry = [];
	/**
	* Register a component for auto-init.
	* @param {string} selector  — e.g. '[data-tabs]'
	* @param {Function} factory — called with each matched element
	*/
	function register(selector, factory) {
		_registry.push({
			selector,
			factory
		});
	}
	/**
	* Initialise all registered components found inside `root`.
	* Call once on DOMContentLoaded, or again after dynamic DOM insertion.
	*
	* @param {Element|Document} [root=document]
	*/
	function initComponents(root) {
		const ctx = root || document;
		_registry.forEach(({ selector, factory }) => {
			ctx.querySelectorAll(selector).forEach((el) => {
				if (el._fondasiInit) return;
				el._fondasiInit = true;
				try {
					factory(el);
				} catch (e) {
					console.error("[fondasi-init]", selector, e);
				}
			});
		});
	}
	//#endregion
	//#region src/js/theme.js
	var STORAGE_KEY = "fondasi-theme";
	var ATTR = "data-theme";
	var THEMES = {
		light: {
			"--color-bg": "#f5f4f2",
			"--color-surface": "#ffffff",
			"--color-surface-2": "#f8f7f5",
			"--color-surface-3": "#f0eeec",
			"--color-surface-4": "#e8e6e3",
			"--color-border": "#dddbd8",
			"--color-border-strong": "#c4c1bc",
			"--color-border-subtle": "#eae8e5",
			"--color-text": "#1e1c1a",
			"--color-text-2": "#4e4a47",
			"--color-text-3": "#88837b",
			"--color-text-4": "#aaa69f",
			"--color-text-inv": "#ffffff",
			"--color-brand": "#1e3a5f",
			"--color-brand-dark": "#132a4a",
			"--color-brand-darker": "#0a1b32",
			"--color-brand-light": "#e8edf5",
			"--color-brand-mid": "#b3bfd3",
			"--color-brand-text": "#1e3a5f",
			"--color-brand-rgb": "30, 58, 95"
		},
		dark: {
			"--color-bg": "#111110",
			"--color-surface": "#1c1b1a",
			"--color-surface-2": "#242322",
			"--color-surface-3": "#2d2c2a",
			"--color-surface-4": "#363533",
			"--color-border": "#3a3835",
			"--color-border-strong": "#4e4b47",
			"--color-border-subtle": "#2c2b29",
			"--color-text": "#f0eeec",
			"--color-text-2": "#c8c4bf",
			"--color-text-3": "#8a8680",
			"--color-text-4": "#5c5955",
			"--color-text-inv": "#1e1c1a",
			"--color-brand": "#6b91bf",
			"--color-brand-dark": "#8aaed4",
			"--color-brand-darker": "#adc5e3",
			"--color-brand-light": "#1a2535",
			"--color-brand-mid": "#3a4e6a",
			"--color-brand-text": "#a5c0e0",
			"--color-brand-rgb": "107, 145, 191",
			"--color-success": "#2ea65e",
			"--color-success-bg": "#0f2c1c",
			"--color-success-text": "#6cd49a",
			"--color-success-border": "#1e5c38",
			"--color-warning": "#d4920a",
			"--color-warning-bg": "#2c200a",
			"--color-warning-text": "#e8b84d",
			"--color-warning-border": "#6a4a10",
			"--color-danger": "#d45555",
			"--color-danger-bg": "#2c1010",
			"--color-danger-text": "#e88a8a",
			"--color-danger-border": "#6a2020",
			"--color-info": "#4a82cc",
			"--color-info-bg": "#101c2c",
			"--color-info-text": "#7aabe0",
			"--color-info-border": "#1e3d6a"
		}
	};
	function applyTokens(tokens, root) {
		const el = root || document.documentElement;
		Object.entries(tokens).forEach(([prop, val]) => {
			el.style.setProperty(prop, val);
		});
	}
	function clearTokens(tokens, root) {
		const el = root || document.documentElement;
		Object.keys(tokens).forEach((prop) => {
			el.style.removeProperty(prop);
		});
	}
	function getSystemPreference() {
		return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
	}
	var FondasiTheme = class {
		/**
		* @param {Object} [options]
		* @param {'light'|'dark'|'system'} [options.default='system']
		* @param {boolean} [options.persist=true]  — save to localStorage
		* @param {Element} [options.root]           — token target (default: <html>)
		* @param {Record<string,Record<string,string>>} [options.themes] — custom theme overrides
		*/
		constructor(options) {
			const opts = options || {};
			this._defaultMode = opts.default || "system";
			this._persist = opts.persist !== false;
			this._root = opts.root || document.documentElement;
			this._themes = Object.assign({}, THEMES, opts.themes || {});
			this._listeners = [];
			this._mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
			this._onSystemChange = this._onSystemChange.bind(this);
			this._mediaQuery.addEventListener("change", this._onSystemChange);
			this._init();
		}
		/** Current resolved theme ('light' | 'dark') */
		get current() {
			return this._current;
		}
		/** Raw saved preference ('light' | 'dark' | 'system') */
		get preference() {
			return this._preference;
		}
		/**
		* Set theme preference
		* @param {'light'|'dark'|'system'} mode
		*/
		set(mode) {
			if (![
				"light",
				"dark",
				"system"
			].includes(mode)) {
				console.warn("[fondasi-theme] Unknown mode:", mode);
				return;
			}
			this._preference = mode;
			if (this._persist) try {
				localStorage.setItem(STORAGE_KEY, mode);
			} catch (_) {}
			this._apply();
		}
		/** Toggle between light and dark (ignores system) */
		toggle() {
			this.set(this._current === "dark" ? "light" : "dark");
		}
		/** Listen to theme change events */
		on(fn) {
			this._listeners.push(fn);
			return () => this.off(fn);
		}
		/** Remove a listener */
		off(fn) {
			this._listeners = this._listeners.filter((l) => l !== fn);
		}
		/**
		* Override individual CSS tokens at runtime
		* @param {Record<string,string>} tokens — e.g. { '--color-brand': '#e63946' }
		* @param {'light'|'dark'} [themeName]   — omit to apply to both
		*/
		setTokens(tokens, themeName) {
			if (themeName) {
				this._themes[themeName] = Object.assign({}, this._themes[themeName], tokens);
				if (this._current === themeName) applyTokens(tokens, this._root);
			} else applyTokens(tokens, this._root);
		}
		/** Remove the theme manager and clean up listeners */
		destroy() {
			this._mediaQuery.removeEventListener("change", this._onSystemChange);
			this._listeners = [];
			this._root.removeAttribute(ATTR);
			clearTokens({
				...THEMES.light,
				...THEMES.dark
			}, this._root);
		}
		_init() {
			let saved = null;
			if (this._persist) try {
				saved = localStorage.getItem(STORAGE_KEY);
			} catch (_) {}
			this._preference = saved || this._defaultMode;
			this._apply(true);
		}
		_resolve() {
			return this._preference === "system" ? getSystemPreference() : this._preference;
		}
		_apply(silent) {
			const resolved = this._resolve();
			const prev = this._current;
			this._current = resolved;
			this._root.setAttribute(ATTR, resolved);
			const tokens = this._themes[resolved];
			if (tokens) applyTokens(tokens, this._root);
			if (!silent && resolved !== prev) this._emit(resolved, prev);
		}
		_onSystemChange() {
			if (this._preference === "system") this._apply();
		}
		_emit(current, previous) {
			const detail = {
				current,
				previous
			};
			this._listeners.forEach((fn) => fn(detail));
			this._root.dispatchEvent(new CustomEvent("fondasi:themechange", {
				bubbles: true,
				detail
			}));
		}
	};
	var _instance$1 = null;
	/**
	* Get (or create) the global FondasiTheme singleton.
	* @param {Object} [options] — only used on first call
	* @returns {FondasiTheme}
	*/
	function getTheme(options) {
		if (!_instance$1) _instance$1 = new FondasiTheme(options);
		return _instance$1;
	}
	//#endregion
	//#region src/js/components/toast.js
	var ICONS = {
		success: `<svg viewBox="0 0 20 20" fill="currentColor" width="18" height="18"><path fill-rule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16zm3.707-9.293a1 1 0 0 0-1.414-1.414L9 10.586 7.707 9.293a1 1 0 0 0-1.414 1.414l2 2a1 1 0 0 0 1.414 0l4-4z" clip-rule="evenodd"/></svg>`,
		warning: `<svg viewBox="0 0 20 20" fill="currentColor" width="18" height="18"><path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 1 1-2 0 1 1 0 0 1 2 0zm-1-8a1 1 0 0 0-1 1v3a1 1 0 0 0 2 0V6a1 1 0 0 0-1-1z" clip-rule="evenodd"/></svg>`,
		danger: `<svg viewBox="0 0 20 20" fill="currentColor" width="18" height="18"><path fill-rule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM8.707 7.293a1 1 0 0 0-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 1 0 1.414 1.414L10 11.414l1.293 1.293a1 1 0 0 0 1.414-1.414L11.414 10l1.293-1.293a1 1 0 0 0-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"/></svg>`,
		info: `<svg viewBox="0 0 20 20" fill="currentColor" width="18" height="18"><path fill-rule="evenodd" d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0zm-7-4a1 1 0 1 1-2 0 1 1 0 0 1 2 0zM9 9a1 1 0 0 0 0 2v3a1 1 0 0 0 1 1h1a1 1 0 1 0 0-2v-3a1 1 0 0 0-1-1H9z" clip-rule="evenodd"/></svg>`
	};
	var CLOSE_SVG = `<svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16"><path fill-rule="evenodd" d="M4.293 4.293a1 1 0 0 1 1.414 0L10 8.586l4.293-4.293a1 1 0 1 1 1.414 1.414L11.414 10l4.293 4.293a1 1 0 0 1-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 0 1-1.414-1.414L8.586 10 4.293 5.707a1 1 0 0 1 0-1.414z" clip-rule="evenodd"/></svg>`;
	var DEFAULTS = {
		position: "top-right",
		duration: 4e3,
		closable: true,
		progress: true,
		max: 5
	};
	var ToastManager = class {
		/**
		* @param {typeof DEFAULTS} [options]
		*/
		constructor(options) {
			this._opts = Object.assign({}, DEFAULTS, options);
			this._containers = {};
			this._queue = [];
			bus.on("toast:show", (opts) => this.show(opts));
			bus.on("toast:clear", () => this.clear());
		}
		/**
		* Show a toast notification.
		* @param {Object|string} options  — string shorthand = { message }
		* @param {'success'|'warning'|'danger'|'info'} [options.type='info']
		* @param {string} [options.title]
		* @param {string} options.message
		* @param {number} [options.duration]
		* @param {boolean} [options.closable]
		* @param {boolean} [options.progress]
		* @param {string}  [options.position]
		* @param {Array<{label:string, action:Function}>} [options.actions]
		* @returns {string} toast id
		*/
		show(options) {
			const opts = typeof options === "string" ? { message: options } : { ...options };
			opts.type = opts.type || "info";
			opts.duration = opts.duration ?? this._opts.duration;
			opts.closable = opts.closable ?? this._opts.closable;
			opts.progress = opts.progress ?? this._opts.progress;
			opts.position = opts.position || this._opts.position;
			opts.id = opts.id || uid("toast");
			const container = this._getContainer(opts.position);
			const toastEl = this._build(opts);
			const existing = container.querySelectorAll(".toast");
			if (existing.length >= this._opts.max) this._hide(existing[0]);
			container.appendChild(toastEl);
			requestAnimationFrame(() => toastEl.style.opacity = "1");
			if (opts.duration > 0) opts._timer = setTimeout(() => this._hide(toastEl), opts.duration);
			return opts.id;
		}
		/** Convenience shortcuts */
		success(message, opts) {
			return this.show({
				...opts,
				type: "success",
				message
			});
		}
		warning(message, opts) {
			return this.show({
				...opts,
				type: "warning",
				message
			});
		}
		danger(message, opts) {
			return this.show({
				...opts,
				type: "danger",
				message
			});
		}
		info(message, opts) {
			return this.show({
				...opts,
				type: "info",
				message
			});
		}
		/**
		* Hide a specific toast by id.
		* @param {string} id
		*/
		dismiss(id) {
			const el = document.getElementById(id);
			if (el) this._hide(el);
		}
		/** Remove all toasts. */
		clear() {
			Object.values(this._containers).forEach((container) => {
				container.querySelectorAll(".toast").forEach((t) => this._hide(t));
			});
		}
		_getContainer(position) {
			if (this._containers[position]) return this._containers[position];
			const c = el("div", { class: `toast-container ${position}` });
			document.body.appendChild(c);
			this._containers[position] = c;
			return c;
		}
		_build(opts) {
			const toast = el("div", {
				class: `toast toast-${opts.type}`,
				id: opts.id,
				role: "alert",
				"aria-live": opts.type === "danger" ? "assertive" : "polite"
			});
			if (ICONS[opts.type]) toast.appendChild(el("span", {
				class: "toast-icon",
				html: ICONS[opts.type]
			}));
			const content = el("div", { class: "toast-content" });
			if (opts.title) content.appendChild(el("div", {
				class: "toast-title",
				textContent: opts.title
			}));
			content.appendChild(el("div", {
				class: "toast-message",
				textContent: opts.message
			}));
			if (opts.actions?.length) {
				const actions = el("div", { class: "toast-actions" });
				opts.actions.forEach(({ label, action }) => {
					const btn = el("button", {
						class: "toast-action",
						textContent: label,
						type: "button"
					});
					btn.addEventListener("click", () => {
						action?.();
						this._hide(toast);
					});
					actions.appendChild(btn);
				});
				content.appendChild(actions);
			}
			toast.appendChild(content);
			if (opts.closable) {
				const closeBtn = el("button", {
					class: "toast-close",
					"aria-label": "Close",
					html: CLOSE_SVG,
					type: "button"
				});
				closeBtn.addEventListener("click", () => this._hide(toast));
				toast.appendChild(closeBtn);
			}
			if (opts.progress && opts.duration > 0) {
				const bar = el("div", { class: "toast-progress" });
				bar.style.animationDuration = `${opts.duration}ms`;
				toast.appendChild(bar);
			}
			toast.style.opacity = "0";
			return toast;
		}
		_hide(toastEl) {
			if (!toastEl || toastEl.classList.contains("toast-exit")) return;
			toastEl.classList.add("toast-exit");
			toastEl.addEventListener("animationend", () => toastEl.remove(), { once: true });
			setTimeout(() => toastEl.remove(), 500);
		}
	};
	var _instance = null;
	/**
	* Get (or create) the global toast manager.
	* @param {Object} [options]
	* @returns {ToastManager}
	*/
	function getToast(options) {
		if (!_instance) _instance = new ToastManager(options);
		return _instance;
	}
	//#endregion
	//#region src/js/components/modal.js
	var ATTR_OPEN$1 = "data-modal-open";
	var ATTR_CLOSE$1 = "data-modal-close";
	var KEY_ESC$2 = "Escape";
	var Modal = class {
		/**
		* @param {Element} overlay — .modal-overlay element
		* @param {Object}  [options]
		* @param {boolean} [options.closeOnOverlay=true]
		* @param {boolean} [options.closeOnEsc=true]
		* @param {Function} [options.onOpen]
		* @param {Function} [options.onClose]
		*/
		constructor(overlay, options) {
			const opts = options || {};
			this._overlay = overlay;
			this._modal = overlay.querySelector(".modal");
			this._closeOnOverlay = opts.closeOnOverlay !== false;
			this._closeOnEsc = opts.closeOnEsc !== false;
			this._onOpen = opts.onOpen || null;
			this._onClose = opts.onClose || null;
			this._releaseFocus = null;
			this._previousFocus = null;
			this._isOpen = false;
			this._id = overlay.id || uid("modal");
			overlay.id = this._id;
			this._bindEvents();
		}
		get isOpen() {
			return this._isOpen;
		}
		get id() {
			return this._id;
		}
		get element() {
			return this._overlay;
		}
		open() {
			if (this._isOpen) return;
			this._isOpen = true;
			this._previousFocus = document.activeElement;
			this._overlay.removeAttribute("hidden");
			this._overlay.setAttribute("aria-hidden", "false");
			this._overlay.classList.add("modal-overlay-open");
			document.body.classList.add("modal-open");
			document.addEventListener("keydown", this._onKeydown);
			requestAnimationFrame(() => {
				this._releaseFocus = trapFocus(this._modal);
			});
			emit(this._overlay, "modal:open", { modal: this });
			this._onOpen?.({ modal: this });
		}
		close() {
			if (!this._isOpen) return;
			this._isOpen = false;
			this._overlay.setAttribute("hidden", "");
			this._overlay.setAttribute("aria-hidden", "true");
			this._overlay.classList.remove("modal-overlay-open");
			document.body.classList.remove("modal-open");
			document.removeEventListener("keydown", this._onKeydown);
			this._releaseFocus?.();
			this._releaseFocus = null;
			this._previousFocus?.focus?.();
			emit(this._overlay, "modal:close", { modal: this });
			this._onClose?.({ modal: this });
		}
		toggle() {
			this._isOpen ? this.close() : this.open();
		}
		destroy() {
			document.removeEventListener("keydown", this._onKeydown);
			this._overlay.removeEventListener("click", this._onOverlayClick);
			this._overlay.querySelectorAll(`[${ATTR_CLOSE$1}]`).forEach((btn) => {
				btn.removeEventListener("click", this._onClose);
			});
		}
		_bindEvents() {
			this._onKeydown = this._handleKeydown.bind(this);
			this._onOverlayClick = this._handleOverlayClick.bind(this);
			this._overlay.addEventListener("click", this._onOverlayClick);
			this._overlay.querySelectorAll(`[${ATTR_CLOSE$1}]`).forEach((btn) => {
				btn.addEventListener("click", () => this.close());
			});
		}
		_handleKeydown(e) {
			if (this._closeOnEsc && e.key === KEY_ESC$2) {
				e.preventDefault();
				this.close();
			}
		}
		_handleOverlayClick(e) {
			if (this._closeOnOverlay && e.target === this._overlay) this.close();
		}
	};
	var _modals = /* @__PURE__ */ new Map();
	/**
	* Get or create a Modal instance for an overlay element or id.
	* @param {string|Element} target
	* @param {Object} [options]
	* @returns {Modal|null}
	*/
	function getModal(target, options) {
		const el = typeof target === "string" ? document.getElementById(target) || $(target) : target;
		if (!el) return null;
		if (_modals.has(el)) return _modals.get(el);
		const instance = new Modal(el, options);
		_modals.set(el, instance);
		return instance;
	}
	document.addEventListener("click", (e) => {
		const trigger = e.target.closest(`[${ATTR_OPEN$1}]`);
		if (!trigger) return;
		getModal(trigger.getAttribute(ATTR_OPEN$1))?.open();
	});
	document.addEventListener("click", (e) => {
		const trigger = e.target.closest(`[${ATTR_CLOSE$1}]`);
		if (!trigger) return;
		const overlay = trigger.closest(".modal-overlay");
		if (overlay) getModal(overlay)?.close();
	});
	register(".modal-overlay", (el) => getModal(el));
	/**
	* Programmatically open a simple dialog (confirm/alert).
	* Returns a Promise that resolves to true (confirm) or false (cancel).
	*
	* @param {Object} options
	* @param {'danger'|'warning'|'success'|'info'} [options.type='info']
	* @param {string} options.title
	* @param {string} options.message
	* @param {string} [options.confirmLabel='Confirm']
	* @param {string} [options.cancelLabel='Cancel']
	* @param {boolean} [options.showCancel=true]
	* @returns {Promise<boolean>}
	*/
	function dialog(options) {
		return new Promise((resolve) => {
			const id = uid("dialog");
			const type = options.type || "info";
			const ICONS = {
				danger: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="24" height="24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>`,
				warning: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="24" height="24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>`,
				success: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="24" height="24"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 1 1-18 0 9 9 0 0 1 18 0z"/></svg>`,
				info: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="24" height="24"><path stroke-linecap="round" stroke-linejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z"/></svg>`
			};
			const showCancel = options.showCancel !== false;
			const confirmLabel = options.confirmLabel || "Confirm";
			const cancelLabel = options.cancelLabel || "Cancel";
			const html = `
<div class="modal-overlay" id="${id}" aria-modal="true" role="dialog" aria-labelledby="${id}-title" hidden>
  <div class="modal dialog modal-sm">
    <div class="modal-body">
      <div class="dialog-icon ${type}">${ICONS[type] || ""}</div>
      <div class="dialog-title" id="${id}-title">${options.title || ""}</div>
      <div class="dialog-message">${options.message || ""}</div>
    </div>
    <div class="modal-footer">
      ${showCancel ? `<button class="btn btn-ghost" data-action="cancel" type="button">${cancelLabel}</button>` : ""}
      <button class="btn btn-${type === "info" ? "primary" : type}" data-action="confirm" type="button">${confirmLabel}</button>
    </div>
  </div>
</div>`;
			document.body.insertAdjacentHTML("beforeend", html);
			const overlay = document.getElementById(id);
			const modal = getModal(overlay, { closeOnOverlay: false });
			overlay.addEventListener("click", (e) => {
				const action = e.target.closest("[data-action]")?.dataset.action;
				if (action === "confirm") {
					modal.close();
					resolve(true);
					overlay.remove();
				}
				if (action === "cancel") {
					modal.close();
					resolve(false);
					overlay.remove();
				}
			});
			modal.open();
		});
	}
	//#endregion
	//#region src/js/components/drawer.js
	var ATTR_OPEN = "data-drawer-open";
	var ATTR_CLOSE = "data-drawer-close";
	var KEY_ESC$1 = "Escape";
	var Drawer = class {
		/**
		* @param {Element} element — .drawer element (not the overlay)
		* @param {Object}  [options]
		* @param {boolean} [options.closeOnOverlay=true]
		* @param {boolean} [options.closeOnEsc=true]
		* @param {Function} [options.onOpen]
		* @param {Function} [options.onClose]
		*/
		constructor(element, options) {
			const opts = options || {};
			this._el = element;
			this._closeOnOverlay = opts.closeOnOverlay !== false;
			this._closeOnEsc = opts.closeOnEsc !== false;
			this._onOpen = opts.onOpen || null;
			this._onClose = opts.onClose || null;
			this._releaseFocus = null;
			this._previousFocus = null;
			this._isOpen = false;
			this._overlay = null;
			this._id = element.id || uid("drawer");
			element.id = this._id;
			this._placement = [
				"drawer-start",
				"drawer-end",
				"drawer-top",
				"drawer-bottom"
			].find((c) => element.classList.contains(c))?.replace("drawer-", "") || "right";
			this._bindInternalClose();
		}
		get isOpen() {
			return this._isOpen;
		}
		get id() {
			return this._id;
		}
		get element() {
			return this._el;
		}
		open() {
			if (this._isOpen) return;
			this._isOpen = true;
			this._previousFocus = document.activeElement;
			this._overlay = document.createElement("div");
			this._overlay.className = "drawer-overlay";
			this._overlay.setAttribute("aria-hidden", "true");
			document.body.appendChild(this._overlay);
			if (this._closeOnOverlay) this._overlay.addEventListener("click", () => this.close(), { once: true });
			this._el.removeAttribute("hidden");
			this._el.setAttribute("aria-hidden", "false");
			document.body.classList.add("drawer-open");
			document.addEventListener("keydown", this._onKeydown = this._handleKeydown.bind(this));
			requestAnimationFrame(() => {
				this._el.classList.add("is-open");
				this._overlay.classList.add("drawer-overlay-open");
				this._releaseFocus = trapFocus(this._el);
			});
			emit(this._el, "drawer:open", { drawer: this });
			this._onOpen?.({ drawer: this });
		}
		close() {
			if (!this._isOpen) return;
			this._isOpen = false;
			this._el.classList.remove("is-open");
			this._overlay?.classList.remove("drawer-overlay-open");
			const cleanup = () => {
				this._el.setAttribute("hidden", "");
				this._el.setAttribute("aria-hidden", "true");
				this._overlay?.remove();
				this._overlay = null;
			};
			this._el.addEventListener("transitionend", cleanup, { once: true });
			setTimeout(cleanup, 400);
			document.body.classList.remove("drawer-open");
			document.removeEventListener("keydown", this._onKeydown);
			this._releaseFocus?.();
			this._releaseFocus = null;
			this._previousFocus?.focus?.();
			emit(this._el, "drawer:close", { drawer: this });
			this._onClose?.({ drawer: this });
		}
		toggle() {
			this._isOpen ? this.close() : this.open();
		}
		destroy() {
			document.removeEventListener("keydown", this._onKeydown);
			this._overlay?.remove();
		}
		_bindInternalClose() {
			this._el.querySelectorAll(`[${ATTR_CLOSE}]`).forEach((btn) => {
				btn.addEventListener("click", () => this.close());
			});
		}
		_handleKeydown(e) {
			if (this._closeOnEsc && e.key === KEY_ESC$1) {
				e.preventDefault();
				this.close();
			}
		}
	};
	var _drawers = /* @__PURE__ */ new Map();
	/**
	* Get or create a Drawer instance.
	* @param {string|Element} target
	* @param {Object} [options]
	* @returns {Drawer|null}
	*/
	function getDrawer(target, options) {
		const el = typeof target === "string" ? document.getElementById(target) || $(target) : target;
		if (!el) return null;
		if (_drawers.has(el)) return _drawers.get(el);
		const instance = new Drawer(el, options);
		_drawers.set(el, instance);
		return instance;
	}
	document.addEventListener("click", (e) => {
		const trigger = e.target.closest(`[${ATTR_OPEN}]`);
		if (!trigger) return;
		getDrawer(trigger.getAttribute(ATTR_OPEN))?.open();
	});
	document.addEventListener("click", (e) => {
		const trigger = e.target.closest(`[${ATTR_CLOSE}]`);
		if (!trigger) return;
		const drawer = trigger.closest(".drawer");
		if (drawer) getDrawer(drawer)?.close();
	});
	register(".drawer", (el) => getDrawer(el));
	//#endregion
	//#region src/js/components/tabs.js
	var Tabs = class {
		/**
		* @param {Element} container — element containing .tabs and .tab-panel elements
		* @param {Object}  [options]
		* @param {Function} [options.onChange]
		* @param {boolean}  [options.hash=false]   — update URL hash on change
		*/
		constructor(container, options) {
			const opts = options || {};
			this._container = container;
			this._onChange = opts.onChange || null;
			this._hash = opts.hash || false;
			this._tabs = $$(".tab, .tabs-trigger", container);
			this._panels = $$(".tab-panel, .tabs-content", container);
			if (!this._tabs.length) return;
			this._bindEvents();
			const active = this._tabs.find((t) => t.classList.contains("active")) || this._hash && this._tabForHash() || this._tabs[0];
			if (active) this._activate(active, true);
		}
		/**
		* Activate a tab by index or value.
		* @param {number|string} indexOrValue
		*/
		select(indexOrValue) {
			let tab;
			if (typeof indexOrValue === "number") tab = this._tabs[indexOrValue];
			else tab = this._tabs.find((t) => t.dataset.tab === indexOrValue || t.textContent.trim() === indexOrValue);
			if (tab) this._activate(tab);
		}
		/** Index of the currently active tab. */
		get activeIndex() {
			return this._tabs.findIndex((t) => t.classList.contains("active"));
		}
		_bindEvents() {
			this._tabs.forEach((tab) => {
				tab.addEventListener("click", (e) => {
					if (tab.disabled || tab.getAttribute("aria-disabled") === "true") return;
					e.preventDefault();
					this._activate(tab);
				});
				tab.addEventListener("keydown", (e) => {
					let idx = this._tabs.indexOf(tab);
					if (e.key === "ArrowRight") {
						e.preventDefault();
						this._focusTab(idx + 1);
					}
					if (e.key === "ArrowLeft") {
						e.preventDefault();
						this._focusTab(idx - 1);
					}
					if (e.key === "Home") {
						e.preventDefault();
						this._focusTab(0);
					}
					if (e.key === "End") {
						e.preventDefault();
						this._focusTab(this._tabs.length - 1);
					}
				});
			});
		}
		_focusTab(idx) {
			const clamped = Math.max(0, Math.min(idx, this._tabs.length - 1));
			this._tabs[clamped]?.focus();
		}
		_activate(tab, silent) {
			const prev = this._tabs.find((t) => t.classList.contains("active"));
			this._tabs.forEach((t) => {
				t.classList.remove("active", "tab-active", "tabs-trigger-active");
				t.setAttribute("aria-selected", "false");
				t.setAttribute("tabindex", "-1");
			});
			this._panels.forEach((p) => p.classList.remove("active"));
			tab.classList.add("active", "tab-active", "tabs-trigger-active");
			tab.setAttribute("aria-selected", "true");
			tab.setAttribute("tabindex", "0");
			const panelId = tab.dataset.tab || tab.getAttribute("aria-controls");
			const panel = panelId ? this._panels.find((p) => p.id === panelId || p.dataset.tab === panelId) : this._panels[this._tabs.indexOf(tab)];
			if (panel) panel.classList.add("active");
			if (this._hash && panelId) history.replaceState(null, "", `#${panelId}`);
			if (!silent) {
				emit(tab, "tabs:change", {
					tab,
					panel,
					previous: prev
				});
				this._onChange?.({
					tab,
					panel,
					previous: prev
				});
			}
		}
		_tabForHash() {
			const hash = location.hash.slice(1);
			if (!hash) return null;
			return this._tabs.find((t) => t.dataset.tab === hash || t.getAttribute("aria-controls") === hash);
		}
	};
	register("[data-tabs]", (el) => new Tabs(el));
	register(".tabs-container", (el) => new Tabs(el));
	register(".tabs", (el) => new Tabs(el));
	//#endregion
	//#region src/js/components/accordion.js
	var Accordion = class {
		/**
		* @param {Element} container — .accordion element
		* @param {Object}  [options]
		* @param {boolean} [options.multiple=false]  — allow multiple items open at once
		* @param {boolean} [options.collapsible=true] — allow closing the only open item
		* @param {Function} [options.onChange]
		*/
		constructor(container, options) {
			const opts = options || {};
			this._container = container;
			this._multiple = opts.multiple || container.hasAttribute("data-multiple") || false;
			this._collapsible = opts.collapsible !== false;
			this._onChange = opts.onChange || null;
			this._items = $$(".accordion-item", container);
			if (!this._items.length) return;
			this._items.forEach((item) => this._initItem(item));
		}
		/**
		* Open an accordion item by index or element.
		* @param {number|Element} target
		*/
		open(target) {
			const item = this._resolveItem(target);
			if (item) this._openItem(item);
		}
		/**
		* Close an accordion item by index or element.
		* @param {number|Element} target
		*/
		close(target) {
			const item = this._resolveItem(target);
			if (item) this._closeItem(item);
		}
		/**
		* Toggle an accordion item by index or element.
		* @param {number|Element} target
		*/
		toggle(target) {
			const item = this._resolveItem(target);
			if (!item) return;
			item.classList.contains("is-open") ? this._closeItem(item) : this._openItem(item);
		}
		/** Open all items (only useful in multiple mode). */
		openAll() {
			this._items.forEach((item) => this._openItem(item, true));
		}
		/** Close all items. */
		closeAll() {
			this._items.forEach((item) => this._closeItem(item, true));
		}
		_initItem(item) {
			const trigger = item.querySelector(".accordion-trigger, .accordion-header");
			const body = item.querySelector(".accordion-body, .accordion-content");
			if (!trigger || !body) return;
			const itemId = item.id || uid("accordion-item");
			item.id = itemId;
			const bodyId = body.id || `${itemId}-body`;
			body.id = bodyId;
			trigger.setAttribute("aria-expanded", item.classList.contains("is-open") ? "true" : "false");
			trigger.setAttribute("aria-controls", bodyId);
			body.setAttribute("role", "region");
			body.setAttribute("aria-labelledby", trigger.id || (trigger.id = `${itemId}-trigger`));
			if (!item.classList.contains("is-open")) {
				body.style.height = "0px";
				body.style.overflow = "hidden";
			}
			trigger.addEventListener("click", (e) => {
				e.preventDefault();
				this.toggle(item);
			});
			trigger.addEventListener("keydown", (e) => {
				const idx = this._items.indexOf(item);
				if (e.key === "ArrowDown") {
					e.preventDefault();
					this._focusTrigger(idx + 1);
				}
				if (e.key === "ArrowUp") {
					e.preventDefault();
					this._focusTrigger(idx - 1);
				}
				if (e.key === "Home") {
					e.preventDefault();
					this._focusTrigger(0);
				}
				if (e.key === "End") {
					e.preventDefault();
					this._focusTrigger(this._items.length - 1);
				}
			});
		}
		_openItem(item, silent) {
			if (item.classList.contains("is-open")) return;
			if (!this._multiple) this._items.forEach((i) => {
				if (i !== item && i.classList.contains("is-open")) this._closeItem(i, true);
			});
			const trigger = item.querySelector(".accordion-trigger, .accordion-header");
			const body = item.querySelector(".accordion-body, .accordion-content");
			if (!trigger || !body) return;
			item.classList.add("is-open");
			trigger.setAttribute("aria-expanded", "true");
			body.style.overflow = "hidden";
			body.style.height = "0px";
			const fullHeight = body.scrollHeight;
			requestAnimationFrame(() => {
				body.style.height = `${fullHeight}px`;
			});
			body.addEventListener("transitionend", () => {
				if (item.classList.contains("is-open")) {
					body.style.height = "auto";
					body.style.overflow = "";
				}
			}, { once: true });
			if (!silent) {
				emit(item, "accordion:open", {
					item,
					accordion: this
				});
				this._onChange?.({
					item,
					open: true,
					accordion: this
				});
			}
		}
		_closeItem(item, silent) {
			if (!item.classList.contains("is-open")) return;
			if (!this._collapsible) {
				if (this._items.filter((i) => i.classList.contains("is-open")).length === 1) return;
			}
			const trigger = item.querySelector(".accordion-trigger, .accordion-header");
			const body = item.querySelector(".accordion-body, .accordion-content");
			if (!trigger || !body) return;
			body.style.height = `${body.scrollHeight}px`;
			body.style.overflow = "hidden";
			requestAnimationFrame(() => {
				body.style.height = "0px";
			});
			item.classList.remove("is-open");
			trigger.setAttribute("aria-expanded", "false");
			if (!silent) {
				emit(item, "accordion:close", {
					item,
					accordion: this
				});
				this._onChange?.({
					item,
					open: false,
					accordion: this
				});
			}
		}
		_resolveItem(target) {
			if (target instanceof Element) return target;
			if (typeof target === "number") return this._items[target] || null;
			return null;
		}
		_focusTrigger(idx) {
			const clamped = Math.max(0, Math.min(idx, this._items.length - 1));
			(this._items[clamped]?.querySelector(".accordion-trigger"))?.focus();
		}
	};
	register(".accordion", (el) => new Accordion(el));
	//#endregion
	//#region src/js/components/dropdown.js
	var KEY_ESC = "Escape";
	/** Currently open dropdown (singleton — only one open at a time by default). */
	var _active = null;
	var Dropdown = class {
		/**
		* @param {Element} container — .dropdown element
		* @param {Object}  [options]
		* @param {boolean} [options.closeOnSelect=true]
		* @param {boolean} [options.closeOnOutside=true]
		* @param {string}  [options.placement='bottom-start']  — bottom-start | bottom-end | top-start | top-end
		* @param {Function} [options.onOpen]
		* @param {Function} [options.onClose]
		* @param {Function} [options.onSelect]
		*/
		constructor(container, options) {
			const opts = options || {};
			this._container = container;
			this._closeOnSelect = opts.closeOnSelect !== false;
			this._closeOnOutside = opts.closeOnOutside !== false;
			this._placement = opts.placement || container.dataset.placement || "bottom-start";
			this._onOpen = opts.onOpen || null;
			this._onClose = opts.onClose || null;
			this._onSelect = opts.onSelect || null;
			this._isOpen = false;
			this._id = container.id || uid("dropdown");
			container.id = this._id;
			this._toggle = container.querySelector("[data-dropdown-toggle], .dropdown-toggle");
			this._menu = container.querySelector(".dropdown-menu");
			if (!this._toggle || !this._menu) return;
			const menuId = this._menu.id || `${this._id}-menu`;
			this._menu.id = menuId;
			this._toggle.setAttribute("aria-haspopup", "true");
			this._toggle.setAttribute("aria-expanded", "false");
			this._toggle.setAttribute("aria-controls", menuId);
			this._bindEvents();
		}
		get isOpen() {
			return this._isOpen;
		}
		get element() {
			return this._container;
		}
		open() {
			if (this._isOpen) return;
			if (_active && _active !== this) _active.close();
			_active = this;
			this._isOpen = true;
			this._container.classList.add("dropdown-open", "is-open");
			this._menu.removeAttribute("hidden");
			this._toggle.setAttribute("aria-expanded", "true");
			this._position();
			requestAnimationFrame(() => {
				this._getFocusableItems()[0]?.focus();
			});
			emit(this._container, "dropdown:open", { dropdown: this });
			this._onOpen?.({ dropdown: this });
		}
		close() {
			if (!this._isOpen) return;
			this._isOpen = false;
			if (_active === this) _active = null;
			this._container.classList.remove("dropdown-open", "is-open");
			this._menu.setAttribute("hidden", "");
			this._toggle.setAttribute("aria-expanded", "false");
			this._toggle.focus();
			emit(this._container, "dropdown:close", { dropdown: this });
			this._onClose?.({ dropdown: this });
		}
		toggle() {
			this._isOpen ? this.close() : this.open();
		}
		destroy() {
			document.removeEventListener("click", this._onDocClick);
			document.removeEventListener("keydown", this._onDocKeydown);
		}
		_bindEvents() {
			this._toggle.addEventListener("click", (e) => {
				e.stopPropagation();
				this.toggle();
			});
			this._toggle.addEventListener("keydown", (e) => {
				if (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") {
					e.preventDefault();
					if (!this._isOpen) this.open();
					else this._getFocusableItems()[0]?.focus();
				}
				if (e.key === "ArrowUp") {
					e.preventDefault();
					if (!this._isOpen) this.open();
					else {
						const items = this._getFocusableItems();
						items[items.length - 1]?.focus();
					}
				}
			});
			this._menu.addEventListener("keydown", (e) => {
				const items = this._getFocusableItems();
				const idx = items.indexOf(document.activeElement);
				if (e.key === "ArrowDown") {
					e.preventDefault();
					items[Math.min(idx + 1, items.length - 1)]?.focus();
				}
				if (e.key === "ArrowUp") {
					e.preventDefault();
					items[Math.max(idx - 1, 0)]?.focus();
				}
				if (e.key === "Home") {
					e.preventDefault();
					items[0]?.focus();
				}
				if (e.key === "End") {
					e.preventDefault();
					items[items.length - 1]?.focus();
				}
				if (e.key === KEY_ESC) {
					e.preventDefault();
					this.close();
				}
				if (e.key === "Tab") this.close();
			});
			this._menu.addEventListener("click", (e) => {
				const item = e.target.closest(".dropdown-item, [data-dropdown-item]");
				if (!item || item.classList.contains("disabled") || item.hasAttribute("disabled")) return;
				const value = item.dataset.value ?? item.textContent.trim();
				emit(this._container, "dropdown:select", {
					item,
					value,
					dropdown: this
				});
				this._onSelect?.({
					item,
					value,
					dropdown: this
				});
				if (this._closeOnSelect) this.close();
			});
			this._onDocClick = (e) => {
				if (this._isOpen && this._closeOnOutside && !this._container.contains(e.target)) this.close();
			};
			document.addEventListener("click", this._onDocClick);
		}
		_getFocusableItems() {
			return $$(".dropdown-item:not(.disabled):not([disabled]), [data-dropdown-item]:not(.disabled)", this._menu).filter((el) => !el.hasAttribute("hidden"));
		}
		_position() {
			const toggleRect = this._toggle.getBoundingClientRect();
			const menuStyle = this._menu.style;
			menuStyle.top = menuStyle.bottom = menuStyle.left = menuStyle.right = "";
			const [vPos, hPos] = this._placement.split("-");
			const menuHeight = this._menu.offsetHeight || 200;
			this._menu.offsetWidth;
			const spaceBelow = window.innerHeight - toggleRect.bottom;
			const spaceAbove = toggleRect.top;
			if ((vPos === "bottom" && spaceBelow < menuHeight && spaceAbove > menuHeight ? "top" : vPos) === "top") {
				menuStyle.bottom = `${this._container.offsetHeight}px`;
				menuStyle.top = "auto";
			} else {
				menuStyle.top = `${this._container.offsetHeight}px`;
				menuStyle.bottom = "auto";
			}
			if (hPos === "end") {
				menuStyle.right = "0";
				menuStyle.left = "auto";
			} else {
				menuStyle.left = "0";
				menuStyle.right = "auto";
			}
		}
	};
	var _dropdowns = /* @__PURE__ */ new Map();
	/**
	* Get or create a Dropdown instance.
	* @param {string|Element} target
	* @param {Object} [options]
	* @returns {Dropdown|null}
	*/
	function getDropdown(target, options) {
		const el = typeof target === "string" ? document.getElementById(target) || document.querySelector(target) : target;
		if (!el) return null;
		if (_dropdowns.has(el)) return _dropdowns.get(el);
		const instance = new Dropdown(el, options);
		_dropdowns.set(el, instance);
		return instance;
	}
	document.addEventListener("click", (e) => {
		if (_active && !_active.element.contains(e.target)) _active.close();
	});
	register(".dropdown", (el) => getDropdown(el));
	//#endregion
	//#region src/js/components/sidebar.js
	var ATTR_TOGGLE = "data-sidebar-toggle";
	var ATTR_COLLAPSE = "data-sidebar-collapse";
	var ATTR_EXPAND = "data-sidebar-expand";
	var LS_KEY = "fondasi-sidebar-collapsed";
	var Sidebar = class {
		/**
		* @param {Element} element — .sidebar element
		* @param {Object}  [options]
		* @param {boolean} [options.collapsed=false]       — start collapsed
		* @param {boolean} [options.persist=true]          — save collapsed state to localStorage
		* @param {boolean} [options.trackActive=true]      — auto-mark active link from location
		* @param {string}  [options.activeAttr='href']     — attribute to match against location
		* @param {Function} [options.onCollapse]
		* @param {Function} [options.onExpand]
		* @param {Function} [options.onChange]
		*/
		constructor(element, options) {
			const opts = options || {};
			this._el = element;
			this._persist = opts.persist !== false;
			this._trackActive = opts.trackActive !== false;
			this._onCollapse = opts.onCollapse || null;
			this._onExpand = opts.onExpand || null;
			this._onChange = opts.onChange || null;
			this._isCollapsed = false;
			this._id = element.id || uid("sidebar");
			element.id = this._id;
			const persisted = this._persist ? localStorage.getItem(`${LS_KEY}:${this._id}`) : null;
			if (persisted !== null ? persisted === "true" : opts.collapsed || element.classList.contains("collapsed") || false) {
				this._isCollapsed = true;
				element.classList.add("collapsed", "sidebar-collapsed");
			}
			if (this._trackActive) this._markActiveLinks();
			this._bindEvents();
			this._updateTogglerAria();
		}
		get isCollapsed() {
			return this._isCollapsed;
		}
		get element() {
			return this._el;
		}
		get id() {
			return this._id;
		}
		/**
		* Collapse the sidebar.
		* @param {boolean} [silent=false] — suppress events
		*/
		collapse(silent) {
			if (this._isCollapsed) return;
			this._isCollapsed = true;
			this._el.classList.add("collapsed", "sidebar-collapsed");
			this._updateTogglerAria();
			this._persist && localStorage.setItem(`${LS_KEY}:${this._id}`, "true");
			if (!silent) {
				emit(this._el, "sidebar:collapse", { sidebar: this });
				this._onCollapse?.({ sidebar: this });
				this._onChange?.({
					collapsed: true,
					sidebar: this
				});
			}
		}
		/**
		* Expand the sidebar.
		* @param {boolean} [silent=false] — suppress events
		*/
		expand(silent) {
			if (!this._isCollapsed) return;
			this._isCollapsed = false;
			this._el.classList.remove("collapsed", "sidebar-collapsed");
			this._updateTogglerAria();
			this._persist && localStorage.setItem(`${LS_KEY}:${this._id}`, "false");
			if (!silent) {
				emit(this._el, "sidebar:expand", { sidebar: this });
				this._onExpand?.({ sidebar: this });
				this._onChange?.({
					collapsed: false,
					sidebar: this
				});
			}
		}
		/** Toggle collapsed state. */
		toggle() {
			this._isCollapsed ? this.expand() : this.collapse();
		}
		/**
		* Set the active sidebar item programmatically.
		* @param {string|Element} target — href string or .sidebar-item element
		*/
		setActive(target) {
			$$(".sidebar-item", this._el).forEach((item) => {
				item.classList.remove("active");
				item.removeAttribute("aria-current");
			});
			let activeItem = null;
			if (target instanceof Element) activeItem = target.closest(".sidebar-item") || target;
			else if (typeof target === "string") {
				const link = this._el.querySelector(`.sidebar-item[href="${target}"], .sidebar-item [href="${target}"]`);
				activeItem = link?.closest(".sidebar-item") || link;
			}
			if (activeItem) {
				activeItem.classList.add("active");
				activeItem.setAttribute("aria-current", "page");
			}
		}
		/** Clear persisted state. */
		clearStorage() {
			localStorage.removeItem(`${LS_KEY}:${this._id}`);
		}
		destroy() {
			this._el.querySelectorAll(`[${ATTR_TOGGLE}], [${ATTR_COLLAPSE}], [${ATTR_EXPAND}]`).forEach((btn) => btn.replaceWith(btn.cloneNode(true)));
		}
		_bindEvents() {
			this._el.addEventListener("click", (e) => {
				if (e.target.closest(`[${ATTR_TOGGLE}]`)) {
					e.stopPropagation();
					this.toggle();
				}
				if (e.target.closest(`[${ATTR_COLLAPSE}]`)) {
					e.stopPropagation();
					this.collapse();
				}
				if (e.target.closest(`[${ATTR_EXPAND}]`)) {
					e.stopPropagation();
					this.expand();
				}
			});
			if (this._trackActive) this._el.addEventListener("click", (e) => {
				const item = e.target.closest(".sidebar-item");
				if (!item) return;
				const tag = item.tagName.toLowerCase();
				const parentTag = item.parentElement?.tagName.toLowerCase();
				if (tag === "a" || parentTag === "a") return;
				this.setActive(item);
			});
			document.addEventListener("click", (e) => {
				const trigger = e.target.closest(`[${ATTR_TOGGLE}]`);
				if (!trigger) return;
				const targetId = trigger.getAttribute(ATTR_TOGGLE);
				if (targetId && targetId !== this._id) return;
				if (!targetId || targetId === this._id) this.toggle();
			});
			this._el.addEventListener("keydown", (e) => {
				if (e.key === "Escape" && !this._isCollapsed) {
					this.collapse();
					document.querySelector(`[${ATTR_TOGGLE}="${this._id}"]`)?.focus();
				}
			});
		}
		_markActiveLinks() {
			const path = location.pathname;
			$$(".sidebar-item", this._el).forEach((item) => {
				const href = item.getAttribute("href") || item.querySelector("a")?.getAttribute("href");
				if (!href) return;
				if (href === path || href !== "/" && path.startsWith(href)) {
					item.classList.add("active");
					item.setAttribute("aria-current", "page");
				}
			});
		}
		_updateTogglerAria() {
			$$(`[${ATTR_TOGGLE}]`, this._el).forEach((btn) => {
				btn.setAttribute("aria-expanded", String(!this._isCollapsed));
				btn.setAttribute("aria-controls", this._id);
			});
		}
	};
	var _sidebars = /* @__PURE__ */ new Map();
	/**
	* Get or create a Sidebar instance.
	* @param {string|Element} target — element or id
	* @param {Object} [options]
	* @returns {Sidebar|null}
	*/
	function getSidebar(target, options) {
		const el = typeof target === "string" ? document.getElementById(target) || document.querySelector(target) : target;
		if (!el) return null;
		if (_sidebars.has(el)) return _sidebars.get(el);
		const instance = new Sidebar(el, options);
		_sidebars.set(el, instance);
		return instance;
	}
	document.addEventListener("click", (e) => {
		const trigger = e.target.closest(`[${ATTR_TOGGLE}]`);
		if (!trigger || trigger.closest(".sidebar")) return;
		const id = trigger.getAttribute(ATTR_TOGGLE);
		if (!id) return;
		getSidebar(id)?.toggle();
	});
	register(".sidebar", (el) => getSidebar(el));
	//#endregion
	//#region src/js/components/form.js
	/**
	* Show or clear a validation error on a .form-group.
	* @param {Element} field  — input / select / textarea
	* @param {string|null} message — null or '' to clear the error
	*/
	function setFieldError(field, message) {
		const group = field.closest(".form-group");
		if (!group) return;
		field.classList.toggle("is-error", !!message);
		field.classList.toggle("form-input-error", !!message);
		field.setAttribute("aria-invalid", message ? "true" : "false");
		let errorEl = group.querySelector(".form-error[data-field-error]");
		if (message) {
			if (!errorEl) {
				errorEl = document.createElement("span");
				errorEl.className = "form-error";
				errorEl.setAttribute("data-field-error", "");
				errorEl.setAttribute("role", "alert");
				errorEl.setAttribute("aria-live", "polite");
				const hint = group.querySelector(".form-hint");
				if (hint) hint.insertAdjacentElement("afterend", errorEl);
				else group.appendChild(errorEl);
			}
			const errId = errorEl.id || uid("err");
			errorEl.id = errId;
			errorEl.textContent = message;
			field.setAttribute("aria-describedby", [field.getAttribute("aria-describedby"), errId].filter(Boolean).join(" "));
		} else if (errorEl) {
			errorEl.remove();
			const errId = errorEl.id;
			if (errId) {
				const described = (field.getAttribute("aria-describedby") || "").split(" ").filter((id) => id !== errId).join(" ");
				if (described) field.setAttribute("aria-describedby", described);
				else field.removeAttribute("aria-describedby");
			}
		}
	}
	/**
	* Clear all field errors inside a form or container.
	* @param {Element} form
	*/
	function clearFormErrors(form) {
		$$(`.is-error`, form).forEach((f) => setFieldError(f, null));
	}
	var _rules = {
		required: (val) => val.trim().length > 0 || "This field is required.",
		email: (val) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val.trim()) || "Enter a valid email address.",
		url: (val) => {
			try {
				new URL(val);
				return true;
			} catch {
				return "Enter a valid URL.";
			}
		},
		min: (val, attr) => Number(val) >= Number(attr) || `Minimum value is ${attr}.`,
		max: (val, attr) => Number(val) <= Number(attr) || `Maximum value is ${attr}.`,
		minlength: (val, attr) => val.trim().length >= Number(attr) || `Minimum ${attr} characters required.`,
		maxlength: (val, attr) => val.trim().length <= Number(attr) || `Maximum ${attr} characters allowed.`,
		pattern: (val, attr, field) => {
			return new RegExp(field.pattern).test(val) || field.title || "Invalid format.";
		}
	};
	/**
	* Validate a single field against HTML5 + data-* attributes.
	* Returns null if valid, or an error string if invalid.
	*
	* @param {HTMLInputElement|HTMLSelectElement|HTMLTextAreaElement} field
	* @returns {string|null}
	*/
	function validateField(field) {
		const val = field.value;
		if (field.disabled || field.readOnly || field.type === "hidden") return null;
		for (const [rule, fn] of Object.entries(_rules)) {
			const attr = {
				required: "required",
				email: null,
				url: null,
				min: "min",
				max: "max",
				minlength: "minlength",
				maxlength: "maxlength",
				pattern: "pattern"
			}[rule];
			if (!(attr === null ? field.getAttribute("data-validate")?.includes(rule) || field.type === rule : field.hasAttribute(attr))) continue;
			const result = fn(val, attr !== null ? field.getAttribute(attr) : null, field);
			if (result !== true) return result;
		}
		return null;
	}
	/**
	* Validate all fields inside a form.
	* Returns true if the form is valid, false otherwise.
	* Applies / clears .form-error for each field.
	*
	* @param {Element} form
	* @returns {boolean}
	*/
	function validateForm(form) {
		let valid = true;
		$$("input, select, textarea", form).forEach((field) => {
			const error = validateField(field);
			setFieldError(field, error);
			if (error) valid = false;
		});
		if (!valid) $("[aria-invalid=\"true\"]", form)?.focus();
		return valid;
	}
	var CharCounter = class {
		/**
		* @param {HTMLInputElement|HTMLTextAreaElement} field
		* @param {Object} [options]
		* @param {number} [options.max]       — defaults to field maxlength attribute
		* @param {number} [options.warnAt]    — percentage at which to show warning state (default 80)
		*/
		constructor(field, options) {
			const opts = options || {};
			this._field = field;
			this._max = opts.max || Number(field.getAttribute("maxlength")) || 0;
			this._warnAt = opts.warnAt || 80;
			this._counter = null;
			if (!this._max) return;
			this._counter = field.closest(".form-group")?.querySelector(".form-counter") || this._createCounter();
			this._onInput = () => this._update();
			this._update();
			field.addEventListener("input", this._onInput);
		}
		_createCounter() {
			const counter = document.createElement("span");
			counter.className = "form-counter";
			counter.setAttribute("aria-live", "polite");
			this._field.closest(".form-group")?.appendChild(counter);
			return counter;
		}
		_update() {
			const len = this._field.value.length;
			const pct = this._max ? Math.round(len / this._max * 100) : 0;
			this._counter.textContent = `${len} / ${this._max}`;
			this._counter.classList.toggle("is-warn", pct >= this._warnAt && pct < 100);
			this._counter.classList.toggle("is-error", len > this._max);
			if (len > this._max) setFieldError(this._field, `Maximum ${this._max} characters allowed.`);
			else setFieldError(this._field, null);
		}
		destroy() {
			this._field.removeEventListener("input", this._onInput);
			this._counter?.remove();
		}
	};
	/**
	* Attach a character counter to a field.
	* @param {HTMLInputElement|HTMLTextAreaElement} field
	* @param {Object} [options]
	* @returns {CharCounter}
	*/
	function charCounter(field, options) {
		return new CharCounter(field, options);
	}
	register("[data-char-counter]", (el) => {
		charCounter(el, {
			max: Number(el.dataset.charCounter) || void 0,
			warnAt: Number(el.dataset.warnAt) || void 0
		});
	});
	var SVG_SHOW = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0z"/><path stroke-linecap="round" stroke-linejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>`;
	var SVG_HIDE = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M13.875 18.825A10.05 10.05 0 0 1 12 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 0 1 4.04-5.37M9.88 9.88a3 3 0 0 0 4.243 4.243M3 3l18 18"/></svg>`;
	var PasswordToggle = class {
		/**
		* @param {HTMLInputElement} field — input[type="password"]
		* @param {Object} [options]
		* @param {string} [options.showLabel='Show password']
		* @param {string} [options.hideLabel='Hide password']
		*/
		constructor(field, options) {
			const opts = options || {};
			this._field = field;
			this._showLabel = opts.showLabel || "Show password";
			this._hideLabel = opts.hideLabel || "Hide password";
			this._visible = false;
			this._wrap = field.closest(".input-wrap");
			this._button = this._wrap?.querySelector(".input-action[data-password-toggle]") || this._createButton();
			this._update();
			this._button.addEventListener("click", () => this.toggle());
		}
		toggle() {
			this._visible = !this._visible;
			this._field.type = this._visible ? "text" : "password";
			this._update();
			emit(this._field, "password:toggle", { visible: this._visible });
		}
		show() {
			if (!this._visible) this.toggle();
		}
		hide() {
			if (this._visible) this.toggle();
		}
		_createButton() {
			const btn = document.createElement("button");
			btn.type = "button";
			btn.className = "input-action";
			btn.setAttribute("data-password-toggle", "");
			btn.setAttribute("tabindex", "0");
			if (this._wrap) {
				this._wrap.appendChild(btn);
				this._wrap.classList.add("has-icon-right");
			} else this._field.insertAdjacentElement("afterend", btn);
			return btn;
		}
		_update() {
			this._button.innerHTML = this._visible ? SVG_HIDE : SVG_SHOW;
			this._button.setAttribute("aria-label", this._visible ? this._hideLabel : this._showLabel);
			this._button.setAttribute("aria-pressed", String(this._visible));
		}
	};
	/**
	* Attach a password visibility toggle to a field.
	* @param {HTMLInputElement} field
	* @param {Object} [options]
	* @returns {PasswordToggle}
	*/
	function passwordToggle(field, options) {
		return new PasswordToggle(field, options);
	}
	register("[data-password-toggle]", (el) => {
		if (el.tagName === "INPUT") passwordToggle(el);
	});
	register("[data-validate]", (el) => {
		el.addEventListener("blur", () => {
			setFieldError(el, validateField(el));
		});
		el.addEventListener("input", () => {
			if (el.classList.contains("is-error")) setFieldError(el, validateField(el));
		});
	});
	register("form[data-validate-form]", (form) => {
		form.setAttribute("novalidate", "");
		form.addEventListener("submit", (e) => {
			if (!validateForm(form)) {
				e.preventDefault();
				emit(form, "form:invalid", { form });
			} else emit(form, "form:valid", { form });
		});
	});
	//#endregion
	//#region src/js/components/search-select.js
	var SearchSelect = class {
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
			const opts = options || {};
			this._el = container;
			this._items = this._normaliseItems(opts.items || this._readDataItems());
			this._placeholder = opts.placeholder || container.dataset.placeholder || "Search…";
			this._clearable = opts.clearable !== false;
			this._onSelect = opts.onSelect || null;
			this._onClear = opts.onClear || null;
			this._filterFn = opts.filter || this._defaultFilter.bind(this);
			this._noDataText = opts.noDataText || container.dataset.noDataText || "No data available.";
			this._emptyText = opts.emptyText || container.dataset.emptyText || "No results found.";
			this._selected = null;
			this._isOpen = false;
			this._activeIdx = -1;
			this._listId = uid("ss-list");
			this._input = container.querySelector(".search-input") || this._buildInput();
			this._list = container.querySelector(".search-select-list") || this._buildList();
			this._dropdown = container.querySelector(".search-select-dropdown") || this._list;
			this._hidden = container.querySelector("input[type=\"hidden\"]") || this._buildHidden();
			this._input.setAttribute("role", "combobox");
			this._input.setAttribute("aria-autocomplete", "list");
			this._input.setAttribute("aria-expanded", "false");
			this._input.setAttribute("aria-controls", this._listId);
			this._list.setAttribute("role", "listbox");
			this._list.id = this._listId;
			this._handleInput = debounce((e) => this._onInput(e), opts.debounce || 200);
			this._bindEvents();
			const init = this._hidden.value;
			if (init) {
				const match = this._items.find((i) => i.value === init);
				if (match) this._selectItem(match, true);
			}
		}
		get value() {
			return this._selected?.value ?? null;
		}
		get selected() {
			return this._selected;
		}
		get isOpen() {
			return this._isOpen;
		}
		/**
		* Programmatically select an item by value.
		* @param {string} value
		*/
		select(value) {
			const item = this._items.find((i) => i.value === value);
			if (item) this._selectItem(item);
		}
		/** Clear the selection. */
		clear() {
			this._selected = null;
			this._input.value = "";
			this._hidden.value = "";
			this._renderList(this._items);
			emit(this._el, "searchselect:clear", { searchSelect: this });
			this._onClear?.({ searchSelect: this });
		}
		/** Set or replace the items list. */
		setItems(items) {
			this._items = this._normaliseItems(items);
			if (this._isOpen) this._renderList(this._filterFn(this._items, this._input.value));
		}
		destroy() {
			this._input.removeEventListener("input", this._handleInput);
			this._input.removeEventListener("keydown", this._handleKeydown);
			this._input.removeEventListener("focus", this._onFocus);
			document.removeEventListener("click", this._onDocClick);
		}
		_normaliseItems(items) {
			return items.map((i) => typeof i === "string" ? {
				value: i,
				label: i
			} : i);
		}
		_readDataItems() {
			return $$(".search-select-item[data-value]", this._el).map((el) => ({
				value: el.dataset.value,
				label: el.textContent.trim()
			}));
		}
		_defaultFilter(items, query) {
			if (!query) return items;
			const q = query.toLowerCase();
			return items.filter((i) => i.label.toLowerCase().includes(q));
		}
		_buildInput() {
			const input = document.createElement("input");
			input.type = "text";
			input.className = "search-input";
			input.placeholder = this._placeholder;
			this._el.appendChild(input);
			return input;
		}
		_buildList() {
			const dropdown = document.createElement("div");
			dropdown.className = "search-select-dropdown";
			dropdown.setAttribute("hidden", "");
			this._el.appendChild(dropdown);
			const list = document.createElement("div");
			list.className = "search-select-list";
			dropdown.appendChild(list);
			return list;
		}
		_buildHidden() {
			const h = document.createElement("input");
			h.type = "hidden";
			h.name = this._el.dataset.name || "";
			this._el.appendChild(h);
			return h;
		}
		_bindEvents() {
			this._handleKeydown = this._onKeydown.bind(this);
			this._onFocus = () => this._open();
			this._onDocClick = (e) => {
				if (!this._el.contains(e.target)) this._close();
			};
			this._input.addEventListener("input", this._handleInput);
			this._input.addEventListener("keydown", this._handleKeydown);
			this._input.addEventListener("focus", this._onFocus);
			this._input.addEventListener("click", () => this._open());
			this._list.addEventListener("click", (e) => {
				const item = e.target.closest("[data-value]");
				if (item) this._selectItem({
					value: item.dataset.value,
					label: item.textContent
				});
			});
			document.addEventListener("click", this._onDocClick);
		}
		_onInput() {
			const filtered = this._filterFn(this._items, this._input.value);
			this._renderList(filtered);
			this._open();
		}
		_onKeydown(e) {
			const items = $$("[data-value]", this._list).filter((i) => !i.hidden);
			if (!items.length && e.key !== "Escape") return;
			switch (e.key) {
				case "ArrowDown":
					e.preventDefault();
					this._activeIdx = Math.min(this._activeIdx + 1, items.length - 1);
					this._updateActive(items);
					break;
				case "ArrowUp":
					e.preventDefault();
					this._activeIdx = Math.max(this._activeIdx - 1, 0);
					this._updateActive(items);
					break;
				case "Enter":
					e.preventDefault();
					if (this._activeIdx >= 0 && items[this._activeIdx]) {
						const el = items[this._activeIdx];
						this._selectItem({
							value: el.dataset.value,
							label: el.textContent
						});
					}
					break;
				case "Escape":
					this._close();
					break;
				case "Tab":
					this._close();
					break;
			}
		}
		_updateActive(items) {
			items.forEach((el, i) => {
				el.classList.toggle("active", i === this._activeIdx);
				if (i === this._activeIdx) {
					el.scrollIntoView({ block: "nearest" });
					this._input.setAttribute("aria-activedescendant", el.id || (el.id = uid("ss-opt")));
				}
			});
		}
		_renderList(items) {
			this._list.innerHTML = "";
			this._activeIdx = -1;
			this._input.removeAttribute("aria-activedescendant");
			if (!items.length) {
				const empty = document.createElement("div");
				empty.className = "search-select-empty";
				empty.textContent = this._items.length === 0 ? this._noDataText : this._emptyText;
				this._list.appendChild(empty);
				return;
			}
			items.forEach((item) => {
				const div = document.createElement("div");
				div.className = "search-select-item";
				div.setAttribute("data-value", item.value);
				div.setAttribute("role", "option");
				div.setAttribute("aria-selected", this._selected?.value === item.value ? "true" : "false");
				div.textContent = item.label;
				if (this._selected?.value === item.value) div.classList.add("active");
				this._list.appendChild(div);
			});
		}
		_selectItem(item, silent) {
			this._selected = item;
			this._input.value = item.label;
			this._hidden.value = item.value;
			this._close();
			if (!silent) {
				emit(this._el, "searchselect:select", {
					item,
					searchSelect: this
				});
				this._onSelect?.({
					item,
					searchSelect: this
				});
			}
		}
		_open() {
			if (this._isOpen) return;
			this._isOpen = true;
			this._renderList(this._filterFn(this._items, this._input.value));
			this._dropdown.removeAttribute("hidden");
			this._input.setAttribute("aria-expanded", "true");
			this._el.classList.add("is-open");
		}
		_close() {
			if (!this._isOpen) return;
			this._isOpen = false;
			this._dropdown.setAttribute("hidden", "");
			this._input.setAttribute("aria-expanded", "false");
			this._el.classList.remove("is-open");
			this._activeIdx = -1;
			if (this._selected) this._input.value = this._selected.label;
		}
	};
	/**
	* Get or create a SearchSelect instance.
	* @param {string|Element} target
	* @param {Object} [options]
	* @returns {SearchSelect|null}
	*/
	function getSearchSelect(target, options) {
		const el = typeof target === "string" ? document.getElementById(target) || document.querySelector(target) : target;
		if (!el) return null;
		if (el._fondasiSearchSelect) return el._fondasiSearchSelect;
		const instance = new SearchSelect(el, options);
		el._fondasiSearchSelect = instance;
		return instance;
	}
	register(".search-select", (el) => {
		if (el.closest("pre, code")) return;
		getSearchSelect(el);
	});
	var MultiSearchSelect = class {
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
			this._el = container;
			this._items = this._normaliseItems(opts.items || this._readDataItems());
			this._placeholder = opts.placeholder || container.dataset.placeholder || "Search…";
			this._onSelect = opts.onSelect || null;
			this._onRemove = opts.onRemove || null;
			this._filterFn = opts.filter || this._defaultFilter.bind(this);
			this._noDataText = opts.noDataText || container.dataset.noDataText || "No data available.";
			this._emptyText = opts.emptyText || container.dataset.emptyText || "No results found.";
			this._name = container.dataset.name || "";
			this._selected = [];
			this._isOpen = false;
			this._activeIdx = -1;
			this._listId = uid("ms-list");
			this._build();
			this._bindEvents();
			(container.dataset.value || "").split(",").filter(Boolean).forEach((v) => {
				const match = this._items.find((i) => i.value === v);
				if (match) this._selectItem(match, true);
			});
		}
		get values() {
			return this._selected.map((i) => i.value);
		}
		get selected() {
			return [...this._selected];
		}
		get isOpen() {
			return this._isOpen;
		}
		select(value) {
			const item = this._items.find((i) => i.value === value);
			if (item && !this._isSelected(item)) this._selectItem(item);
		}
		deselect(value) {
			const idx = this._selected.findIndex((i) => i.value === value);
			if (idx !== -1) this._removeItem(idx);
		}
		clear() {
			this._selected = [];
			this._renderTags();
			this._updateHiddenInputs();
			emit(this._el, "multisearchselect:clear", { instance: this });
		}
		setItems(items) {
			this._items = this._normaliseItems(items);
			if (this._isOpen) this._renderList(this._filterFn(this._items, this._input.value, this._selected));
		}
		destroy() {
			this._input.removeEventListener("input", this._handleInput);
			this._input.removeEventListener("keydown", this._handleKeydown);
			this._tagsWrap.removeEventListener("click", this._onTagsClick);
			document.removeEventListener("click", this._onDocClick);
		}
		_normaliseItems(items) {
			return items.map((i) => typeof i === "string" ? {
				value: i,
				label: i
			} : i);
		}
		_readDataItems() {
			return $$(".search-select-item[data-value]", this._el).map((el) => ({
				value: el.dataset.value,
				label: el.textContent.trim()
			}));
		}
		_isSelected(item) {
			return this._selected.some((s) => s.value === item.value);
		}
		_defaultFilter(items, query) {
			const unselected = items.filter((i) => !this._isSelected(i));
			if (!query) return unselected;
			const q = query.toLowerCase();
			return unselected.filter((i) => i.label.toLowerCase().includes(q));
		}
		_build() {
			this._tagsWrap = document.createElement("div");
			this._tagsWrap.className = "search-select-tags";
			this._input = document.createElement("input");
			this._input.type = "text";
			this._input.className = "search-select-tag-input";
			this._input.placeholder = this._placeholder;
			this._input.setAttribute("role", "combobox");
			this._input.setAttribute("aria-autocomplete", "list");
			this._input.setAttribute("aria-expanded", "false");
			this._input.setAttribute("aria-controls", this._listId);
			this._tagsWrap.appendChild(this._input);
			this._dropdown = document.createElement("div");
			this._dropdown.className = "search-select-dropdown";
			this._dropdown.setAttribute("hidden", "");
			this._list = document.createElement("div");
			this._list.className = "search-select-list";
			this._list.id = this._listId;
			this._list.setAttribute("role", "listbox");
			this._list.setAttribute("aria-multiselectable", "true");
			this._dropdown.appendChild(this._list);
			this._el.innerHTML = "";
			this._el.appendChild(this._tagsWrap);
			this._el.appendChild(this._dropdown);
		}
		_bindEvents() {
			this._handleInput = debounce(() => this._onInput(), 200);
			this._handleKeydown = this._onKeydown.bind(this);
			this._onTagsClick = (e) => {
				const removeBtn = e.target.closest(".search-select-tag-remove");
				if (removeBtn) {
					const idx = parseInt(removeBtn.dataset.idx, 10);
					this._removeItem(idx);
				} else this._input.focus();
			};
			this._onDocClick = (e) => {
				if (!this._el.contains(e.target)) this._close();
			};
			this._input.addEventListener("input", this._handleInput);
			this._input.addEventListener("keydown", this._handleKeydown);
			this._input.addEventListener("focus", () => this._open());
			this._input.addEventListener("click", () => this._open());
			this._list.addEventListener("click", (e) => {
				const item = e.target.closest("[data-value]");
				if (item) this._selectItem({
					value: item.dataset.value,
					label: item.textContent.trim()
				});
			});
			this._tagsWrap.addEventListener("click", this._onTagsClick);
			document.addEventListener("click", this._onDocClick);
		}
		_onInput() {
			const filtered = this._filterFn(this._items, this._input.value, this._selected);
			this._renderList(filtered);
			this._open();
		}
		_onKeydown(e) {
			const items = $$("[data-value]", this._list).filter((i) => !i.hidden);
			if (e.key === "Backspace" && !this._input.value && this._selected.length > 0) {
				this._removeItem(this._selected.length - 1);
				return;
			}
			switch (e.key) {
				case "ArrowDown":
					e.preventDefault();
					this._activeIdx = Math.min(this._activeIdx + 1, items.length - 1);
					this._updateActive(items);
					break;
				case "ArrowUp":
					e.preventDefault();
					this._activeIdx = Math.max(this._activeIdx - 1, 0);
					this._updateActive(items);
					break;
				case "Enter":
					e.preventDefault();
					if (this._activeIdx >= 0 && items[this._activeIdx]) {
						const el = items[this._activeIdx];
						this._selectItem({
							value: el.dataset.value,
							label: el.textContent.trim()
						});
					}
					break;
				case "Escape":
					this._close();
					break;
			}
		}
		_updateActive(items) {
			items.forEach((el, i) => {
				el.classList.toggle("active", i === this._activeIdx);
				if (i === this._activeIdx) {
					el.scrollIntoView({ block: "nearest" });
					this._input.setAttribute("aria-activedescendant", el.id || (el.id = uid("ms-opt")));
				}
			});
		}
		_renderList(items) {
			this._list.innerHTML = "";
			this._activeIdx = -1;
			this._input.removeAttribute("aria-activedescendant");
			if (!items.length) {
				const empty = document.createElement("div");
				empty.className = "search-select-empty";
				empty.textContent = this._items.filter((i) => !this._isSelected(i)).length === 0 ? this._noDataText : this._emptyText;
				this._list.appendChild(empty);
				return;
			}
			items.forEach((item) => {
				const div = document.createElement("div");
				div.className = "search-select-item";
				div.setAttribute("data-value", item.value);
				div.setAttribute("role", "option");
				div.setAttribute("aria-selected", "false");
				div.textContent = item.label;
				this._list.appendChild(div);
			});
		}
		_renderTags() {
			Array.from(this._tagsWrap.querySelectorAll(".search-select-tag")).forEach((t) => t.remove());
			this._selected.forEach((item, idx) => {
				const tag = document.createElement("span");
				tag.className = "search-select-tag";
				tag.innerHTML = `<span class="search-select-tag-label">${item.label}</span><button type="button" class="search-select-tag-remove" data-idx="${idx}" aria-label="Remove ${item.label}"><svg viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="2" width="10" height="10" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M1 1l12 12M13 1L1 13"/></svg></button>`;
				this._tagsWrap.insertBefore(tag, this._input);
			});
			this._input.placeholder = this._selected.length ? "" : this._placeholder;
		}
		_updateHiddenInputs() {
			Array.from(this._el.querySelectorAll("input[type=\"hidden\"]")).forEach((i) => i.remove());
			this._selected.forEach((item) => {
				const h = document.createElement("input");
				h.type = "hidden";
				h.name = this._name;
				h.value = item.value;
				this._el.appendChild(h);
			});
		}
		_selectItem(item, silent) {
			if (this._isSelected(item)) return;
			this._selected.push(item);
			this._input.value = "";
			this._renderTags();
			this._updateHiddenInputs();
			const filtered = this._filterFn(this._items, "", this._selected);
			this._renderList(filtered);
			if (!silent) {
				emit(this._el, "multisearchselect:select", {
					item,
					instance: this
				});
				this._onSelect?.({
					item,
					instance: this
				});
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
			emit(this._el, "multisearchselect:remove", {
				item,
				instance: this
			});
			this._onRemove?.({
				item,
				instance: this
			});
		}
		_open() {
			if (this._isOpen) return;
			this._isOpen = true;
			const filtered = this._filterFn(this._items, this._input.value, this._selected);
			this._renderList(filtered);
			this._dropdown.removeAttribute("hidden");
			this._input.setAttribute("aria-expanded", "true");
			this._el.classList.add("is-open");
		}
		_close() {
			if (!this._isOpen) return;
			this._isOpen = false;
			this._dropdown.setAttribute("hidden", "");
			this._input.setAttribute("aria-expanded", "false");
			this._el.classList.remove("is-open");
			this._activeIdx = -1;
		}
	};
	/**
	* Get or create a MultiSearchSelect instance.
	* @param {string|Element} target
	* @param {Object} [options]
	* @returns {MultiSearchSelect|null}
	*/
	function getMultiSearchSelect(target, options) {
		const el = typeof target === "string" ? document.getElementById(target) || document.querySelector(target) : target;
		if (!el) return null;
		if (el._fondasiMultiSearchSelect) return el._fondasiMultiSearchSelect;
		const instance = new MultiSearchSelect(el, options);
		el._fondasiMultiSearchSelect = instance;
		return instance;
	}
	register(".search-select-multi", (el) => {
		if (el.closest("pre, code")) return;
		getMultiSearchSelect(el);
	});
	//#endregion
	//#region src/js/components/table.js
	var ICON_SORT_NONE = `<span class="th-sort-icon" aria-hidden="true">▲▼</span>`;
	var ICON_SORT_ASC = `<span class="th-sort-icon asc" aria-hidden="true">▲</span>`;
	var ICON_SORT_DESC = `<span class="th-sort-icon desc" aria-hidden="true">▼</span>`;
	var ICON_PREV = `<svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clip-rule="evenodd"/></svg>`;
	var ICON_NEXT = `<svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clip-rule="evenodd"/></svg>`;
	var DataTable = class {
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
			this._table = container.querySelector(".table") || container;
			this._thead = this._table.querySelector("thead");
			this._tbody = this._table.querySelector("tbody");
			if (!this._thead || !this._tbody) {
				console.warn("[DataTable] Missing <thead> or <tbody>.");
				return;
			}
			this._sortable = opts.sortable !== false;
			this._selectable = opts.selectable || false;
			this._multiSelect = opts.multiSelect !== false;
			this._paginate = opts.paginate || false;
			this._pageSize = opts.pageSize || Number(container.dataset.pageSize) || 10;
			this._expandable = opts.expandable || container.dataset.expandable === "true";
			this._emptyMessage = opts.emptyMessage || container.dataset.emptyMessage || "Tidak ada data.";
			this._emptyIcon = opts.emptyIcon || container.dataset.emptyIcon || "📭";
			this._onSort = opts.onSort || null;
			this._onSelect = opts.onSelect || null;
			this._onPage = opts.onPage || null;
			this._onSearch = opts.onSearch || null;
			this._onBulk = opts.onBulk || null;
			this._sortCol = opts.sortCol || null;
			this._sortDir = opts.sortDir || "asc";
			this._sortedRows = null;
			this._searchQuery = "";
			this._selected = /* @__PURE__ */ new Set();
			this._page = 1;
			this._loading = false;
			this._id = container.id || uid("table");
			container.id = this._id;
			this._allRows = Array.from(this._tbody.querySelectorAll("tr"));
			if (this._sortable) this._initSorting();
			if (this._selectable) this._initSelection();
			if (this._expandable) this._initRowExpand();
			if (this._paginate) this._pagerEl = container.querySelector(".table-footer") || this._createPager();
			this._initSearch(opts.searchInput);
			this._initPageSizeSelect(opts.pageSizeSelect);
			this._initBulkBar();
			if (opts.loading) this.setLoading(true);
			else this._render();
			if (this._sortCol) this.sort(this._sortCol, this._sortDir);
		}
		get selectedRows() {
			return [...this._selected];
		}
		get selectedCount() {
			return this._selected.size;
		}
		get currentPage() {
			return this._page;
		}
		get element() {
			return this._container;
		}
		get totalPages() {
			const n = this._getDisplayRows().length;
			return Math.max(1, Math.ceil(n / this._pageSize));
		}
		/**
		* Filter table rows by query string (searches all cell text).
		* @param {string} query
		*/
		search(query) {
			this._searchQuery = (query || "").trim();
			this._page = 1;
			this._render();
			emit(this._container, "table:search", {
				query: this._searchQuery,
				table: this
			});
			this._onSearch?.({
				query: this._searchQuery,
				table: this
			});
		}
		/**
		* Sort by column key. Toggles direction if same column clicked.
		* @param {string}           col
		* @param {'asc'|'desc'}     [dir]
		*/
		sort(col, dir) {
			const th = this._thead.querySelector(`[data-col="${col}"]`);
			if (!th) return;
			const newDir = dir || (this._sortCol === col && this._sortDir === "asc" ? "desc" : "asc");
			this._sortCol = col;
			this._sortDir = newDir;
			this._sortRows(col, newDir, th.dataset.type || "string");
			this._updateSortHeaders();
			this._render();
			emit(this._container, "table:sort", {
				col,
				dir: newDir,
				table: this
			});
			this._onSort?.({
				col,
				dir: newDir,
				table: this
			});
		}
		selectRow(target) {
			const row = this._resolveRow(target);
			if (!row || row.classList.contains("disabled")) return;
			if (!this._multiSelect) this._selected.forEach((r) => this._deselect(r, true));
			row.classList.add("selected");
			row.setAttribute("aria-selected", "true");
			this._selected.add(row);
			const cb = row.querySelector("input[type=\"checkbox\"][data-row-check]");
			if (cb) cb.checked = true;
			this._updateSelectAll();
			this._updateBulkBar();
			emit(this._container, "table:select", {
				selected: this.selectedRows,
				row,
				table: this
			});
			this._onSelect?.({
				selected: this.selectedRows,
				row,
				table: this
			});
		}
		deselectRow(target) {
			const row = this._resolveRow(target);
			if (!row) return;
			this._deselect(row);
			emit(this._container, "table:select", {
				selected: this.selectedRows,
				row,
				table: this
			});
			this._onSelect?.({
				selected: this.selectedRows,
				row,
				table: this
			});
		}
		selectAll() {
			this._getVisibleRows().forEach((r) => this.selectRow(r));
		}
		deselectAll() {
			[...this._selected].forEach((r) => this._deselect(r, true));
			this._selected.clear();
			this._updateSelectAll();
			this._updateBulkBar();
			emit(this._container, "table:select", {
				selected: [],
				row: null,
				table: this
			});
			this._onSelect?.({
				selected: [],
				row: null,
				table: this
			});
		}
		goTo(page) {
			this._page = Math.max(1, Math.min(page, this.totalPages));
			this._render();
			emit(this._container, "table:page", {
				page: this._page,
				pageSize: this._pageSize,
				table: this
			});
			this._onPage?.({
				page: this._page,
				pageSize: this._pageSize,
				table: this
			});
		}
		next() {
			this.goTo(this._page + 1);
		}
		prev() {
			this.goTo(this._page - 1);
		}
		/**
		* Export current filtered rows to a CSV file.
		* @param {string} [filename='data-export.csv']
		*/
		exportCSV(filename) {
			const fn = filename || "data-export.csv";
			const thEls = Array.from(this._thead.querySelectorAll("th"));
			const skipIdx = new Set(thEls.map((th, i) => th.querySelector("input[type=\"checkbox\"]") ? i : -1).filter((i) => i >= 0));
			const csv = "﻿" + [thEls.filter((_, i) => !skipIdx.has(i)).map((th) => `"${th.textContent.trim().replace(/"/g, "\"\"")}"`).join(","), ...this._getDisplayRows().map((row) => Array.from(row.cells).filter((_, i) => !skipIdx.has(i)).map((cell) => {
				return `"${(cell.dataset.value || cell.textContent).trim().replace(/"/g, "\"\"")}"`;
			}).join(","))].join("\n");
			const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
			const url = URL.createObjectURL(blob);
			const a = document.createElement("a");
			a.href = url;
			a.download = fn;
			a.click();
			URL.revokeObjectURL(url);
		}
		/**
		* Toggle loading skeleton.
		* @param {boolean} state
		* @param {number}  [skeletonCount=5]
		*/
		setLoading(state, skeletonCount) {
			this._loading = !!state;
			this._container.classList.toggle("table-loading", this._loading);
			if (this._loading) {
				const n = skeletonCount || 5;
				const cols = this._thead.querySelectorAll("th").length || 4;
				this._tbody.innerHTML = Array.from({ length: n }, () => `<tr class="tr-skeleton">${"<td></td>".repeat(cols)}</tr>`).join("");
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
			if (typeof rows === "string") this._tbody.innerHTML = rows;
			else {
				this._tbody.innerHTML = "";
				rows.forEach((r) => this._tbody.appendChild(r));
			}
			this._allRows = Array.from(this._tbody.querySelectorAll("tr"));
			this._sortedRows = null;
			this._selected.clear();
			this._page = 1;
			if (this._selectable) this._rebindRowCheckboxes();
			this._render();
		}
		/**
		* Returns sorted + search-filtered rows (not yet paginated).
		*/
		_getDisplayRows() {
			let rows = this._sortedRows ? [...this._sortedRows] : [...this._allRows];
			if (this._searchQuery) {
				const q = this._searchQuery.toLowerCase();
				rows = rows.filter((row) => Array.from(row.cells).some((cell) => {
					return (cell.dataset.searchText || cell.textContent).trim().toLowerCase().includes(q);
				}));
			}
			return rows;
		}
		_render() {
			if (this._loading) return;
			const display = this._getDisplayRows();
			this._allRows.forEach((r) => {
				r.hidden = true;
			});
			if (this._paginate) this._renderPage(display);
			else display.forEach((r) => {
				r.hidden = false;
				this._tbody.appendChild(r);
			});
			this._checkEmpty(display);
			this._updateSelectAll();
			this._updateBulkBar();
		}
		_initSorting() {
			this._thead.querySelectorAll("th[data-col]").forEach((th) => {
				th.classList.add("th-sortable");
				th.setAttribute("role", "columnheader");
				th.setAttribute("aria-sort", "none");
				th.setAttribute("tabindex", "0");
				th.insertAdjacentHTML("beforeend", ICON_SORT_NONE);
				th.addEventListener("click", () => this.sort(th.dataset.col));
				th.addEventListener("keydown", (e) => {
					if (e.key === "Enter" || e.key === " ") {
						e.preventDefault();
						this.sort(th.dataset.col);
					}
				});
			});
		}
		_sortRows(col, dir, type) {
			const colIdx = this._getColIndex(col);
			if (colIdx < 0) return;
			const rows = [...this._allRows];
			rows.sort((a, b) => {
				const aVal = a.cells[colIdx]?.dataset.value ?? a.cells[colIdx]?.textContent.trim() ?? "";
				const bVal = b.cells[colIdx]?.dataset.value ?? b.cells[colIdx]?.textContent.trim() ?? "";
				let cmp = 0;
				if (type === "number") cmp = parseFloat(aVal) - parseFloat(bVal);
				else if (type === "date") cmp = new Date(aVal) - new Date(bVal);
				else cmp = aVal.localeCompare(bVal, void 0, {
					numeric: true,
					sensitivity: "base"
				});
				return dir === "asc" ? cmp : -cmp;
			});
			this._sortedRows = rows;
		}
		_updateSortHeaders() {
			this._thead.querySelectorAll("th[data-col]").forEach((th) => {
				const active = th.dataset.col === this._sortCol;
				th.classList.toggle("sort-asc", active && this._sortDir === "asc");
				th.classList.toggle("sort-desc", active && this._sortDir === "desc");
				const icon = th.querySelector(".th-sort-icon");
				if (icon) icon.outerHTML = active ? this._sortDir === "asc" ? ICON_SORT_ASC : ICON_SORT_DESC : ICON_SORT_NONE;
				th.setAttribute("aria-sort", active ? this._sortDir === "asc" ? "ascending" : "descending" : "none");
			});
		}
		_getColIndex(col) {
			return Array.from(this._thead.querySelectorAll("th")).findIndex((th) => th.dataset.col === col);
		}
		_initSearch(inputRef) {
			let input;
			if (inputRef instanceof Element) input = inputRef;
			else if (typeof inputRef === "string") input = document.getElementById(inputRef) || document.querySelector(inputRef);
			else {
				const refId = this._container.dataset.searchInput;
				input = refId ? document.getElementById(refId) || document.querySelector(`[data-table-search="${this._id}"]`) : this._container.querySelector("[data-table-search]");
			}
			if (!input) return;
			this._searchInput = input;
			const doSearch = debounce((q) => this.search(q), 250);
			input.addEventListener("input", () => doSearch(input.value));
			const clearBtn = input.parentElement?.querySelector("[data-search-clear]");
			if (clearBtn) clearBtn.addEventListener("click", () => {
				input.value = "";
				this.search("");
			});
		}
		_initPageSizeSelect(selectRef) {
			let selectEl;
			if (selectRef instanceof Element) selectEl = selectRef;
			else if (typeof selectRef === "string") selectEl = document.getElementById(selectRef) || document.querySelector(selectRef);
			else {
				const refId = this._container.dataset.pageSizeSelectId;
				selectEl = refId ? document.getElementById(refId) : this._container.querySelector("[data-page-size-select]");
			}
			if (!selectEl) return;
			selectEl.value = String(this._pageSize);
			selectEl.addEventListener("change", () => {
				this._pageSize = Number(selectEl.value) || 10;
				this._page = 1;
				this._render();
			});
		}
		_initBulkBar() {
			this._bulkBar = this._container.querySelector(".table-bulk-bar");
			if (!this._bulkBar) return;
			this._bulkCountEl = this._bulkBar.querySelector(".table-bulk-count");
			this._bulkBar.querySelectorAll("[data-bulk-action]").forEach((btn) => {
				btn.addEventListener("click", () => {
					emit(this._container, "table:bulk", {
						action: btn.dataset.bulkAction,
						selected: this.selectedRows,
						table: this
					});
					this._onBulk?.({
						action: btn.dataset.bulkAction,
						selected: this.selectedRows,
						table: this
					});
				});
			});
			const dismiss = this._bulkBar.querySelector("[data-bulk-dismiss]");
			if (dismiss) dismiss.addEventListener("click", () => this.deselectAll());
			this._updateBulkBar();
		}
		_updateBulkBar() {
			if (!this._bulkBar) return;
			const n = this._selected.size;
			this._bulkBar.hidden = n === 0;
			if (this._bulkCountEl) this._bulkCountEl.textContent = `${n} baris dipilih`;
		}
		_initSelection() {
			this._table.classList.add("table-selectable");
			const selectAllCb = this._thead.querySelector("input[type=\"checkbox\"][data-select-all]");
			if (selectAllCb) selectAllCb.addEventListener("change", () => {
				selectAllCb.checked ? this.selectAll() : this.deselectAll();
			});
			this._rebindRowCheckboxes();
			this._tbody.addEventListener("click", (e) => {
				if (e.target.closest("input, button, a, [data-no-select]")) return;
				const row = e.target.closest("tr");
				if (!row || row.classList.contains("tr-expand-row") || row.classList.contains("tr-skeleton") || row.classList.contains("tr-empty")) return;
				this._selected.has(row) ? this.deselectRow(row) : this.selectRow(row);
			});
		}
		_rebindRowCheckboxes() {
			$$("input[type=\"checkbox\"][data-row-check]", this._tbody).forEach((cb) => {
				cb.addEventListener("change", () => {
					const row = cb.closest("tr");
					if (!row) return;
					cb.checked ? this.selectRow(row) : this.deselectRow(row);
				});
			});
		}
		_deselect(row, silent) {
			row.classList.remove("selected");
			row.setAttribute("aria-selected", "false");
			this._selected.delete(row);
			const cb = row.querySelector("input[type=\"checkbox\"][data-row-check]");
			if (cb) cb.checked = false;
			if (!silent) {
				this._updateSelectAll();
				this._updateBulkBar();
			}
		}
		_updateSelectAll() {
			const cb = this._thead.querySelector("input[type=\"checkbox\"][data-select-all]");
			if (!cb) return;
			const visible = this._getVisibleRows();
			const allSel = visible.length > 0 && visible.every((r) => this._selected.has(r));
			const someSel = visible.some((r) => this._selected.has(r));
			cb.checked = allSel;
			cb.indeterminate = !allSel && someSel;
		}
		_getVisibleRows() {
			return Array.from(this._tbody.querySelectorAll("tr:not([hidden]):not(.tr-skeleton):not(.tr-empty):not(.tr-expand-row)"));
		}
		_resolveRow(target) {
			if (target instanceof Element) return target;
			if (typeof target === "number") return this._allRows[target] || null;
			return null;
		}
		_initRowExpand() {
			this._tbody.addEventListener("click", (e) => {
				const btn = e.target.closest("[data-expand-btn]");
				if (!btn) return;
				e.stopPropagation();
				const row = btn.closest("tr");
				if (!row) return;
				const isExpanded = row.classList.toggle("tr-expanded");
				btn.setAttribute("aria-expanded", String(isExpanded));
				let expandRow = row.nextElementSibling;
				if (expandRow && expandRow.classList.contains("tr-expand-row")) {
					expandRow.hidden = !isExpanded;
					return;
				}
				const content = row.dataset.expandContent;
				if (!content) return;
				expandRow = document.createElement("tr");
				expandRow.className = "tr-expand-row";
				expandRow.innerHTML = `<td colspan="${row.cells.length}" class="tr-expand-cell">${content}</td>`;
				expandRow.hidden = !isExpanded;
				row.after(expandRow);
			});
		}
		_createPager() {
			const el = document.createElement("div");
			el.className = "table-footer";
			this._container.appendChild(el);
			return el;
		}
		_renderPage(displayRows) {
			const total = Math.max(1, Math.ceil(displayRows.length / this._pageSize));
			this._page = Math.max(1, Math.min(this._page, total));
			const start = (this._page - 1) * this._pageSize;
			const end = Math.min(start + this._pageSize, displayRows.length);
			displayRows.slice(start, end).forEach((r) => {
				r.hidden = false;
				this._tbody.appendChild(r);
			});
			if (this._pagerEl) this._renderPagerUI(displayRows.length > 0 ? start + 1 : 0, end, displayRows.length, total);
		}
		_renderPagerUI(from, to, total, totalPages) {
			const el = this._pagerEl;
			const pages = this._pageNumbers(totalPages);
			el.innerHTML = `
            <span class="table-footer-info">
                Menampilkan <strong>${from}–${to}</strong> dari <strong>${total}</strong>
                ${!!this._searchQuery ? `<span class="table-filter-badge">terfilter</span>` : ""}
            </span>
            <div class="table-footer-pages">
                <button class="btn btn-ghost btn-sm" data-page-prev aria-label="Halaman sebelumnya"
                    ${this._page <= 1 ? "disabled" : ""}>${ICON_PREV}</button>
                ${pages.map((p) => p === "…" ? `<span class="table-page-ellipsis">…</span>` : `<button class="btn btn-sm ${p === this._page ? "btn-primary" : "btn-ghost"}"
                            data-page="${p}" aria-label="Halaman ${p}">${p}</button>`).join("")}
                <button class="btn btn-ghost btn-sm" data-page-next aria-label="Halaman berikutnya"
                    ${this._page >= totalPages ? "disabled" : ""}>${ICON_NEXT}</button>
            </div>
        `;
			el.querySelector("[data-page-prev]")?.addEventListener("click", () => this.prev());
			el.querySelector("[data-page-next]")?.addEventListener("click", () => this.next());
			el.querySelectorAll("[data-page]").forEach((btn) => {
				btn.addEventListener("click", () => this.goTo(Number(btn.dataset.page)));
			});
		}
		_pageNumbers(total) {
			if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
			const cur = this._page;
			if (cur <= 3) return [
				1,
				2,
				3,
				4,
				"…",
				total
			];
			if (cur >= total - 2) return [
				1,
				"…",
				total - 3,
				total - 2,
				total - 1,
				total
			];
			return [
				1,
				"…",
				cur - 1,
				cur,
				cur + 1,
				"…",
				total
			];
		}
		_checkEmpty(displayRows) {
			if (this._loading) return;
			const isEmpty = displayRows.length === 0;
			const existing = this._tbody.querySelector(".tr-empty");
			if (isEmpty && !existing) {
				const cols = this._thead.querySelectorAll("th").length || 1;
				const tr = document.createElement("tr");
				tr.className = "tr-empty";
				tr.innerHTML = `<td colspan="${cols}">
                <span class="empty-icon">${this._emptyIcon}</span>
                <div class="empty-title">${this._emptyMessage}</div>
                ${this._searchQuery ? `<div class="empty-desc">Tidak ditemukan hasil untuk "<em>${this._searchQuery}</em>"</div>` : ""}
            </td>`;
				this._tbody.appendChild(tr);
			} else if (!isEmpty && existing) existing.remove();
		}
		_restoreRows() {
			this._allRows.forEach((r) => {
				r.hidden = false;
				this._tbody.appendChild(r);
			});
		}
	};
	var _tables = /* @__PURE__ */ new Map();
	/**
	* Get or create a DataTable instance.
	* @param {string|Element} target
	* @param {Object} [options]
	* @returns {DataTable|null}
	*/
	function getTable(target, options) {
		const el = typeof target === "string" ? document.getElementById(target) || document.querySelector(target) : target;
		if (!el) return null;
		if (_tables.has(el)) return _tables.get(el);
		const instance = new DataTable(el, options);
		_tables.set(el, instance);
		return instance;
	}
	register("[data-table]", (el) => {
		getTable(el, {
			sortable: el.dataset.sortable !== "false",
			selectable: el.dataset.selectable === "true",
			multiSelect: el.dataset.multiSelect !== "false",
			paginate: el.dataset.paginate === "true",
			pageSize: Number(el.dataset.pageSize) || 10,
			expandable: el.dataset.expandable === "true",
			sortCol: el.dataset.sortCol || null,
			sortDir: el.dataset.sortDir || "asc",
			emptyMessage: el.dataset.emptyMessage || void 0,
			emptyIcon: el.dataset.emptyIcon || void 0
		});
	});
	//#endregion
	//#region src/js/components/avatar.js
	var Avatar = class {
		/**
		* @param {Element} element - .avatar element
		* @param {Object} [options]
		* @param {string} [options.src] - Image URL
		* @param {string} [options.alt] - Alt text
		* @param {string} [options.initial] - Initial text (e.g., "JD")
		* @param {string} [options.status] - Status: online, offline, busy, away
		* @param {string} [options.variant] - Color variant: brand, success, warning, danger, info
		* @param {boolean} [options.circle] - Use circle shape
		* @param {Function} [options.onError] - Callback when image fails to load
		* @param {Function} [options.onLoad] - Callback when image loads
		*/
		constructor(element, options) {
			this._element = element;
			this._options = options || {};
			this._init();
		}
		/** Update avatar source */
		setSrc(src) {
			this._loadImage(src);
		}
		/** Update initial text */
		setInitial(initial) {
			this._element.textContent = initial;
			this._element.classList.add("avatar-initial");
		}
		/** Set status indicator */
		setStatus(status) {
			this._element.classList.remove("avatar-status-online", "avatar-status-offline", "avatar-status-busy", "avatar-status-away");
			if (status) this._element.classList.add("avatar-status", `avatar-status-${status}`);
		}
		/** Set variant color */
		setVariant(variant) {
			this._element.classList.remove("avatar-brand", "avatar-success", "avatar-warning", "avatar-danger", "avatar-info");
			if (variant) this._element.classList.add(`avatar-${variant}`);
		}
		_init() {
			const opts = this._options;
			const el = this._element;
			const src = opts.src || el.dataset.src || null;
			const initial = opts.initial || el.dataset.initial || "";
			const alt = opts.alt || el.dataset.alt || "";
			const status = opts.status || el.dataset.status || null;
			const variant = opts.variant || el.dataset.variant || null;
			if (opts.circle !== void 0 ? opts.circle : el.dataset.circle === "true") el.classList.add("avatar-circle");
			if (variant) el.classList.add(`avatar-${variant}`);
			if (status) el.classList.add("avatar-status", `avatar-status-${status}`);
			if (src) this._loadImage(src, alt);
			else if (initial) this._setInitial(initial);
			else this._showIconFallback();
		}
		_loadImage(src, alt = "") {
			const img = new Image();
			img.alt = alt;
			img.className = "avatar-image";
			img.onload = () => {
				this._element.innerHTML = "";
				this._element.appendChild(img);
				this._element.classList.remove("avatar-initial");
				emit(this._element, "avatar:load", {
					src,
					avatar: this
				});
				this._options.onLoad?.({
					src,
					avatar: this
				});
			};
			img.onerror = () => {
				const initial = this._options.initial || this._element.dataset.initial;
				if (initial) this._setInitial(initial);
				else this._showIconFallback();
				emit(this._element, "avatar:error", {
					src,
					avatar: this
				});
				this._options.onError?.({
					src,
					avatar: this
				});
			};
			img.src = src;
		}
		_setInitial(initial) {
			this._element.innerHTML = "";
			this._element.textContent = initial;
			this._element.classList.add("avatar-initial");
		}
		_showIconFallback() {
			this._element.innerHTML = "";
			const wrapper = document.createElement("div");
			wrapper.className = "avatar-icon";
			wrapper.innerHTML = `<svg class="avatar-icon-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>`;
			this._element.appendChild(wrapper);
		}
	};
	var AvatarGroup = class {
		/**
		* @param {Element} container - .avatar-group element
		* @param {Object} [options]
		* @param {number} [options.max=4] - Maximum visible avatars
		* @param {boolean} [options.overflow=true] - Show count for overflow
		* @param {string} [options.size] - Size: sm, md, lg, xl
		*/
		constructor(container, options) {
			const opts = options || {};
			this._container = container;
			this._max = opts.max || parseInt(container.dataset.max) || 4;
			this._overflow = opts.overflow !== void 0 ? opts.overflow : container.dataset.overflow !== "false";
			this._size = opts.size || container.dataset.size || null;
			this._init();
		}
		/** Get all avatars in the group */
		getAvatars() {
			return $$(".avatar", this._container);
		}
		_init() {
			const avatars = this.getAvatars();
			const total = avatars.length;
			if (this._size) this._container.classList.add(`avatar-group-${this._size}`);
			if (this._overflow && total > this._max) {
				const hidden = total - this._max;
				avatars.forEach((avatar, idx) => {
					if (idx >= this._max) avatar.style.display = "none";
				});
				this._createCountIndicator(hidden);
			}
		}
		_createCountIndicator(count) {
			const countEl = document.createElement("span");
			countEl.className = "avatar-group-count";
			countEl.textContent = `+${count}`;
			countEl.setAttribute("title", `${count} more`);
			this._container.appendChild(countEl);
		}
	};
	register(".avatar:not([data-avatar-group])", (el) => {
		if (el.dataset.avatarGroup === "false") return;
		new Avatar(el);
	});
	register(".avatar-group", (el) => new AvatarGroup(el));
	/**
	* Create avatar element programmatically
	* @param {Object} options
	* @returns {Element}
	*/
	function createAvatar(options = {}) {
		const { src, initial, size = "md", shape = "square", status, variant, alt = "" } = options;
		const avatar = document.createElement("div");
		avatar.className = `avatar avatar-${size} avatar-${shape}`;
		if (src) avatar.dataset.src = src;
		if (initial) avatar.dataset.initial = initial;
		if (alt) avatar.dataset.alt = alt;
		if (status) avatar.dataset.status = status;
		if (variant) avatar.dataset.variant = variant;
		new Avatar(avatar, options);
		return avatar;
	}
	/**
	* Create avatar group element
	* @param {Array<Object>} avatars - Array of avatar options
	* @param {Object} options
	* @returns {Element}
	*/
	function createAvatarGroup(avatars = [], options = {}) {
		const { size = "md", max = 4 } = options;
		const group = document.createElement("div");
		group.className = `avatar-group avatar-group-${size}`;
		group.dataset.max = max;
		avatars.forEach((avatarOptions) => {
			const avatar = createAvatar(avatarOptions);
			group.appendChild(avatar);
		});
		new AvatarGroup(group, options);
		return group;
	}
	//#endregion
	exports.$ = $;
	exports.$$ = $$;
	exports.Accordion = Accordion;
	exports.Avatar = Avatar;
	exports.AvatarGroup = AvatarGroup;
	exports.CharCounter = CharCounter;
	exports.DataTable = DataTable;
	exports.Drawer = Drawer;
	exports.Dropdown = Dropdown;
	exports.FondasiTheme = FondasiTheme;
	exports.Modal = Modal;
	exports.MultiSearchSelect = MultiSearchSelect;
	exports.PasswordToggle = PasswordToggle;
	exports.SearchSelect = SearchSelect;
	exports.Sidebar = Sidebar;
	exports.THEMES = THEMES;
	exports.Tabs = Tabs;
	exports.ToastManager = ToastManager;
	exports.bus = bus;
	exports.charCounter = charCounter;
	exports.clearFormErrors = clearFormErrors;
	exports.closest = closest;
	exports.createAvatar = createAvatar;
	exports.createAvatarGroup = createAvatarGroup;
	exports.debounce = debounce;
	exports.delegate = delegate;
	exports.dialog = dialog;
	exports.el = el;
	exports.emit = emit;
	exports.esc = esc;
	exports.getDrawer = getDrawer;
	exports.getDropdown = getDropdown;
	exports.getModal = getModal;
	exports.getMultiSearchSelect = getMultiSearchSelect;
	exports.getSearchSelect = getSearchSelect;
	exports.getSidebar = getSidebar;
	exports.getTable = getTable;
	exports.getTheme = getTheme;
	exports.getToast = getToast;
	exports.initComponents = initComponents;
	exports.on = on;
	exports.passwordToggle = passwordToggle;
	exports.register = register;
	exports.setFieldError = setFieldError;
	exports.theme = FondasiTheme;
	exports.trapFocus = trapFocus;
	exports.uid = uid;
	exports.validateField = validateField;
	exports.validateForm = validateForm;
});
