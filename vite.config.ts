import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
// base './' → rutas relativas, necesarias para que la app funcione empaquetada
// en Electron (se carga vía file://, no desde un servidor con raíz '/').
export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss()],
})
