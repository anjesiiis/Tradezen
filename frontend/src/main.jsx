import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'

// Aplica o tema salvo antes do primeiro render: os skeletons (e depois a
// tela de verdade) já nascem na cor certa, sem piscar escuro → claro.
try {
  document.documentElement.setAttribute('data-theme', localStorage.getItem('tradezen-tema') || 'dark')
} catch {
  // localStorage bloqueado (modo privado, etc.): fica o tema escuro padrão
}

// O ErrorBoundary vem por fora do App inteiro: erro em qualquer tela
// mostra a mensagem em vez de apagar o site. Fica DENTRO do StrictMode
// pra valer igual em dev e em produção.
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
