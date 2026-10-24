import { useEffect, useState } from "react";
import { SkeletonPagina } from "../components/Skeleton.jsx";
import { getAdminToken, sincronizarTokenAdmin } from "./adminApi";
import { encerrarPorInatividade, marcarAtividade, sessaoExpirou } from "./sessaoAdmin.js";

// De quanto em quanto tempo olhar o relógio com a aba aberta. Um minuto
// é fino o bastante pra uma janela de 12 horas e não pesa nada.
const INTERVALO_DE_CHECAGEM_MS = 60 * 1000;

// Com token guardado, entra direto. Sem token, ainda pode haver sessão do
// Supabase viva (o token do magic link expira em 1 hora, a sessão não):
// vale checar antes de jogar o admin na tela de pedir email.
//
// Por cima disso vem a expiração por inatividade: 12 horas sem mexer no
// painel e a sessão é encerrada de verdade (ver sessaoAdmin.js).
export default function RequireAdmin({ children }) {
  const [estado, setEstado] = useState(() => {
    if (sessaoExpirou()) return "expirado";
    return getAdminToken() ? "ok" : "checando";
  });

  useEffect(() => {
    if (estado !== "expirado") return;
    encerrarPorInatividade().finally(() => window.location.replace("/admin/login"));
  }, [estado]);

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

  // Dentro do painel: cada uso adia o prazo, e o relógio é conferido tanto
  // de minuto em minuto quanto na volta pra aba — quem deixou o navegador
  // aberto e voltou no dia seguinte cai na checagem assim que olha a tela,
  // sem esperar o próximo tique.
  useEffect(() => {
    if (estado !== "ok") return;
    marcarAtividade();

    const usou = () => marcarAtividade();
    const conferir = () => { if (sessaoExpirou()) setEstado("expirado"); };
    const aoVoltar = () => {
      if (document.visibilityState !== "visible") return;
      conferir();
      marcarAtividade();
    };

    for (const evento of ["pointerdown", "keydown", "wheel"]) {
      window.addEventListener(evento, usou, { passive: true });
    }
    document.addEventListener("visibilitychange", aoVoltar);
    const relogio = setInterval(conferir, INTERVALO_DE_CHECAGEM_MS);

    return () => {
      for (const evento of ["pointerdown", "keydown", "wheel"]) {
        window.removeEventListener(evento, usou);
      }
      document.removeEventListener("visibilitychange", aoVoltar);
      clearInterval(relogio);
    };
  }, [estado]);

  if (estado !== "ok") return <SkeletonPagina />;
  return children;
}
