import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
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
