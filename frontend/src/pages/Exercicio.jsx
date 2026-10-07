import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CandleChart } from "../components/CandleChart.jsx";
import { SkeletonGraficoLinha } from "../components/Skeleton.jsx";
import { API } from "../lib/api.js";
import { exercicioPorId } from "../lib/detectores.js";

// Exercício de um padrão — por enquanto o esqueleto: nome do padrão, um
// gráfico de velas real e a instrução. A marcação dos pontos e a correção
// entram depois (vão usar as mesmas regras do admin, em admin/bandeira.js
// e admin/canal.js).
const ATIVO_PADRAO = "PETR4.SA";
const SEM_PADROES = [];
const SEM_NIVEIS = [];

export default function PaginaExercicio({ padraoId, tema = "dark" }) {
  const navigate = useNavigate();
  const padrao = exercicioPorId(padraoId);
  const [candles, setCandles] = useState(null);
  const semFerramentas = useMemo(() => new Set(), []);

  useEffect(() => {
    let vivo = true;
    fetch(`${API}/ativo/${encodeURIComponent(ATIVO_PADRAO)}?periodo=1y&intervalo=1d`)
      .then((r) => r.json())
      .then((d) => { if (vivo) setCandles(d?.candles || []); })
      .catch(() => { if (vivo) setCandles([]); });
    return () => { vivo = false; };
  }, []);

  if (!padrao) {
    return (
      <div className="det-exercicio-tela">
        <p className="det-vazio">Esse exercício não existe.</p>
        <button type="button" className="det-btn" onClick={() => navigate("/detectores")}>Voltar</button>
      </div>
    );
  }

  return (
    <>
      <div className="det-so-desktop">
        Os detectores são uma tela de desktop — abra num computador para usar.
      </div>

      <div className="det-exercicio-tela">
        <header className="det-exercicio-topo">
          <button type="button" className="det-btn-voltar" onClick={() => navigate("/detectores")}>← Detectores</button>
          <h1>{padrao.nome}</h1>
          <span className="det-exercicio-ativo">{ATIVO_PADRAO.replace(".SA", "")} · diário</span>
        </header>

        <p className="det-exercicio-instrucao">Identifique e marque os pontos-chave deste padrão</p>

        <div className="card det-exercicio-grafico">
          {candles === null && <SkeletonGraficoLinha />}
          {candles?.length > 0 && (
            // O CandleChart é o mesmo da tela de análise, que vem com
            // indicadores e ferramentas de desenho. Aqui ele entra pelado:
            // `activeTools` vazio (ele conta com um Set, não com undefined)
            // e nenhum padrão desenhado — a marcação do exercício vem
            // depois.
            <CandleChart
              candles={candles}
              padroes={SEM_PADROES}
              niveis={SEM_NIVEIS}
              activeTools={semFerramentas}
              selPat={null}
              setSelPat={() => {}}
              showVolume={false}
              tema={tema}
            />
          )}
          {candles?.length === 0 && <p className="det-vazio">Não foi possível carregar o gráfico agora.</p>}
        </div>

        <div className="det-exercicio-acoes">
          <button type="button" className="det-btn" onClick={() => navigate("/detectores")}>Próximo</button>
        </div>
      </div>
    </>
  );
}
