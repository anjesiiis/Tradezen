import { useEffect, useState } from "react";
import { SkeletonPagina } from "../components/Skeleton.jsx";
import { getAdminToken, sincronizarTokenAdmin } from "./adminApi";
import { criarVigiaDeInatividade, encerrarPorInatividade } from "./sessaoAdmin.js";

// Com token guardado, entra direto. Sem token, ainda pode haver sessão do
// Supabase viva (o token do magic link expira em 1 hora, a sessão não):
// vale checar antes de jogar o admin na tela de pedir email.
//
// Quem chega aqui ENTRA. Não há conferência de "quanto tempo você ficou
// fora": o link de acesso do email já é a segurança da porta, e somar um
// bloqueio em cima dele expulsava quem acabou de clicar num link novo,
// queimando o link (é de uso único) no caminho. O prazo de 12 horas vale
// só pra aba que fica aberta e parada — ver sessaoAdmin.js.
export default function RequireAdmin({ children }) {
  const [estado, setEstado] = useState(() => (getAdminToken() ? "ok" : "checando"));

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

  // Painel aberto: o relógio corre, e qualquer uso o zera. Clique, tecla e
  // toque contam como uso; mexer o mouse sem clicar, não — um gato andando
  // no teclado não é decisão de ninguém, e manteria a sessão viva pra
  // sempre.
  useEffect(() => {
    if (estado !== "ok") return;

    const vigia = criarVigiaDeInatividade({ aoExpirar: () => setEstado("expirado") });
    vigia.tocar();

    const usou = () => vigia.tocar();
    const aoTrocarDeAba = () => {
      // Em segundo plano o painel não está exposto na tela de ninguém, que
      // é o risco que isto protege — o relógio espera a aba voltar.
      if (document.visibilityState === "visible") vigia.tocar();
      else vigia.pausar();
    };

    const EVENTOS = ["pointerdown", "keydown", "touchstart"];
    for (const evento of EVENTOS) window.addEventListener(evento, usou, { passive: true });
    document.addEventListener("visibilitychange", aoTrocarDeAba);

    return () => {
      for (const evento of EVENTOS) window.removeEventListener(evento, usou);
      document.removeEventListener("visibilitychange", aoTrocarDeAba);
      vigia.parar();
    };
  }, [estado]);

  if (estado !== "ok") return <SkeletonPagina />;
  return children;
}
