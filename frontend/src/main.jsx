import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// Aplica o tema salvo antes do primeiro render: os skeletons (e depois a
// tela de verdade) já nascem na cor certa, sem piscar escuro → claro.
try {
  document.documentElement.setAttribute('data-theme', localStorage.getItem('tradezen-tema') || 'dark')
} catch {
  // localStorage bloqueado (modo privado, etc.): fica o tema escuro padrão
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
