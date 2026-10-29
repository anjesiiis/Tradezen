import { useEffect, useState } from "react";
import { assinarStatus, statusAtual } from "../lib/statusSalvamento.js";

/**
 * TRADEZEN — O SELO DE "ESTÁ SALVO"
 * =================================
 *
 * Não há botão de salvar, e é por isso que este selo existe: sem um botão
 * pra apertar, não há como saber se o trabalho está guardado. Ele aparece
 * quando algo muda, confirma, e some — selo permanente vira cenário e
 * deixa de ser lido.
 *
 * `aria-live="polite"` porque quem usa leitor de tela também precisa
 * saber que salvou, e "polite" não interrompe o que estiver sendo lido.
 */
const AVISOS = {
  editando: { icone: "✎", texto: "Editando…" },
  salvando: { icone: "⟳", texto: "Salvando…" },
  salvo:    { icone: "✓", texto: "Salvo" },
  erro:     { icone: "⚠", texto: "Não salvou na conta" },
};

export default function IndicadorSalvamento() {
  const [status, setStatus] = useState(statusAtual);

  useEffect(() => assinarStatus(setStatus), []);

  const aviso = AVISOS[status];
  // O contêiner fica SEMPRE na árvore, mesmo vazio: um aria-live que
  // nasce junto com o texto costuma não ser anunciado, porque o leitor de
  // tela só acompanha regiões que já existiam.
  return (
    <div className="ind-salvo-area" aria-live="polite" aria-atomic="true">
      {aviso && (
        <div className={`ind-salvo ind-salvo-${status}`} role="status">
          <span className="ind-salvo-icone" aria-hidden="true">{aviso.icone}</span>
          <span>{aviso.texto}</span>
        </div>
      )}
    </div>
  );
}
