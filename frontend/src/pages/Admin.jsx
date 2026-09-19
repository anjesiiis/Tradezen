import { useLocation } from "react-router-dom";
import AdminCallback from "../admin/AdminCallback.jsx";
import AdminLogin from "../admin/AdminLogin.jsx";
import AdminTemplates from "../admin/AdminTemplates.jsx";
import AdminTemplatesBandeiraAlta from "../admin/AdminTemplatesBandeiraAlta.jsx";
import AdminTemplatesBandeiraBaixa from "../admin/AdminTemplatesBandeiraBaixa.jsx";
import AdminTemplatesNiveis from "../admin/AdminTemplatesNiveis.jsx";
import AdminTemplatesTopoDuplo from "../admin/AdminTemplatesTopoDuplo.jsx";
import RequireAdmin from "../admin/RequireAdmin.jsx";

// Painel admin inteiro num chunk só: nenhum visitante comum baixa essas
// telas (nem os gráficos de marcação delas). Quem decide carregar este
// arquivo é o App.jsx, por qualquer rota que comece com /admin.
const TEMPLATES = {
  "/admin/templates": AdminTemplates,
  "/admin/templates/topo-duplo": AdminTemplatesTopoDuplo,
  "/admin/templates/niveis": AdminTemplatesNiveis,
  "/admin/templates/bandeira-alta": AdminTemplatesBandeiraAlta,
  "/admin/templates/bandeira-baixa": AdminTemplatesBandeiraBaixa,
};

export default function Admin({ hashInicial = "", queryInicial = "" }){
  const { pathname } = useLocation();
  // Barra no fim (/admin/templates/) tem que abrir a mesma tela
  const rota = pathname.replace(/\/+$/, "") || "/admin";

  // Retorno do magic link — token, erro (link expirado/já usado) ou ?code=.
  // Chega em qualquer rota, por isso a checagem vem antes das outras.
  if (rota === "/admin/callback" || temRetornoDeAuth(hashInicial, queryInicial)) {
    return <AdminCallback hashInicial={hashInicial} queryInicial={queryInicial}/>;
  }

  if (rota === "/admin/login") return <AdminLogin/>;

  const Pagina = TEMPLATES[rota];
  // Rota de admin desconhecida (inclusive /admin puro): login, em vez do
  // 404 do site — quem chegou aqui queria o painel.
  if (!Pagina) return <AdminLogin/>;

  return <RequireAdmin><Pagina/></RequireAdmin>;
}

function temRetornoDeAuth(hash, query){
  const noHash = new URLSearchParams((hash || window.location.hash).replace(/^#/, ""));
  const naQuery = new URLSearchParams(query || window.location.search);
  const ler = (nome) => noHash.get(nome) || naQuery.get(nome);
  return Boolean(ler("access_token") || ler("error") || ler("error_code") || ler("error_description") || ler("code"));
}
