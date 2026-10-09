import { Link } from "react-router-dom";
const ADMIN_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;600&display=swap');

html,body,#root{height:100%;width:100%;margin:0;max-width:none!important;border-inline:none!important;text-align:left}

.admin-shell{
  --bg:#06080F; --s1:#0D1117; --s2:#161B22; --border:#21262D;
  --up:#00D68F; --down:#FF4560; --accent:#3D7EFF; --gold:#F5A623;
  --text:#E6EDF3; --text2:#5A7299; --text3:#8B949E;
  --font-h:'Bebas Neue',sans-serif; --font-b:'DM Sans',sans-serif; --font-m:'JetBrains Mono',monospace;
  --r:10px;
  min-height:100vh; width:100%; background:var(--bg); color:var(--text);
  font-family:var(--font-b); display:flex; flex-direction:column;
  box-sizing:border-box;
}
.admin-shell *,.admin-shell *::before,.admin-shell *::after{box-sizing:border-box}

/* altura automática: a navegação de padrões tem duas linhas */
.admin-header{min-height:56px;display:flex;align-items:center;justify-content:space-between;padding:6px 24px;border-bottom:1px solid var(--border);background:var(--s1);flex-shrink:0}
.admin-logo{font-family:var(--font-h);font-size:20px;letter-spacing:2px;color:#fff}
.notranslate{translate:no}
.admin-logo span{color:var(--accent)}
.admin-header-title{color:var(--text2);font-size:13px;margin-left:12px;white-space:nowrap}
.admin-link-btn{background:none;border:none;color:var(--text2);font-size:13px;cursor:pointer;font-family:var(--font-b)}
.admin-link-btn:hover{color:var(--text)}

.admin-center{flex:1;display:flex;align-items:center;justify-content:center;padding:24px}
.admin-main{flex:1;padding:24px;max-width:1500px;width:100%;margin:0 auto;display:flex;flex-direction:column;gap:20px}

.admin-card{background:var(--s1);border:1px solid var(--border);border-radius:var(--r);padding:20px;text-align:left}
.admin-card h1{font-size:17px;font-weight:600;margin:0 0 4px;color:var(--text)}
.admin-card h2{font-size:15px;font-weight:600;margin:0;color:var(--text)}
.admin-card p.hint{color:var(--text2);font-size:13px;margin:0 0 20px}

.admin-field{display:flex;flex-direction:column;gap:6px}
.admin-field label{font-size:11px;color:var(--text2)}
.admin-input,.admin-select{background:var(--s2);border:1px solid var(--border);border-radius:8px;padding:9px 12px;color:var(--text);font-size:13px;font-family:var(--font-b);outline:none}
.admin-input:focus,.admin-select:focus{border-color:var(--accent)}
.admin-input::placeholder{color:var(--text3)}

.admin-btn{background:var(--accent);color:#fff;border:none;border-radius:8px;padding:10px 16px;font-size:13px;font-weight:600;font-family:var(--font-b);cursor:pointer;transition:opacity .15s}
.admin-btn:hover{opacity:.9}
.admin-btn:disabled{opacity:.45;cursor:not-allowed}
.admin-btn-ghost{background:var(--s2);color:var(--text2);border:1px solid var(--border);border-radius:8px;padding:9px 14px;font-size:13px;font-family:var(--font-b);cursor:pointer}
.admin-btn-ghost:hover{color:var(--text)}

.admin-msg{font-size:13px;padding:10px 14px;border-radius:8px;border:1px solid}
/* Toast — avisos de validação da marcação (ex: pontos fora de ordem). Fica
   flutuando no canto pra não empurrar o gráfico pra baixo enquanto o
   usuário corrige os pontos. */
.admin-toast{position:fixed;right:20px;bottom:20px;z-index:400;max-width:min(420px,calc(100vw - 40px));display:flex;flex-direction:column;gap:8px}
.admin-toast-item{display:flex;align-items:flex-start;gap:10px;background:#1a1216;border:1px solid rgba(239,83,80,.45);border-left:3px solid #ef5350;color:var(--text);font-size:13px;line-height:1.45;padding:12px 14px;border-radius:10px;box-shadow:0 10px 30px rgba(0,0,0,.45)}
.admin-toast-item.ok{background:#101c18;border-color:rgba(38,166,154,.45);border-left-color:#26a69a}
.admin-toast-item.aviso{background:#1c1810;border-color:rgba(245,166,35,.45);border-left-color:#F5A623}
.admin-toast-x{background:none;border:none;color:var(--text3);cursor:pointer;font-size:14px;line-height:1;padding:0;margin-left:auto}
.admin-msg-ok{background:rgba(0,214,143,.08);border-color:rgba(0,214,143,.25);color:var(--up)}
.admin-msg-err{background:rgba(255,69,96,.08);border-color:rgba(255,69,96,.25);color:var(--down)}

.admin-chip{font-size:12px;padding:5px 10px;border-radius:8px;border:1px solid var(--border);background:transparent;color:var(--text3);cursor:pointer;font-family:var(--font-b)}
.admin-chip.active{border-color:#2962ff;color:#fff;background:#2962ff}
.admin-chip.filled{color:var(--text);background:var(--s2)}
.admin-chip .val{color:var(--text3);margin-left:4px}
/* Botão de ação da barra do gráfico (ex: 📝 Texto). Classe própria: a
   .admin-chip é só dos pontos do padrão. */
.admin-chip-acao{font-size:12px;padding:5px 10px;border-radius:8px;border:1px solid var(--border);background:transparent;color:var(--text3);cursor:pointer;font-family:var(--font-b)}
.admin-chip-acao:hover{color:var(--text)}
.admin-chip-acao.active{border-color:#2962ff;background:#2962ff;color:#fff}
/* 💡 dos templates já salvos: só o emoji, clicável — sem marcador do
   gráfico embaixo (a bolinha amarela saía junto e poluía o candle). */
.lampadas{position:absolute;inset:8px;pointer-events:none;z-index:6}
/* Área preenchida do padrão: por cima do canvas, sem roubar o clique */
.area-padrao{position:absolute;inset:8px;pointer-events:none;z-index:5;overflow:visible}
.lampada{position:absolute;transform:translate(-50%,-100%);pointer-events:auto;background:none;border:none;padding:2px;cursor:pointer;font-size:15px;line-height:1;filter:drop-shadow(0 1px 3px rgba(0,0,0,.6));transition:transform .12s}
.lampada:hover{transform:translate(-50%,-100%) scale(1.25)}
/* Anotações de texto por cima do gráfico (só durante a sessão) */
.anotacoes{position:absolute;inset:8px;pointer-events:none;z-index:5}
.anotacoes-modo{pointer-events:auto;cursor:text}
.anotacao{position:absolute;transform:translate(-4px,-50%);pointer-events:auto;background:rgba(13,17,23,.92);border:1px solid var(--border);border-radius:8px;display:flex;align-items:stretch;box-shadow:0 6px 18px rgba(0,0,0,.4)}
.anotacao-texto{flex:1;padding:7px 9px;font-size:12px;line-height:1.4;color:var(--text);overflow:auto;cursor:grab;white-space:pre-wrap;word-break:break-word}
.anotacao-texto:active{cursor:grabbing}
.anotacao-vazia{color:var(--text3);font-style:italic}
.anotacao-campo{flex:1;background:transparent;border:none;outline:none;resize:none;padding:7px 9px;font-size:12px;line-height:1.4;color:var(--text);font-family:var(--font-b)}
.anotacao-x{position:absolute;top:-8px;right:-8px;width:18px;height:18px;border-radius:50%;border:1px solid var(--border);background:var(--s2);color:var(--text3);font-size:10px;line-height:1;cursor:pointer;display:flex;align-items:center;justify-content:center;padding:0}
.anotacao-x:hover{color:#ef5350;border-color:rgba(239,83,80,.5)}
.anotacao-canto{position:absolute;right:-2px;bottom:-2px;width:12px;height:12px;cursor:nwse-resize;border-right:2px solid var(--text3);border-bottom:2px solid var(--text3);border-bottom-right-radius:6px;opacity:.7}
.admin-textarea{min-height:76px;resize:vertical;font-family:var(--font-b);line-height:1.5;width:100%}
/* Lista de marcações salvas — cards em vez de tabela: cabe a anotação
   inteira, que é o que interessa relembrar depois. */
.admin-cards{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:12px}
.admin-card-item{background:var(--s2);border:1px solid var(--border);border-radius:10px;padding:12px 14px;display:flex;flex-direction:column;gap:8px}
.admin-card-item header{display:flex;align-items:center;gap:8px}
.admin-card-item header strong{font-size:14px;color:var(--text)}
.admin-tag{font-size:10px;letter-spacing:.4px;text-transform:uppercase;color:var(--text2);border:1px solid var(--border);border-radius:999px;padding:2px 8px;margin-left:auto}
.admin-card-item dl{display:grid;grid-template-columns:1fr 1fr;gap:6px 12px;margin:0}
.admin-card-item dt{font-size:10px;text-transform:uppercase;letter-spacing:.4px;color:var(--text3);margin:0}
.admin-card-item dd{font-size:13px;color:var(--text);margin:0}
.admin-card-nota{font-size:12px;color:var(--text2);line-height:1.5;margin:0;border-left:2px solid var(--border);padding-left:8px}
.admin-card-item footer{display:flex;gap:10px;margin-top:2px}
.admin-chip-x{margin-left:6px;color:var(--text3);cursor:pointer;font-size:11px;line-height:1;padding:0 2px;border-radius:4px}
.admin-chip-x:hover{color:#ef5350;background:rgba(239,83,80,.14)}

.admin-table{width:100%;border-collapse:collapse;font-size:13px}
.admin-table th{text-align:left;color:var(--text2);font-size:11px;font-weight:500;padding:8px 12px;border-top:1px solid var(--border);border-bottom:1px solid var(--border)}
.admin-table td{padding:8px 12px;border-bottom:1px solid var(--border);color:var(--text)}
.admin-table td.muted{color:var(--text2)}
.action{background:none;border:0;padding:0;font:inherit;color:var(--accent);cursor:pointer;font-size:12px;margin-right:12px;text-decoration:none;user-select:none}
.action.danger{color:var(--down)}
.action:hover{text-decoration:underline}
.action:focus-visible{outline:2px solid var(--accent);outline-offset:2px;border-radius:4px}

.admin-row{display:flex;gap:12px;flex-wrap:wrap;align-items:flex-end}
.admin-grid2{display:grid;grid-template-columns:1fr 1fr;gap:12px}

.admin-nav-linhas{display:flex;flex-direction:column;gap:4px;margin-left:20px;min-width:0;flex:1}
.admin-nav{display:flex;gap:4px;overflow-x:auto;scrollbar-width:none}
.admin-nav::-webkit-scrollbar{display:none}
.admin-nav a{font-size:12px;padding:5px 10px;border-radius:6px;color:var(--text2);text-decoration:none;white-space:nowrap}
.admin-nav a:hover{color:var(--text)}
.admin-nav a.active{background:var(--s2);color:var(--text)}

.admin-picker{position:relative}
.admin-picker-btn{width:100%;text-align:left;background:var(--s2);border:1px solid var(--border);border-radius:8px;padding:9px 12px;color:var(--text);font-size:13px;font-family:var(--font-b);cursor:pointer;display:flex;align-items:center;justify-content:space-between;gap:8px}
.admin-picker-btn:hover{border-color:var(--accent)}
.admin-picker-btn .ph{color:var(--text3)}
.admin-picker-dd{position:absolute;top:calc(100% + 6px);left:0;min-width:280px;max-height:360px;overflow-y:auto;background:var(--s1);border:1px solid var(--border);border-radius:8px;box-shadow:0 8px 32px rgba(0,0,0,.5);z-index:300}
.admin-picker-group{padding:8px 12px 4px;font-size:10px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;position:sticky;top:0;background:var(--s1)}
.admin-picker-item{display:flex;align-items:center;justify-content:space-between;padding:8px 12px;cursor:pointer;border-bottom:1px solid var(--border)}
.admin-picker-item:last-child{border-bottom:none}
.admin-picker-item:hover{background:var(--s2)}

/* Mobile <768px — tabelas viram scroll horizontal contido (não a página
   inteira), grid de 2 colunas empilha, botões ganham alvo de toque 44px. */
@media (max-width:767px){
  .admin-header{padding:0 12px;flex-wrap:wrap;height:auto;min-height:56px}
  .admin-main{padding:14px}
  .admin-grid2{grid-template-columns:1fr}
  .admin-table{display:block;overflow-x:auto;white-space:nowrap;-webkit-overflow-scrolling:touch}
  .admin-picker-dd{max-width:calc(100vw - 24px)}
  .admin-nav-linhas{margin-left:0;width:100%;margin-top:8px}
  .admin-nav{flex-wrap:wrap;width:100%}
  .admin-btn,.admin-btn-ghost,.admin-picker-btn,.admin-input,.admin-select{min-height:44px}
}

/* Marcador de detecção automática: menor e apagado, pra não se confundir
   com o que foi marcado à mão */
.lampada.automatica{font-size:11px;opacity:.5;cursor:default}
.lampada.automatica:hover{opacity:.8}
.modo-badge{position:absolute;top:10px;left:12px;z-index:12;font-size:11px;font-weight:600;padding:3px 9px;border-radius:999px;border:1px solid var(--border);background:var(--s1);pointer-events:none}
.modo-badge.vendo{color:var(--accent);border-color:var(--accent)}
.modo-badge.editando{color:var(--gold);border-color:var(--gold)}
.editar-este{align-self:flex-start}
.deteccao-aviso{margin:0;font-size:11px;color:var(--text2)}
.emoji-marcacao{position:absolute;transform:translate(-50%,-50%);font-size:16px;pointer-events:none;filter:drop-shadow(0 1px 3px rgba(0,0,0,.6))}

/* ── FILTRO DE PADRÕES (sidebar do gráfico de marcação) ── */
.marcacao-area{display:flex;gap:12px;align-items:stretch;min-width:0}
.marcacao-grafico{flex:1;min-width:0;position:relative}
.filtro-padroes{flex:0 0 200px;background:var(--s1);border:1px solid var(--border);border-radius:10px;padding:10px;display:flex;flex-direction:column;gap:6px;align-self:stretch;min-height:0}
.filtro-padroes-titulo{background:none;border:0;padding:0 2px;font:inherit;font-size:13px;font-weight:700;color:var(--text);text-align:left;display:flex;align-items:center;gap:7px;cursor:default}
.filtro-padroes-contador{background:var(--accent);color:#fff;font-size:10px;font-weight:700;border-radius:999px;padding:1px 7px}
.filtro-padroes-lista{display:flex;flex-direction:column;gap:1px;overflow-y:auto;scrollbar-width:thin;min-height:0}
.filtro-padrao{display:flex;align-items:center;gap:7px;padding:4px;border-radius:6px;cursor:pointer;font-size:12px;color:var(--text2)}
.filtro-padrao:hover{background:var(--s2);color:var(--text)}
.filtro-padrao input{accent-color:var(--accent);cursor:pointer;margin:0;flex-shrink:0}
.filtro-padrao-icone{font-size:13px;line-height:1;flex-shrink:0}
.filtro-padrao-nome{flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.filtro-quantos{font-size:10px;font-family:var(--font-m);color:var(--text3);background:var(--s2);border-radius:999px;padding:1px 6px;flex-shrink:0}
.filtro-padrao.em-breve{cursor:not-allowed;opacity:.55}
.filtro-padrao.em-breve:hover{background:none;color:var(--text2)}
.filtro-padrao.em-breve input{cursor:not-allowed}
.filtro-tag{font-size:10px;color:var(--text3);flex-shrink:0}
.filtro-secao{font-size:10px;text-transform:uppercase;letter-spacing:.4px;color:var(--text3);margin-top:4px}
.filtro-salvos{display:flex;flex-direction:column;gap:3px;overflow-y:auto;scrollbar-width:thin;max-height:190px}
.filtro-salvo{display:flex;align-items:center;gap:7px;padding:5px 4px;border-radius:6px;text-decoration:none;color:var(--text2);font-size:11px;transition:background .2s}
.filtro-salvo:hover{background:var(--s2);color:var(--text)}
/* fora do período carregado: continua clicável, mas não está no gráfico */
.filtro-salvo.fora{opacity:.45}
.filtro-salvo.fora .filtro-salvo-texto span::after{content:" · fora do período"}
/* fundo iluminado por 2s no que acabou de ser salvo */
.filtro-salvo.novo{animation:salvoAgora 2s ease-out}
@keyframes salvoAgora{from{background:rgba(61,126,255,.35)}to{background:transparent}}
.filtro-salvo-icone{font-size:13px;flex-shrink:0}
.filtro-salvo-texto{display:flex;flex-direction:column;min-width:0;flex:1}
.filtro-salvo-texto strong{font-size:11px;color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.filtro-salvo-texto span{font-size:10px;color:var(--text3);font-family:var(--font-m)}
.filtro-salvo-resultado{font-size:9px;text-transform:uppercase;letter-spacing:.3px;flex-shrink:0;padding:1px 6px;border-radius:999px;border:1px solid var(--border)}
.filtro-salvo-resultado.sucesso{color:var(--up);border-color:var(--up)}
.filtro-salvo-resultado.falha{color:var(--down);border-color:var(--down)}
.filtro-salvo-resultado.indefinido{color:var(--text3)}

/* ── Cor e forma dos ícones de padrão ──────────────────────────────
   Emoji não aceita color: é glifo da fonte. A direção do padrão vira um
   brilho em volta — verde alta, vermelho baixa, amarelo "rompe pros dois
   lados". A cunha usa o mesmo 🚩 da flâmula, e ganha a borda pontilhada
   pra dar pra separar as duas de relance. O OCO Invertido é o mesmo ⛰️
   espelhado na vertical. */
.cor-alta{filter:drop-shadow(0 0 4px rgba(38,166,154,.95)) drop-shadow(0 1px 2px rgba(0,0,0,.7))}
.cor-baixa{filter:drop-shadow(0 0 4px rgba(239,83,80,.95)) drop-shadow(0 1px 2px rgba(0,0,0,.7))}
.cor-neutro{filter:drop-shadow(0 0 4px rgba(240,185,11,.9)) drop-shadow(0 1px 2px rgba(0,0,0,.7))}
.lampada.cunha,.filtro-padrao-icone.cunha,.filtro-salvo-icone.cunha,.emoji-marcacao.cunha{border-bottom:1.5px dotted currentColor;border-radius:0}
.filtro-padrao-icone.invertido,.filtro-salvo-icone.invertido{display:inline-block;transform:scaleY(-1)}
.lampada.invertido{transform:translate(-50%,-100%) scaleY(-1)}
.lampada.invertido:hover{transform:translate(-50%,-100%) scaleY(-1) scale(1.25)}
.emoji-marcacao.invertido{transform:translate(-50%,-50%) scaleY(-1)}
.admin-picker-faixa{font-size:9px;font-family:var(--font-m);color:var(--text3);margin-left:6px;letter-spacing:0}
.admin-picker-num{font-size:9px;font-family:var(--font-m);color:var(--text3);min-width:30px;flex-shrink:0}
.filtro-padroes-limpar{background:none;border:0;color:var(--accent);font:inherit;font-size:11px;cursor:pointer;padding:2px;text-align:left}
.filtro-padroes-limpar:hover{text-decoration:underline}

@media (max-width:900px){
  /* No celular o sidebar vira uma faixa acima do gráfico, recolhida: a
     lista inteira em pé comeria a tela. */
  .marcacao-area{flex-direction:column-reverse}
  .filtro-padroes{flex:1 1 auto;max-height:none}
  .filtro-padroes-titulo{cursor:pointer}
  .filtro-padroes-titulo::after{content:"▾";margin-left:auto;font-size:11px}
  .filtro-padroes:not(.aberto) .filtro-padroes-lista,
  .filtro-padroes:not(.aberto) .filtro-salvos,
  .filtro-padroes:not(.aberto) .filtro-secao,
  .filtro-padroes:not(.aberto) .filtro-padroes-limpar{display:none}
  .filtro-padroes.aberto .filtro-salvos{max-height:160px}
  .filtro-padroes.aberto .filtro-padroes-lista{max-height:260px}
}
`;

export default function AdminShell({ children }) {
  return (
    <div className="admin-shell">
      <style>{ADMIN_CSS}</style>
      {children}
    </div>
  );
}

// Navegação entre as páginas de padrões — cada padrão tem sua própria
// página/tabela/endpoint; isso só troca de tela, não mistura os dados.
// `aoTrocar(chave)`: a tela pode assumir o clique e trocar o padrão no
// lugar (devolvendo true), em vez de navegar e recarregar tudo. É o que
// mantém o gráfico no mesmo zoom quando se percebe que a bandeira de alta
// era, na verdade, de baixa.
export function AdminPatternNav({ active, aoTrocar }) {
  // Duas linhas, por família de padrão: numa linha só, 19 abas não cabem
  // na tela. Reversão em cima, continuação e consolidação embaixo.
  const linhas = [
    [
      { key: "topo-duplo", label: "Topo Duplo", href: "/admin/templates/topo-duplo" },
      { key: "fundo-duplo", label: "Fundo Duplo", href: "/admin/templates/fundo-duplo" },
      { key: "topo-triplo", label: "Topo Triplo", href: "/admin/templates/topo-triplo" },
      { key: "fundo-triplo", label: "Fundo Triplo", href: "/admin/templates/fundo-triplo" },
      { key: "oco", label: "OCO", href: "/admin/templates" },
      { key: "oco-invertido", label: "OCO Invertido", href: "/admin/templates/oco-invertido" },
    ],
    [
      { key: "bandeira-alta", label: "Bandeira de Alta", href: "/admin/templates/bandeira-alta" },
      { key: "bandeira-baixa", label: "Bandeira de Baixa", href: "/admin/templates/bandeira-baixa" },
      { key: "flamula-alta", label: "Flâmula de Alta", href: "/admin/templates/flamula-alta" },
      { key: "flamula-baixa", label: "Flâmula de Baixa", href: "/admin/templates/flamula-baixa" },
      { key: "cunha-alta", label: "Cunha de Alta", href: "/admin/templates/cunha-alta" },
      { key: "cunha-baixa", label: "Cunha de Baixa", href: "/admin/templates/cunha-baixa" },
      { key: "canal-alta", label: "Canal de Alta", href: "/admin/templates/canal-alta" },
      { key: "canal-baixa", label: "Canal de Baixa", href: "/admin/templates/canal-baixa" },
      { key: "triangulo-ascendente", label: "Triângulo Asc.", href: "/admin/templates/triangulo-ascendente" },
      { key: "triangulo-descendente", label: "Triângulo Desc.", href: "/admin/templates/triangulo-descendente" },
      { key: "triangulo-simetrico", label: "Triângulo Sim.", href: "/admin/templates/triangulo-simetrico" },
      { key: "retangulo", label: "Retângulo", href: "/admin/templates/retangulo" },
      { key: "niveis", label: "Suporte/Resistência", href: "/admin/templates/niveis" },
    ],
  ];
  return (
    <div className="admin-nav-linhas">
      {linhas.map((linha, n) => (
        <nav className="admin-nav" key={n}>
          {linha.map((l) => (
            /* Link, e não <a>: trocar de padrão não recarrega o app inteiro
               (o que refazia todas as chamadas e, com token vencido, caía no
               pedido de email). */
            <Link
              key={l.key}
              to={l.href}
              className={active === l.key ? "active" : ""}
              onClick={(e) => { if (aoTrocar?.(l.key, l.href)) e.preventDefault(); }}
            >
              {l.label}
            </Link>
          ))}
        </nav>
      ))}
    </div>
  );
}

// Avisos flutuantes (usados pelas validações da marcação de bandeira).
// `avisos`: array de { id, texto, tipo } — tipo "erro" (padrão) ou "ok".
export function AdminToast({ avisos = [], onFechar }) {
  if (!avisos.length) return null;
  return (
    <div className="admin-toast" role="alert" aria-live="assertive">
      {avisos.map((a) => (
        <div key={a.id} className={`admin-toast-item${a.tipo === "ok" ? " ok" : ""}`}>
          <span>{a.texto}</span>
          <button className="admin-toast-x" title="Fechar" onClick={() => onFechar?.(a.id)}>✕</button>
        </div>
      ))}
    </div>
  );
}
