import { resolve } from 'path';
import { defineConfig } from 'vite';

export default defineConfig({
    build: {
        target: 'es2020',
        minify: 'esbuild',
        cssMinify: true,
        assetsInlineLimit: 4096,
        rollupOptions: {
            input: {
                main: resolve(__dirname, 'index.html'),
                apply: resolve(__dirname, 'apply/index.html'),
                admin: resolve(__dirname, 'admin/index.html'),
            },
        },
    },
});
