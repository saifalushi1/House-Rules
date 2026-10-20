import { defineConfig } from 'vite';
export default defineConfig({build:{rollupOptions:{output:{manualChunks:{three:['three']}}}},server:{host:'0.0.0.0',port:5173,proxy:{'/music':{target:'http://127.0.0.1:3000'},'/ws':{target:'ws://127.0.0.1:3000',ws:true}}}});
