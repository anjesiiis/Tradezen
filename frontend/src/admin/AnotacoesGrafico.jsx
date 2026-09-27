import { useRef, useState } from "react";

// Anotações de texto soltas por cima do gráfico de marcação.
// São divs posicionados sobre o canvas — o TradingView não desenha texto
// livre. Ficam só nesta sessão (não vão pro Supabase): servem pra pensar em
// voz alta enquanto se marca ("aqui o volume seca", "rompeu e voltou").
//
// Cada anotação é ancorada em (candle, preço), e não em pixels: assim ela
// continua grudada no ponto certo do gráfico quando você rola ou dá zoom.

const LARGURA_PADRAO = 170;
const ALTURA_PADRAO = 44;
const MIN_LARGURA = 80;
const MIN_ALTURA = 30;

let sequencia = 0;
const novoId = () => `anotacao-${++sequencia}`;

export default function AnotacoesGrafico({
  modo,            // true = próximo clique no gráfico cria uma anotação
  aoSairDoModo,
  paraPixel,       // ({ i, preco }) => { x, y } | null
  paraAncora,      // (x, y) => { i, preco } | null
  versao,          // muda quando o gráfico rola/zoom: re-renderiza e as posições se recalculam
}) {
  void versao;
  const [anotacoes, setAnotacoes] = useState([]);
  const [editando, setEditando] = useState(null);
  const gestoRef = useRef(null);
  const areaRef = useRef(null);

  function criarAnotacao(evento) {
    if (!modo) return;
    const area = areaRef.current?.getBoundingClientRect();
    if (!area) return;
    const ancora = paraAncora(evento.clientX - area.left, evento.clientY - area.top);
    if (!ancora) return;

    const id = novoId();
    setAnotacoes((prev) => [...prev, { id, ancora, texto: "", largura: LARGURA_PADRAO, altura: ALTURA_PADRAO }]);
    setEditando(id);
    aoSairDoModo?.();
  }

  function atualizar(id, mudancas) {
    setAnotacoes((prev) => prev.map((a) => (a.id === id ? { ...a, ...mudancas } : a)));
  }

  function apagar(id) {
    setAnotacoes((prev) => prev.filter((a) => a.id !== id));
    if (editando === id) setEditando(null);
  }

  // ── Mover e redimensionar ───────────────────────────────────
  function iniciarGesto(evento, anotacao, tipo) {
    evento.preventDefault();
    evento.stopPropagation();
    const area = areaRef.current?.getBoundingClientRect();
    if (!area) return;
    gestoRef.current = {
      tipo,
      id: anotacao.id,
      inicioX: evento.clientX,
      inicioY: evento.clientY,
      largura: anotacao.largura,
      altura: anotacao.altura,
      area,
    };
    evento.currentTarget.setPointerCapture?.(evento.pointerId);
  }

  function moverGesto(evento) {
    const gesto = gestoRef.current;
    if (!gesto) return;

    if (gesto.tipo === "mover") {
      const ancora = paraAncora(evento.clientX - gesto.area.left, evento.clientY - gesto.area.top);
      if (ancora) atualizar(gesto.id, { ancora });
      return;
    }
    atualizar(gesto.id, {
      largura: Math.max(MIN_LARGURA, gesto.largura + (evento.clientX - gesto.inicioX)),
      altura: Math.max(MIN_ALTURA, gesto.altura + (evento.clientY - gesto.inicioY)),
    });
  }

  function encerrarGesto() {
    gestoRef.current = null;
  }

  return (
    <div
      ref={areaRef}
      className={`anotacoes${modo ? " anotacoes-modo" : ""}`}
      onClick={criarAnotacao}
      onPointerMove={moverGesto}
      onPointerUp={encerrarGesto}
      onPointerCancel={encerrarGesto}
    >
      {anotacoes.map((a) => {
        const pos = paraPixel(a.ancora);
        if (!pos) return null; // ficou fora da parte visível do gráfico
        const emEdicao = editando === a.id;
        return (
          <div
            key={a.id}
            className="anotacao"
            data-anotacao={a.id}
            style={{ left: pos.x, top: pos.y, width: a.largura, height: a.altura }}
            // clique DENTRO da anotação não pode criar outra por baixo dela
            onClick={(e) => e.stopPropagation()}
            onDoubleClick={() => setEditando(a.id)}
          >
            {emEdicao ? (
              <textarea
                autoFocus
                className="anotacao-campo"
                value={a.texto}
                placeholder="escreva aqui"
                onChange={(e) => atualizar(a.id, { texto: e.target.value })}
                onBlur={() => setEditando(null)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); setEditando(null); }
                  if (e.key === "Escape") { e.preventDefault(); setEditando(null); }
                }}
              />
            ) : (
              <div
                className="anotacao-texto"
                title="Duplo clique para editar · arraste para mover"
                onPointerDown={(e) => iniciarGesto(e, a, "mover")}
              >
                {a.texto || <span className="anotacao-vazia">duplo clique para escrever</span>}
              </div>
            )}

            <button className="anotacao-x" title="Excluir anotação" onClick={() => apagar(a.id)}>✕</button>
            <span
              className="anotacao-canto"
              title="Arraste para redimensionar"
              onPointerDown={(e) => iniciarGesto(e, a, "redimensionar")}
            />
          </div>
        );
      })}
    </div>
  );
}
