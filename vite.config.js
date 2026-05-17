import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig(({ mode }) => ({
    build: {
        lib: {
            entry: resolve(__dirname, 'src/js/index.js'),
            name: 'Fondasi',
            formats: ['umd'],
            fileName: () => mode === 'minify' ? 'fondasi.min.js' : 'fondasi.js',
        },
        rollupOptions: {
            output: { exports: 'named' },
        },
        outDir: 'dist',
        emptyOutDir: mode !== 'minify',
        sourcemap: false,
        minify: mode === 'minify' ? 'oxc' : false,
        cssCodeSplit: false,
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
}));