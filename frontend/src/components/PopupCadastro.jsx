import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext.jsx";

/**
 * TRADEZEN — CONVITE PRA CRIAR CONTA
 * ==================================
 *
 * Aparece depois de DOIS MINUTOS DE USO, não dois minutos de relógio: o
 * tempo só corre enquanto a pessoa está mexendo. Quem abriu a aba e foi
 * almoçar não volta pra um pop-up na cara, e quem passou dois minutos
 * desenhando já viu o suficiente pra que o convite faça sentido.
 *
 * Some por uma semana depois de fechado. Insistir todo dia com quem já
 * disse não é o caminho mais rápido pra pessoa fechar a aba.
 */

const TEMPO_DE_USO_MS = 2 * 60 * 1000;
const PAUSA_APOS_MS = 30 * 1000;        // 30s parado e o cronômetro para
const TIQUE_MS = 1000;
const DIAS_DE_DESCANSO = 7;
export const CHAVE_VISTO = "tradezen_popup_cadastro_visto";

// Onde ele não entra: nas telas que já são sobre conta (seria redundante)
// e no admin (que é ferramenta de trabalho, não vitrine).
const ROTAS_SEM_POPUP = [/^\/cadastro/, /^\/login/, /^\/admin/, /^\/recuperar-senha/, /^\/redefinir-senha/];

export function podeAparecer(pathname, agora = Date.now(), ler = lerVisto) {
  if (ROTAS_SEM_POPUP.some((r) => r.test(pathname))) return false;
  const visto = ler();
  if (!visto) return true;
  return agora - visto > DIAS_DE_DESCANSO * 24 * 60 * 60 * 1000;
}

function lerVisto() {
  try {
    const bruto = localStorage.getItem(CHAVE_VISTO);
    const t = bruto ? Date.parse(bruto) : NaN;
    return Number.isNaN(t) ? null : t;
  } catch {
    return null;   // storage bloqueado: trata como quem nunca viu
  }
}

function marcarVisto() {
  try { localStorage.setItem(CHAVE_VISTO, new Date().toISOString()); } catch { /* idem */ }
}

const BENEFICIOS = [
  "Salve seus estudos, desenhos e análises",
  "Suas cores e fontes salvas em qualquer dispositivo",
  "Watchlist personalizada com seus favoritos",
  "Notificação diária dos ativos favoritos",
];

export default function PopupCadastro() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [aberto, setAberto] = useState(false);
  const usoRef = useRef(0);
  const ultimoUsoRef = useRef(Date.now());

  useEffect(() => {
    if (loading || user || aberto) return;
    if (!podeAparecer(pathname)) return;

    const usou = () => { ultimoUsoRef.current = Date.now(); };
    const EVENTOS = ["pointerdown", "keydown", "wheel", "touchstart"];
    // passive: o navegador não precisa esperar a gente pra rolar a página —
    // é o que impede este contador de engasgar a rolagem do gráfico.
    for (const e of EVENTOS) window.addEventListener(e, usou, { passive: true });

    const relogio = setInterval(() => {
      // Aba atrás das outras não conta: ninguém está "usando" o site ali.
      if (document.visibilityState !== "visible") return;
      if (Date.now() - ultimoUsoRef.current > PAUSA_APOS_MS) return;
      usoRef.current += TIQUE_MS;
      if (usoRef.current >= TEMPO_DE_USO_MS) setAberto(true);
    }, TIQUE_MS);

    return () => {
      clearInterval(relogio);
      for (const e of EVENTOS) window.removeEventListener(e, usou);
    };
  }, [loading, user, aberto, pathname]);

  if (!aberto) return null;

  const fechar = () => { marcarVisto(); setAberto(false); };
  const irPara = (rota) => { fechar(); navigate(rota); };

  return (
    <div className="pc-fundo" onMouseDown={fechar} role="presentation">
      <div
        className="pc-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="pc-titulo"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <button className="pc-fechar" onClick={fechar} aria-label="Fechar">✕</button>

        <div className="pc-icone" aria-hidden="true">🚀</div>
        <h2 className="pc-titulo" id="pc-titulo">Gostando do TradeZen?</h2>
        <p className="pc-sub">Crie sua conta grátis e leve seu trabalho com você:</p>

        <ul className="pc-beneficios">
          {BENEFICIOS.map((b) => (
            <li key={b}><span className="pc-check" aria-hidden="true">✓</span>{b}</li>
          ))}
        </ul>

        <p className="pc-rapido">Leva 30 segundos, só com email.</p>

        <div className="pc-ctas">
          <button className="pc-btn pc-btn-pr" onClick={() => irPara("/cadastro")}>Criar conta grátis</button>
          <button className="pc-btn pc-btn-sec" onClick={fechar}>Agora não</button>
        </div>

        <p className="pc-login">
          Já tem conta? <button className="pc-link" onClick={() => irPara("/login")}>Entrar</button>
        </p>
      </div>
    </div>
  );
}
