import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

// Göreli yollar: proje hangi klasöre taşınırsa taşınsın çalışır.
export default defineConfig({
  base: './',
  plugins: [viteSingleFile()],
  build: { outDir: 'dist', emptyOutDir: true, chunkSizeWarningLimit: 4000 },
});
