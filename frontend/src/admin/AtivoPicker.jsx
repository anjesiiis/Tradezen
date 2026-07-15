import { useEffect, useRef, useState } from "react";
import { fetchAtivos } from "./adminApi";

const MKTC = { "B3": "#009C3B", "CRIPTO": "#F7931A", "FOREX": "#3D7EFF", "NASDAQ": "#9B6DFF", "NYSE": "#E8B84B", "COMMODITY": "#F5A623", "INDICE": "#8B949E" };
const MERCADOS_ORDEM = ["INDICE", "B3", "CRIPTO", "FOREX", "NASDAQ", "NYSE", "COMMODITY"];

// Seletor de ticker agrupado por mercado — substitui o campo de texto livre.
// Só clica: sem digitar, sem decorar ticker.
export default function AtivoPicker({ value, onChange }) {
  const [ativos, setAtivos] = useState([]);
  const [open, setOpen] = useState(false);
  const boxRef = useRef(null);

  useEffect(() => {
    fetchAtivos().then((d) => setAtivos(d.ativos || [])).catch(() => setAtivos([]));
  }, []);

  useEffect(() => {
    const click = (e) => { if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", click);
    return () => document.removeEventListener("mousedown", click);
  }, []);

  const grupos = MERCADOS_ORDEM
    .map((m) => ({ mercado: m, ativos: ativos.filter((a) => a.mercado === m) }))
    .filter((g) => g.ativos.length > 0);

  const selecionado = ativos.find((a) => a.ticker === value);

  return (
    <div className="admin-picker" ref={boxRef}>
      <button type="button" className="admin-picker-btn" onClick={() => setOpen((o) => !o)}>
        {selecionado ? `${selecionado.simbolo} — ${selecionado.nome}` : (value || <span className="ph">Selecionar ativo</span>)}
        <span style={{ color: "var(--text3)" }}>▾</span>
      </button>
      {open && grupos.length > 0 && (
        <div className="admin-picker-dd">
          {grupos.map((g) => (
            <div key={g.mercado}>
              <div className="admin-picker-group" style={{ color: MKTC[g.mercado] || "#5A7299" }}>{g.mercado}</div>
              {g.ativos.map((a) => (
                <div
                  key={a.ticker}
                  className="admin-picker-item"
                  onClick={() => { onChange(a.ticker); setOpen(false); }}
                >
                  <span style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                    <span style={{ fontWeight: 600, color: "var(--text)", fontSize: 12 }}>{a.simbolo}</span>
                    <span style={{ fontSize: 10, color: "var(--text2)" }}>{a.nome}</span>
                  </span>
                  <span style={{ fontSize: 9, color: "var(--text2)", fontFamily: "var(--font-m)" }}>{a.mercado}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
