import { Suspense, lazy, useEffect } from "react";
import { BrowserRouter, useLocation, useNavigate } from "react-router-dom";
import { AuthProvider } from "./auth/AuthContext.jsx";
import RequireAuth from "./auth/RequireAuth.jsx";

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

// Mesmas rotas de pages/Admin.jsx. Ficam duplicadas aqui de propósito:
// importar a lista de lá traria o chunk do admin inteiro pro bundle inicial.
const ROTAS_ADMIN = new Set([
  "/admin/login",
  "/admin/callback",
  "/admin/templates",
  "/admin/templates/topo-duplo",
  "/admin/templates/niveis",
  "/admin/templates/bandeira-alta",
  "/admin/templates/bandeira-baixa",
]);

function magicLinkNaUrl(hash){
  const params = new URLSearchParams(hash.replace(/^#/, ""));
  return Boolean(params.get("access_token")) && params.get("type") === "magiclink";
}

function Carregando(){
  return (
    <div style={{background:"#0f1118",height:"100vh",display:"flex",alignItems:"center",justifyContent:"center"}}>
      <span style={{color:"#787b86"}}>Carregando...</span>
    </div>
  );
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
  if (magicLinkNaUrl(HASH_INICIAL) || ROTAS_ADMIN.has(location.pathname)) {
    return <Admin hashInicial={HASH_INICIAL}/>;
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
      <Suspense fallback={naAbertura ? null : <Carregando/>}>
        <Dashboard/>
      </Suspense>
      {naAbertura && (
        <Suspense fallback={<Carregando/>}>
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
        <Suspense fallback={<Carregando/>}>
          <Router/>
        </Suspense>
      </AuthProvider>
    </BrowserRouter>
  );
}
