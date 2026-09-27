import { useEffect, useState } from "react";
import { SkeletonPagina } from "../components/Skeleton.jsx";
import { getAdminToken, sincronizarTokenAdmin } from "./adminApi";

// Com token guardado, entra direto. Sem token, ainda pode haver sessão do
// Supabase viva (o token do magic link expira em 1 hora, a sessão não):
// vale checar antes de jogar o admin na tela de pedir email.
export default function RequireAdmin({ children }) {
  const [estado, setEstado] = useState(() => (getAdminToken() ? "ok" : "checando"));

  useEffect(() => {
    if (estado !== "checando") return;
    let vivo = true;
    sincronizarTokenAdmin().then((token) => {
      if (!vivo) return;
      if (token) setEstado("ok");
      else window.location.replace("/admin/login");
    });
    return () => { vivo = false; };
  }, [estado]);

  if (estado !== "ok") return <SkeletonPagina />;
  return children;
}
