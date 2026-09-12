import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Deployed to GitHub Pages as a project site (https://<user>.github.io/id/),
// so assets must be requested under the /id/ subpath. Override with the
// BASE_PATH env var if you host it elsewhere (e.g. a custom domain -> '/').
export default defineConfig({
  plugins: [react()],
  base: process.env.BASE_PATH ?? '/id/',
})
