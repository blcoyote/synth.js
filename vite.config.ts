import { defineConfig } from 'vite';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default defineConfig({
  base: '/synth.js/',
  server: {
    port: 3000,
    open: true,
  },
  build: {
    target: 'esnext',
    outDir: 'dist',
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        synth: resolve(__dirname, 'synth.html'),
        oscillators: resolve(__dirname, 'oscillators.html'),
        filters: resolve(__dirname, 'filters.html'),
        effects: resolve(__dirname, 'effects.html'),
        modulation: resolve(__dirname, 'modulation.html'),
        arpeggiator: resolve(__dirname, 'arpeggiator.html'),
      },
    },
  },
});
