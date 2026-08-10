export const ADMIN_CSS = `
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

.admin-header{height:56px;display:flex;align-items:center;justify-content:space-between;padding:0 24px;border-bottom:1px solid var(--border);background:var(--s1);flex-shrink:0}
.admin-logo{font-family:var(--font-h);font-size:20px;letter-spacing:2px;color:#fff}
.admin-logo span{color:var(--accent)}
.admin-header-title{color:var(--text2);font-size:13px;margin-left:12px}
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
.admin-msg-ok{background:rgba(0,214,143,.08);border-color:rgba(0,214,143,.25);color:var(--up)}
.admin-msg-err{background:rgba(255,69,96,.08);border-color:rgba(255,69,96,.25);color:var(--down)}

.admin-chip{font-size:12px;padding:5px 10px;border-radius:8px;border:1px solid var(--border);background:transparent;color:var(--text3);cursor:pointer;font-family:var(--font-b)}
.admin-chip.active{border-color:#fff;color:#fff;background:rgba(255,255,255,.08)}
.admin-chip.filled{color:var(--text);background:var(--s2)}
.admin-chip .val{color:var(--text3);margin-left:4px}

.admin-table{width:100%;border-collapse:collapse;font-size:13px}
.admin-table th{text-align:left;color:var(--text2);font-size:11px;font-weight:500;padding:8px 12px;border-top:1px solid var(--border);border-bottom:1px solid var(--border)}
.admin-table td{padding:8px 12px;border-bottom:1px solid var(--border);color:var(--text)}
.admin-table td.muted{color:var(--text2)}
.admin-table a.action{color:var(--accent);cursor:pointer;font-size:12px;margin-right:12px;text-decoration:none}
.admin-table a.action.danger{color:var(--down)}
.admin-table a.action:hover{text-decoration:underline}

.admin-row{display:flex;gap:12px;flex-wrap:wrap;align-items:flex-end}
.admin-grid2{display:grid;grid-template-columns:1fr 1fr;gap:12px}

.admin-nav{display:flex;gap:4px;margin-left:20px}
.admin-nav a{font-size:12px;padding:5px 10px;border-radius:6px;color:var(--text2);text-decoration:none}
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
  .admin-nav{margin-left:0;flex-wrap:wrap;width:100%;margin-top:8px}
  .admin-btn,.admin-btn-ghost,.admin-picker-btn,.admin-input,.admin-select{min-height:44px}
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
export function AdminPatternNav({ active }) {
  const links = [
    { key: "oco", label: "OCO", href: "/admin/templates" },
    { key: "topo-duplo", label: "Topo Duplo", href: "/admin/templates/topo-duplo" },
    { key: "niveis", label: "Suporte/Resistência", href: "/admin/templates/niveis" },
  ];
  return (
    <nav className="admin-nav">
      {links.map((l) => (
        <a key={l.key} href={l.href} className={active === l.key ? "active" : ""}>
          {l.label}
        </a>
      ))}
    </nav>
  );
}
