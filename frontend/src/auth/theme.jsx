import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

// Mesma paleta de cores do app principal (App.jsx, blocos :root /
// :root[data-theme="light"]) — copiada aqui porque essas páginas são
// montadas fora do AppInner (que é quem injeta o <style> com essas
// variáveis), então precisam da própria folha de estilo pra existir.
export const AUTH_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;600&display=swap');

html,body,#root{height:100%;width:100%;margin:0;max-width:none!important;border-inline:none!important;text-align:left}

:root{
  --bg:#06080F; --s1:#0D1117; --s2:#161B22; --card:#0D1117; --border:#21262D;
  --up:#00D68F; --down:#FF4560; --accent:#3D7EFF; --gold:#F5A623;
  --text:#E6EDF3; --text2:#5A7299; --text3:#8B949E;
  --font-h:'Bebas Neue',sans-serif; --font-b:'DM Sans',sans-serif; --font-m:'JetBrains Mono',monospace;
  --r:12px;
}
:root[data-theme="light"]{
  --bg:#F3F5F9; --s1:#FFFFFF; --s2:#EBEEF3; --card:#FFFFFF; --border:#DCE2EB;
  --up:#0CA678; --down:#E1354D; --accent:#2F6FEF; --gold:#B8720A;
  --text:#0F1720; --text2:#5B6B84; --text3:#7C8798;
}

.auth-shell{min-height:100vh;width:100%;background:var(--bg);color:var(--text);font-family:var(--font-b);display:flex;flex-direction:column;align-items:center;justify-content:center;padding:24px;box-sizing:border-box}
.auth-shell *,.auth-shell *::before,.auth-shell *::after{box-sizing:border-box}

.auth-logo{font-family:var(--font-h);font-size:26px;letter-spacing:2px;color:var(--text);margin-bottom:28px;cursor:pointer;user-select:none}
.auth-logo span{color:var(--accent)}

.auth-card{background:var(--card);border:1px solid var(--border);border-radius:var(--r);padding:32px 28px;width:100%;max-width:380px;box-shadow:0 8px 32px rgba(0,0,0,.15)}
.auth-card h1{font-size:19px;font-weight:700;margin:0 0 6px;color:var(--text)}
.auth-card p.hint{color:var(--text2);font-size:13px;margin:0 0 22px;line-height:1.5}

.auth-field{display:flex;flex-direction:column;gap:6px;margin-bottom:14px}
.auth-field label{font-size:11px;color:var(--text2);font-weight:600}
.auth-input{background:var(--s2);border:1px solid var(--border);border-radius:8px;padding:11px 13px;color:var(--text);font-size:14px;font-family:var(--font-b);outline:none;transition:border-color .15s;width:100%}
.auth-input:focus{border-color:var(--accent)}
.auth-input::placeholder{color:var(--text3)}

.auth-btn{width:100%;background:var(--accent);color:#fff;border:none;border-radius:8px;padding:12px 16px;font-size:14px;font-weight:700;font-family:var(--font-b);cursor:pointer;transition:opacity .15s;margin-top:4px}
.auth-btn:hover{opacity:.9}
.auth-btn:disabled{opacity:.45;cursor:not-allowed}

.auth-msg{font-size:13px;padding:12px 14px;border-radius:8px;border:1px solid;margin-bottom:16px;line-height:1.5}
.auth-msg-ok{background:rgba(0,214,143,.08);border-color:rgba(0,214,143,.25);color:var(--up)}
.auth-msg-err{background:rgba(255,69,96,.08);border-color:rgba(255,69,96,.25);color:var(--down)}

.auth-switch{text-align:center;margin-top:20px;font-size:13px;color:var(--text2)}
.auth-switch a{color:var(--accent);cursor:pointer;text-decoration:none;font-weight:600}
.auth-switch a:hover{text-decoration:underline}
`;

export default function AuthShell({ children }) {
  const navigate = useNavigate();

  // Essas páginas não montam o AppInner (onde o toggle de tema normalmente
  // vive), mas devem respeitar a preferência já salva pelo resto do app.
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", localStorage.getItem("tradezen-tema") || "dark");
  }, []);

  return (
    <div className="auth-shell">
      <style>{AUTH_CSS}</style>
      <div className="auth-logo" onClick={() => navigate("/")}>TRADE<span>UP</span></div>
      {children}
    </div>
  );
}
