/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { Modal, getModal } from '../../src/js/components/modal.js';

describe('Modal', () => {
    let modal;
    let overlay;

    beforeEach(() => {
        document.body.innerHTML = `
            <div class="modal-overlay" id="test-modal" hidden>
                <div class="modal">
                    <div class="modal-header">
                        <h3>Test Modal</h3>
                        <button data-modal-close>Close</button>
                    </div>
                    <div class="modal-body">
                        <p>Modal content</p>
                    </div>
                    <div class="modal-footer">
                        <button data-modal-close>Cancel</button>
                        <button data-modal-close>Confirm</button>
                    </div>
                </div>
            </div>
        `;
        overlay = document.getElementById('test-modal');
        modal = new Modal(overlay);
    });

    afterEach(() => {
        if (modal && modal.isOpen) {
            modal.close();
        }
        document.querySelectorAll('.modal-overlay').forEach(el => el.remove());
        document.body.classList.remove('modal-open');
    });

    describe('constructor', () => {
        it('should create modal instance', () => {
            expect(modal).toBeDefined();
            expect(modal.isOpen).toBe(false);
        });

        it('should set id on overlay', () => {
            expect(overlay.id).toBeTruthy();
        });

        it('should bind close buttons', () => {
            const closeBtn = overlay.querySelector('[data-modal-close]');
            expect(closeBtn).not.toBeNull();
        });
    });

    describe('open', () => {
        it('should open modal', () => {
            modal.open();
            expect(modal.isOpen).toBe(true);
        });

        it('should remove hidden attribute', () => {
            modal.open();
            expect(overlay.hasAttribute('hidden')).toBe(false);
        });

        it('should set aria-hidden to false', () => {
            modal.open();
            expect(overlay.getAttribute('aria-hidden')).toBe('false');
        });

        it('should add open class', () => {
            modal.open();
            expect(overlay.classList.contains('modal-overlay-open')).toBe(true);
        });

        it('should add modal-open to body', () => {
            modal.open();
            expect(document.body.classList.contains('modal-open')).toBe(true);
        });

        it('should add keydown listener', () => {
            modal.open();
            // Modal should have added keydown listener
            expect(modal.isOpen).toBe(true);
        });
    });

    describe('close', () => {
        beforeEach(() => {
            modal.open();
        });

        it('should close modal', () => {
            modal.close();
            expect(modal.isOpen).toBe(false);
        });

        it('should add hidden attribute', () => {
            modal.close();
            expect(overlay.hasAttribute('hidden')).toBe(true);
        });

        it('should remove open class', () => {
            modal.close();
            expect(overlay.classList.contains('modal-overlay-open')).toBe(false);
        });

        it('should remove modal-open from body', () => {
            modal.close();
            expect(document.body.classList.contains('modal-open')).toBe(false);
        });
    });

    describe('toggle', () => {
        it('should open when closed', () => {
            modal.toggle();
            expect(modal.isOpen).toBe(true);
        });

        it('should close when open', () => {
            modal.open();
            modal.toggle();
            expect(modal.isOpen).toBe(false);
        });
    });

    describe('keyboard', () => {
        it('should close on Escape when closeOnEsc is true', () => {
            modal.open();
            const event = new KeyboardEvent('keydown', { key: 'Escape' });
            document.dispatchEvent(event);
            expect(modal.isOpen).toBe(false);
        });

        it('should not close on Escape when closeOnEsc is false', () => {
            const m = new Modal(overlay, { closeOnEsc: false });
            m.open();
            const event = new KeyboardEvent('keydown', { key: 'Escape' });
            document.dispatchEvent(event);
            expect(m.isOpen).toBe(true);
        });
    });

    describe('overlay click', () => {
        it('should close when clicking overlay', () => {
            modal.open();
            overlay.click();
            expect(modal.isOpen).toBe(false);
        });

        it('should not close when clicking modal content', () => {
            modal.open();
            const modalContent = overlay.querySelector('.modal');
            modalContent.click();
            expect(modal.isOpen).toBe(true);
        });

        it('should not close when closeOnOverlay is false', () => {
            const m = new Modal(overlay, { closeOnOverlay: false });
            m.open();
            overlay.click();
            expect(m.isOpen).toBe(true);
        });
    });
});

describe('getModal', () => {
    beforeEach(() => {
        document.body.innerHTML = `
            <div class="modal-overlay" id="test-modal-1" hidden>
                <div class="modal">Content</div>
            </div>
        `;
    });

    afterEach(() => {
        document.querySelectorAll('.modal-overlay').forEach(el => el.remove());
    });

    it('should create modal from element', () => {
        const el = document.getElementById('test-modal-1');
        const modal = getModal(el);
        expect(modal).toBeInstanceOf(Modal);
    });

    it('should create modal from id string', () => {
        const modal = getModal('test-modal-1');
        expect(modal).toBeInstanceOf(Modal);
    });

    it('should return null for invalid target', () => {
        expect(getModal('nonexistent')).toBeNull();
    });

    it('should return cached instance', () => {
        const el = document.getElementById('test-modal-1');
        const modal1 = getModal(el);
        const modal2 = getModal(el);
        expect(modal1).toBe(modal2);
    });

    it('should accept options', () => {
        const el = document.getElementById('test-modal-1');
        const modal = getModal(el, { closeOnOverlay: false });
        expect(modal).toBeInstanceOf(Modal);
    });
});