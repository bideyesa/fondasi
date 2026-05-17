/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
    setFieldError,
    clearFormErrors,
    validateField,
    validateForm,
    charCounter,
    passwordToggle,
} from '../../src/js/components/form.js';
import { getSearchSelect } from '../../src/js/components/search-select.js';

describe('Form Components', () => {
    describe('setFieldError', () => {
        beforeEach(() => {
            document.body.innerHTML = `
                <form id="test-form">
                    <div class="form-group">
                        <input type="text" id="username" name="username">
                    </div>
                    <div class="form-group">
                        <input type="text" id="email" name="email">
                    </div>
                </form>
            `;
        });

        it('should set error class on field', () => {
            const input = document.getElementById('username');
            setFieldError(input, 'Username is required');
            expect(input.classList.contains('is-error') || input.classList.contains('form-input-error')).toBe(true);
        });

        it('should show error message', () => {
            const input = document.getElementById('username');
            setFieldError(input, 'Username is required');
            const errorEl = input.parentElement.querySelector('.form-error');
            expect(errorEl).not.toBeNull();
            expect(errorEl.textContent).toBe('Username is required');
        });

        it('should set aria-invalid', () => {
            const input = document.getElementById('username');
            setFieldError(input, 'Error');
            expect(input.getAttribute('aria-invalid')).toBe('true');
        });

        it('should clear previous error before setting new', () => {
            const input = document.getElementById('username');
            setFieldError(input, 'First error');
            setFieldError(input, 'Second error');
            const errors = input.parentElement.querySelectorAll('.form-error');
            expect(errors.length).toBe(1);
            expect(errors[0].textContent).toBe('Second error');
        });

        it('should accept message as null to clear error', () => {
            const input = document.getElementById('username');
            setFieldError(input, 'Error');
            setFieldError(input, null);
            expect(input.classList.contains('is-error') || input.classList.contains('form-input-error')).toBe(false);
        });
    });

    describe('clearFormErrors', () => {
        beforeEach(() => {
            document.body.innerHTML = `
                <form id="test-form">
                    <div class="form-group">
                        <input type="text" class="is-error" id="username" name="username">
                        <span class="form-error">Error</span>
                    </div>
                    <div class="form-group">
                        <input type="text" class="is-error" id="email" name="email">
                        <span class="form-error">Error</span>
                    </div>
                </form>
            `;
        });

        it('should clear all errors in form', () => {
            const form = document.getElementById('test-form');
            clearFormErrors(form);
            const inputs = form.querySelectorAll('.is-error, .form-input-error');
            expect(inputs.length).toBe(0);
        });

        it('should clear aria-invalid', () => {
            const form = document.getElementById('test-form');
            clearFormErrors(form);
            const inputs = form.querySelectorAll('[aria-invalid="true"]');
            expect(inputs.length).toBe(0);
        });
    });

    describe('validateField', () => {
        beforeEach(() => {
            document.body.innerHTML = `
                <form id="test-form">
                    <input type="text" id="username" required minlength="3" maxlength="20">
                    <input type="email" id="email" required>
                    <input type="text" id="optional">
                </form>
            `;
        });

        it('should validate required field - empty returns error string', () => {
            const input = document.getElementById('username');
            input.value = '';
            const result = validateField(input);
            // Returns error string if invalid, null if valid
            expect(typeof result === 'string').toBe(true);
        });

        it('should validate minlength', () => {
            const input = document.getElementById('username');
            input.value = 'ab';
            const result = validateField(input);
            expect(typeof result === 'string').toBe(true);
        });

        it('should validate maxlength', () => {
            const input = document.getElementById('username');
            input.value = '123456789012345678901'; // 21 chars
            const result = validateField(input);
            expect(typeof result === 'string').toBe(true);
        });

        it('should validate email format', () => {
            const input = document.getElementById('email');
            input.value = 'not-an-email';
            const result = validateField(input);
            expect(typeof result === 'string').toBe(true);
        });

        it('should accept valid email returns null', () => {
            const input = document.getElementById('email');
            input.value = 'test@example.com';
            const result = validateField(input);
            expect(result).toBeNull();
        });

        it('should pass for optional empty field returns null', () => {
            const input = document.getElementById('optional');
            input.value = '';
            const result = validateField(input);
            expect(result).toBeNull();
        });

        it('should validate valid input returns null', () => {
            const input = document.getElementById('username');
            input.value = 'validusername';
            const result = validateField(input);
            expect(result).toBeNull();
        });
    });

    describe('validateForm', () => {
        beforeEach(() => {
            document.body.innerHTML = `
                <form id="test-form">
                    <input type="text" name="username" required>
                    <input type="email" name="email" required>
                    <button type="submit">Submit</button>
                </form>
            `;
        });

        it('should return false for empty form', () => {
            const form = document.getElementById('test-form');
            const result = validateForm(form);
            expect(result).toBe(false);
        });

        it('should return true for valid form', () => {
            const form = document.getElementById('test-form');
            form.querySelector('[name="username"]').value = 'user';
            form.querySelector('[name="email"]').value = 'test@example.com';
            const result = validateForm(form);
            expect(result).toBe(true);
        });
    });

    describe('charCounter (factory)', () => {
        it('should create element', () => {
            const input = document.createElement('input');
            input.maxLength = 50;
            const instance = charCounter(input);
            expect(instance).toBeDefined();
        });
    });

    describe('passwordToggle (factory)', () => {
        it('should create instance', () => {
            const input = document.createElement('input');
            const btn = document.createElement('button');
            const instance = passwordToggle(input, btn);
            expect(instance).toBeDefined();
        });
    });

    describe('getSearchSelect (factory)', () => {
        it('should create instance', () => {
            const select = document.createElement('select');
            const instance = getSearchSelect(select);
            expect(instance).toBeDefined();
        });
    });
});