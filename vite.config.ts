import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { viteStaticCopy } from 'vite-plugin-static-copy';

const isCapacitor = process.env.CAPACITOR_BUILD === 'true';
const base = isCapacitor ? './' : '/golf-website/';

export default defineConfig({
  base,
  server: {
    proxy: {
      // Proxy Golf Intelligence API calls to avoid CORS in dev/browser.
      // In the native Capacitor iOS build, fetch goes through the native
      // layer and doesn't need a proxy.
      '/gi-api': {
        target: 'https://api.golfintelligence.com',
        changeOrigin: true,
        rewrite: path => path.replace(/^\/gi-api/, ''),
      },
      // Proxy GI's CloudFront image CDN so canvas.getImageData() can read
      // pixel colors. The image loads from same-origin (/cf-img/…) so the
      // canvas is never tainted — no crossOrigin attribute needed.
      '/cf-img': {
        target: 'https://d12k1qhoidj8cp.cloudfront.net',
        changeOrigin: true,
        rewrite: path => path.replace(/^\/cf-img/, ''),
      },
    },
  },
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
