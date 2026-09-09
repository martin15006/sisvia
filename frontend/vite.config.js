import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // host: true expone el servidor a la red local (no solo localhost).
    // Permite acceder desde celular u otro dispositivo en el mismo wifi:
    //   http://<IP_DEL_PC>:5173
    host: true,
    port: 5173,
    // HMR (hot module replacement) explicito: hace que el WebSocket use el mismo
    // hostname desde donde se accede (localhost o IP de red). Sin esto, al activar
    // host:true el cliente intenta conectar a un hostname incorrecto y falla.
    hmr: {
      // clientPort 5173 fuerza al cliente a usar el mismo puerto del server
      clientPort: 5173,
    },
  },
})
