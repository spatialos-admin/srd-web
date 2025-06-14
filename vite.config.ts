import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: '/srd-web/', // ✅ Use your repo name here
  plugins: [react()],
});
