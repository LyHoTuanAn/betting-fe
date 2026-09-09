import {defineConfig} from 'vite';
import {resolve} from 'node:path';
import react from '@vitejs/plugin-react';

/** Ở bản build, nginx đã map /admin sang admin.html; plugin này lo phần dev. */
const adminAlias = {
  name: 'admin-alias',
  configureServer(server) {
    server.middlewares.use((req, _res, next) => {
      if (req.url === '/admin' || req.url === '/admin/') req.url = '/admin.html';
      next();
    });
  }
};

export default defineConfig({
  plugins: [react(), adminAlias],
  build: {
    // Hai entry riêng: code trang quản trị không bao giờ đi vào bundle mà
    // người chơi tải về, dù cả hai vẫn dùng chung node_modules và một lần build.
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        admin: resolve(__dirname, 'admin.html')
      }
    }
  },
  server: {
    host: '0.0.0.0',
    // Cloudflare Tunnel serves the app from a random *.trycloudflare.com host.
    allowedHosts: ['.trycloudflare.com'],
    proxy: {
      '/api': { target: 'http://localhost:3000', changeOrigin: true },
      // Fish game realtime room; needs ws:true or the upgrade never reaches the API.
      '/ws': { target: 'ws://localhost:3000', ws: true, changeOrigin: true }
    }
  }
});
