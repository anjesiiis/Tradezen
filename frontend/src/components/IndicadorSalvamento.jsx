import { useEffect, useState } from "react";
import { assinarStatus, motivoAtual, statusAtual, tentativaAtual } from "../lib/statusSalvamento.js";

/**
 * TRADEZEN — O SELO DE "ESTÁ SALVO"
 * =================================
 *
 * Não há botão de salvar, e é por isso que este selo existe: sem um botão
 * pra apertar, não há como saber se o trabalho está guardado. Ele aparece
 * quando algo muda, confirma, e some — selo permanente vira cenário e
 * deixa de ser lido.
 *
 * O ERRO NÃO É UM SELO, é um aviso com três partes, e isto foi reescrito
 * porque a versão anterior dizia só "Não salvou na conta":
 *
 *   1. o que está garantido — "está salvo neste navegador". É a primeira
 *      coisa a dizer, porque a pergunta que a pessoa faz ao ver um aviso
 *      vermelho é "perdi meu trabalho?", e a resposta é não;
 *   2. o que falhou e por quê, na frase do motivo;
 *   3. o que fazer: o botão de tentar de novo, quando há o que tentar.
 *
 * `aria-live="polite"` porque quem usa leitor de tela também precisa
 * saber que salvou, e "polite" não interrompe o que estiver sendo lido.
 */
const AVISOS = {
  editando: { icone: "✎", texto: "Editando…" },
  salvando: { icone: "⟳", texto: "Salvando…" },
  salvo:    { icone: "✓", texto: "Salvo" },
};

export default function IndicadorSalvamento() {
  const [status, setStatus] = useState(statusAtual);
  const [motivo, setMotivo] = useState(motivoAtual);

  useEffect(() => assinarStatus((novo, razao) => {
    setStatus(novo);
    setMotivo(razao || null);
  }), []);

  const aviso = AVISOS[status];
  const tentar = status === "erro" ? tentativaAtual() : null;

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

      {status === "erro" && (
        <div className="ind-salvo ind-salvo-erro" role="status">
          <span className="ind-salvo-icone" aria-hidden="true">⚠</span>
          <div className="ind-salvo-erro-texto">
            <strong>Salvo neste navegador, mas ainda não na sua conta.</strong>
            <span>
              {motivo?.texto || "Não deu pra gravar na conta."}
              {" "}Você não perde nada neste dispositivo.
            </span>
          </div>
          {tentar && (
            <button type="button" className="ind-salvo-tentar" onClick={() => tentar()}>
              Tentar agora
            </button>
          )}
        </div>
      )}
    </div>
  );
}
