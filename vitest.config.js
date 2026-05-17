import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
    test: {
        environment: 'jsdom',
        globals: true,
        setupFiles: ['./tests/setup.js'],
        include: ['tests/**/*.test.js'],
        coverage: {
            provider: 'v8',
            reporter: ['text', 'json', 'html'],
            exclude: [
                'tests/**',
                'node_modules/**',
                'dist/**',
                '**/*.config.js',
            ],
        },
    },
    resolve: {
        alias: {
            '@': resolve(__dirname, 'src'),
            '@js': resolve(__dirname, 'src/js'),
            '@scss': resolve(__dirname, 'src/scss'),
            '@components': resolve(__dirname, 'src/js/components'),
            '@core': resolve(__dirname, 'src/js/core'),
        },
    },
});