import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "./AuthContext.jsx";

// Mesmo espírito do RequireAdmin (admin/RequireAdmin.jsx), mas reage à
// sessão do Supabase via contexto em vez de ler um token síncrono do
// localStorage — por isso o estado de `loading` (a sessão leva um
// instante pra ser checada ao carregar a página).
export default function RequireAuth({ children }) {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) navigate("/login", { replace: true });
  }, [loading, user, navigate]);

  if (loading || !user) return null;
  return children;
}
