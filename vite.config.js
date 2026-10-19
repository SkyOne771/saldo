import { defineConfig } from 'vite';
export default defineConfig({
  base: process.env.SALDO_BASE_PATH || '/',
  server: { host: '0.0.0.0', hmr: { port: Number(process.env.VITE_HMR_PORT) || 24678 } },
  build: { outDir: 'dist' },
});
