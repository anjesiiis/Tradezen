import { Suspense, lazy, useEffect } from "react";
import { BrowserRouter, useLocation, useNavigate } from "react-router-dom";
import { AuthProvider } from "./auth/AuthContext.jsx";
import RequireAuth from "./auth/RequireAuth.jsx";
import { SkeletonPagina } from "./components/Skeleton.jsx";

// Code splitting: cada página é um chunk próprio, baixado só quando a rota
// abre. O gráfico de candles (pages/Grafico.jsx) é carregado sob demanda
// de dentro do Dashboard, que guarda o estado das multitelas.
const Landing = lazy(() => import("./pages/Landing.jsx"));
const Login = lazy(() => import("./pages/Login.jsx"));
const Cadastro = lazy(() => import("./pages/Cadastro.jsx"));
const Dashboard = lazy(() => import("./pages/Dashboard.jsx"));
const Admin = lazy(() => import("./pages/Admin.jsx"));
const RecuperarSenha = lazy(() => import("./auth/RecuperarSenha.jsx"));
const RedefinirSenha = lazy(() => import("./auth/RedefinirSenha.jsx"));
const AuthCallback = lazy(() => import("./auth/AuthCallback.jsx"));

// Hash da URL no instante em que o módulo carrega — antes do React
// renderizar e antes do client do Supabase limpar a URL sozinho
// (detectSessionInUrl). É onde chega o token do magic link do admin.
const HASH_INICIAL = typeof window !== "undefined" ? window.location.hash : "";
const QUERY_INICIAL = typeof window !== "undefined" ? window.location.search : "";

// Lê um parâmetro do retorno de autenticação, venha ele no hash
// (#access_token=..., #error=...) ou na query (?code=..., ?error=...).
function paramAuth(nome){
  const hash = new URLSearchParams((HASH_INICIAL || window.location.hash).replace(/^#/, ""));
  const query = new URLSearchParams(QUERY_INICIAL || window.location.search);
  return hash.get(nome) || query.get(nome);
}

// O retorno do magic link do admin pode cair em QUALQUER rota: quando a URL
// que pedimos não está na allow-list do Supabase, ele manda pra "Site URL"
// (a raiz do site). Além do token, entram aqui os retornos de ERRO (link
// expirado ou já usado) e o formato ?code= — antes esses dois caíam na
// landing caladinhos, e o usuário achava que o painel tinha sumido.
function retornoDeAuthAdmin(pathname){
  if (pathname.startsWith("/auth/")) return false;     // callback do usuário comum
  if (paramAuth("type") === "recovery") return false;  // troca de senha do usuário
  if (paramAuth("access_token")) return paramAuth("type") === "magiclink";
  return Boolean(paramAuth("error") || paramAuth("error_code") || paramAuth("error_description") || paramAuth("code"));
}

// Redireciona client-side (sem reload) — usado pelas rotas protegidas
// /dashboard e /favoritos, que hoje são só "apelidos" pra telas que já
// existem dentro de /mercados (ver `secao` em pages/Dashboard.jsx).
function Redirecionar({ to }){
  const navigate = useNavigate();
  useEffect(()=>{ navigate(to, { replace:true }); },[to]);
  return null;
}

function Router(){
  const location = useLocation();
  const naAbertura = location.pathname === "/";

  // Magic link do admin pode cair em qualquer rota (ver pages/Admin.jsx)
  // startsWith("/admin"): cobre barra no fim (/admin/templates/) e rotas
  // de admin desconhecidas, que antes caíam no 404 do site.
  if (retornoDeAuthAdmin(location.pathname) || location.pathname.startsWith("/admin")) {
    return <Admin hashInicial={HASH_INICIAL} queryInicial={QUERY_INICIAL}/>;
  }

  if (location.pathname === "/login") return <Login/>;
  if (location.pathname === "/cadastro") return <Cadastro/>;
  if (location.pathname === "/recuperar-senha") return <RecuperarSenha/>;
  if (location.pathname === "/redefinir-senha") return <RedefinirSenha/>;
  if (location.pathname === "/auth/callback") return <AuthCallback/>;
  if (location.pathname === "/dashboard") {
    return <RequireAuth><Redirecionar to="/mercados"/></RequireAuth>;
  }
  if (location.pathname === "/favoritos") {
    return <RequireAuth><Redirecionar to="/mercados?secao=favoritos"/></RequireAuth>;
  }

  // Na abertura, o Dashboard monta por baixo pra os dados de mercado já
  // carregarem enquanto o usuário vê a landing. Cada um tem seu Suspense:
  // a landing aparece assim que o chunk dela chega, sem esperar o do
  // Dashboard (que é bem maior).
  return (
    <>
      <Suspense fallback={naAbertura ? null : <SkeletonPagina/>}>
        <Dashboard/>
      </Suspense>
      {naAbertura && (
        <Suspense fallback={<SkeletonPagina/>}>
          <Landing/>
        </Suspense>
      )}
    </>
  );
}

// Componente raiz com o BrowserRouter
export default function App(){
  return (
    <BrowserRouter>
      <AuthProvider>
        <Suspense fallback={<SkeletonPagina/>}>
          <Router/>
        </Suspense>
      </AuthProvider>
    </BrowserRouter>
  );
}
