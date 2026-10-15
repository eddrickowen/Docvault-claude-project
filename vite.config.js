import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    // Output directly to the folder PocketBase serves as static files.
    // Running `npm run build` always keeps :8090 in sync with the latest code.
    outDir: 'pocketbase/pb_public',
    // Don't wipe the whole folder — PocketBase stores its own files here.
    emptyOutDir: false,
  },
})
