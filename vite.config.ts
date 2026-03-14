import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig(async () => {
    const isElectron = process.env.ELECTRON === '1';

    const electronPlugins = [];
    if (isElectron) {
        const { default: electron } = await import('vite-plugin-electron');
        electronPlugins.push(...electron([
            {
                entry: 'electron/main.ts',
                vite: {
                    build: {
                        outDir: 'dist-electron',
                        sourcemap: true,
                        rollupOptions: { external: ['electron', 'mongoose', 'dotenv'] },
                    },
                },
            },
            {
                entry: 'electron/preload.ts',
                onstart(options: { reload: () => void }) { options.reload(); },
                vite: {
                    build: {
                        outDir: 'dist-electron',
                        sourcemap: true,
                        rollupOptions: { external: ['electron'] },
                    },
                },
            },
        ]));
    }

    return {
        plugins: [react(), ...electronPlugins],
        base: './',
        resolve: {
            alias: {
                '@': path.resolve(__dirname, './src'),
            },
        },
        server: {
            port: 5173,
        },
        build: {
            outDir: 'dist',
        },
    };
});
