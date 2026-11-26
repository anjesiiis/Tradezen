import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { visualizer } from 'rollup-plugin-visualizer'

// https://vite.dev/config/
export default defineConfig(({ command }) => ({
  // visualizer só no build: gera bundle-report.html (mapa do tamanho de
  // cada módulo dentro de cada chunk) pra achar o que pesa no bundle.
  plugins: [react(), command === 'build' && visualizer({ open: false, filename: 'bundle-report.html' })],
  // Permite acessar o dev server por um domínio externo (túnel cloudflared
  // pra testar no celular fora da rede local) — sem isso o Vite rejeita
  // qualquer Host header que não seja localhost/IP direto (proteção contra
  // DNS rebinding). Não afeta o build de produção, só o `vite dev`.
  server: {
    allowedHosts: [".trycloudflare.com"],
  },
  // Source map NUNCA em produção. Já era o padrão do Vite (medido: o
  // bundle no ar não tem sourceMappingURL), mas estava implícito — e um
  // `sourcemap: true` posto por engano publicaria o código original junto
  // do bundle, nomes de variável, comentários e tudo. Escrito aqui, a
  // escolha é deliberada e um teste a trava (test/viteConfig.test.js).
  build: {
    sourcemap: false,
  },
  // Testes (Vitest): jsdom simula o navegador; setup.js carrega os
  // matchers do jest-dom e os mocks globais (API, Supabase, gráficos).
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: "./src/test/setup.js",
    css: true,
  },
}))
