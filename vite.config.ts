import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

// `vite build --mode single` genera un único HTML autocontenido (Jugar.html),
// que se abre con doble clic sin servidor ni instalación.
export default defineConfig(({ mode }) => {
  const single = mode === 'single';
  return {
    base: './',
    plugins: single ? [viteSingleFile()] : [],
    publicDir: single ? false : 'public',
    build: {
      target: 'es2022',
      chunkSizeWarningLimit: 4000,
      assetsInlineLimit: single ? 100_000_000 : 0,
      outDir: single ? 'dist-single' : 'dist',
    },
    server: { port: 5173 },
  };
});
