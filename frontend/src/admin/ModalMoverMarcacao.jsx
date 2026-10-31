import { useState } from "react";

/**
 * TRADEZEN — MOVER UMA MARCAÇÃO DE LADO
 * =====================================
 *
 * As duas tabelas querem dizer coisas diferentes, e o modal existe
 * sobretudo pra deixar isso claro ANTES de alguém confirmar:
 *
 *   padrão   → a forma É uma bandeira. Se ela deu certo ou não, isso é a
 *              coluna "Resultado", não esta tela.
 *   fracasso → a forma NÃO é uma bandeira. É contraexemplo de desenho.
 *
 * Mover uma bandeira que se formou e fracassou no mercado pro lado dos
 * fracassos envenena o treino: ela continua sendo um exemplo CERTO de
 * forma. É o engano fácil de cometer, e por isso o aviso tem destaque.
 */

const MOTIVOS = {
  fracasso: [
    "Não é bandeira — mastro não existe",
    "Consolidação longa demais pra ser bandeira",
    "Pontos marcados no lugar errado",
    "É outro padrão, não bandeira",
  ],
  padrao: [
    "É bandeira sim — marquei no lugar errado",
    "Estava na tabela errada",
    "Revisto: a forma fecha",
  ],
};

const TEXTO = {
  fracasso: {
    titulo: "Mover para os fracassos?",
    frase: "Isto diz que a forma NÃO é uma bandeira — é contraexemplo de desenho.",
    aviso: "Se a bandeira se formou e só não funcionou no mercado, ela NÃO vem pra cá: isso é a coluna Resultado. Mover um padrão que deu errado pro lado dos fracassos ensina o modelo a recusar uma forma certa.",
    confirmar: "Mover para fracassos",
  },
  padrao: {
    titulo: "Mover para os padrões?",
    frase: "Isto diz que a forma É uma bandeira de verdade.",
    aviso: "A forma vai passar pela validação do padrão. Se ela não fechar, o servidor recusa e diz o que está fora — contraexemplo costuma ser recusado aqui, e isso é o esperado.",
    confirmar: "Mover para padrões",
  },
};

export default function ModalMoverMarcacao({ marcacao, destino, aoConfirmar, aoCancelar }) {
  const [motivo, setMotivo] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState(null);
  const t = TEXTO[destino];

  async function confirmar() {
    setEnviando(true);
    setErro(null);
    try {
      await aoConfirmar(motivo.trim());
    } catch (e) {
      setErro(e?.message || "Não deu pra mover. Tente de novo.");
      setEnviando(false);
    }
  }

  return (
    <div className="mv-fundo" onMouseDown={enviando ? undefined : aoCancelar}>
      <div className="mv-caixa" onMouseDown={(e) => e.stopPropagation()} role="dialog" aria-label={t.titulo}>
        <h3>{t.titulo}</h3>
        <p className="mv-frase">
          <strong>{marcacao.ticker}</strong> · {marcacao.timeframe} — {t.frase}
        </p>

        <p className="mv-aviso">{t.aviso}</p>

        <span className="mv-rotulo">Motivo (opcional)</span>
        <div className="mv-motivos">
          {MOTIVOS[destino].map((m) => (
            <button
              key={m}
              type="button"
              className={`mv-motivo ${motivo === m ? "ativo" : ""}`}
              aria-pressed={motivo === m}
              onClick={() => setMotivo(motivo === m ? "" : m)}
            >{m}</button>
          ))}
        </div>

        <textarea
          className="mv-texto"
          rows={2}
          value={motivo}
          placeholder="Ou escreva com suas palavras"
          onChange={(e) => setMotivo(e.target.value)}
        />

        {erro && <p className="mv-erro">{erro}</p>}

        <div className="mv-botoes">
          <button type="button" className="action" onClick={aoCancelar} disabled={enviando}>
            Cancelar
          </button>
          <button
            type="button"
            className={`action ${destino === "fracasso" ? "danger" : "primary"}`}
            onClick={confirmar}
            disabled={enviando}
          >{enviando ? "Movendo…" : t.confirmar}</button>
        </div>
      </div>
    </div>
  );
}
