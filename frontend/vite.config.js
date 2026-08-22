import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Permite acessar o dev server por um domínio externo (túnel cloudflared
  // pra testar no celular fora da rede local) — sem isso o Vite rejeita
  // qualquer Host header que não seja localhost/IP direto (proteção contra
  // DNS rebinding). Não afeta o build de produção, só o `vite dev`.
  server: {
    allowedHosts: [".trycloudflare.com"],
  },
})
