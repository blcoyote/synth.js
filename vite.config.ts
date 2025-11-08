import { defineConfig } from 'vite';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import react from '@vitejs/plugin-react';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default defineConfig({
  plugins: [react()],
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
        'synth-v2': resolve(__dirname, 'synth-v2.html'),
        oscillators: resolve(__dirname, 'oscillators.html'),
        filters: resolve(__dirname, 'filters.html'),
        effects: resolve(__dirname, 'effects.html'),
        modulation: resolve(__dirname, 'modulation.html'),
        arpeggiator: resolve(__dirname, 'arpeggiator.html'),
        sequencer: resolve(__dirname, 'sequencer.html'),
      },
    },
  },
});
