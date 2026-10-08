import { useState } from "react";

// Avisos flutuantes das telas de marcação.
//
// Estava escrito só no PainelMarcacao; as outras telas não tinham. Aqui
// vira um hook pra as quatro usarem o mesmo — inclusive o "Padrão salvo ✓",
// que some sozinho em 2,5s (erro fica 8s, que é tempo de ler e entender).
export function useToasts() {
  const [avisos, setAvisos] = useState([]);

  function fecharAviso(id) {
    setAvisos((prev) => prev.filter((a) => a.id !== id));
  }

  function mostrarToasts(mensagens, tipo = "erro", duracao = 8000) {
    const novos = mensagens.map((texto, i) => ({ id: `${Date.now()}-${tipo}-${i}`, texto, tipo }));
    setAvisos((prev) => [...prev, ...novos]);
    novos.forEach((a) => setTimeout(() => fecharAviso(a.id), duracao));
  }

  return { avisos, mostrarToasts, fecharAviso };
}
