import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { viteStaticCopy } from 'vite-plugin-static-copy';

const isCapacitor = process.env.CAPACITOR_BUILD === 'true';
const base = isCapacitor ? './' : '/golf-website/';

export default defineConfig({
  base,
  plugins: [
    react(),
    viteStaticCopy({
      targets: [{ src: 'images', dest: '.' }],
    }),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'ZeroBreak',
        short_name: 'ZeroBreak',
        start_url: base,
        scope: base,
        display: 'standalone',
        background_color: '#0e1b3d',
        theme_color: '#0e1b3d',
        icons: [
          { src: 'images/logo.png', sizes: 'any', type: 'image/png' },
        ],
      },
    }),
  ],
});
