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
// telas (nem os gráficos de marcação delas). As chaves daqui têm que bater
// com ROTAS_ADMIN em App.jsx, que decide quando carregar este arquivo.
const TEMPLATES = {
  "/admin/templates": AdminTemplates,
  "/admin/templates/topo-duplo": AdminTemplatesTopoDuplo,
  "/admin/templates/niveis": AdminTemplatesNiveis,
  "/admin/templates/bandeira-alta": AdminTemplatesBandeiraAlta,
  "/admin/templates/bandeira-baixa": AdminTemplatesBandeiraBaixa,
};

export default function Admin({ hashInicial }){
  const { pathname } = useLocation();

  // Magic link do admin pode cair em QUALQUER rota, não só em
  // /admin/callback: quando a URL que pedimos não está na allow-list do
  // painel do Supabase, ele ignora o pedido e manda pra "Site URL" (hoje a
  // raiz do site). Como só o login do admin usa magic link neste projeto
  // (usuário comum entra por senha — ver auth/Login.jsx), um token com
  // type=magiclink é necessariamente dele, então tratamos aqui em vez de
  // depender da configuração do painel estar correta.
  if (ehMagicLinkAdmin(hashInicial)) return <AdminCallback hashInicial={hashInicial}/>;

  if (pathname === "/admin/login") return <AdminLogin/>;
  if (pathname === "/admin/callback") return <AdminCallback hashInicial={hashInicial}/>;

  const Pagina = TEMPLATES[pathname];
  return Pagina ? <RequireAdmin><Pagina/></RequireAdmin> : null;
}

function ehMagicLinkAdmin(hash){
  const params = new URLSearchParams(hash.replace(/^#/, ""));
  return Boolean(params.get("access_token")) && params.get("type") === "magiclink";
}
