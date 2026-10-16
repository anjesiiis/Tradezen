import { useEffect, useState } from "react";
import AdminShell, { AdminPatternNav } from "./theme.jsx";
import { APIS_DE_TEMPLATE, ROTA_DO_TIPO, rotuloDoTipo } from "./lampadas.js";
import { clearAdminToken } from "./adminApi";
import { classeDoPadrao, iconeDoPadrao } from "../lib/iconesPadroes.js";
import { falhou, rotuloDoDesfecho } from "../lib/resultado.js";
import { rotuloDoTipoFracasso } from "../lib/tiposFracasso.js";

// ── O QUE DEU ERRADO ──────────────────────────────────────────
// Um lugar pra rever os próprios erros, que é de onde vem o olho
// treinado. Junta duas coisas que são diferentes e por isso ficam em
// abas separadas:
//
//   FALHARAM   o padrão SE FORMOU e não funcionou — rompeu e voltou,
//              não atingiu o alvo. Afina a leitura de DESFECHO.
//   NÃO ERAM   nunca foi o padrão: parecia de longe. Afina a leitura
//              de FORMA. São os contraexemplos das telas de fracasso.
//
// Antes disso, os que falharam ficavam espalhados pelas tabelas de
// sucesso — 4 registros no meio de 400, sem nenhuma tela que os
// mostrasse juntos.

const ABAS = [
  { id: "falharam", rotulo: "Falharam", dica: "o padrão se formou e não funcionou" },
  { id: "nao_eram", rotulo: "Não eram o padrão", dica: "parecia, mas nunca foi" },
];

function ehFracasso(tipo) {
  return tipo.endsWith("_fracasso");
}

function formatarData(data) {
  if (!data) return "—";
  const d = new Date(data);
  // UTC: o candle é do dia inteiro; o fuso local jogaria um dia atrás
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString("pt-BR", { timeZone: "UTC" });
}

export default function RevisaoErros() {
  const [aba, setAba] = useState("falharam");
  const [itens, setItens] = useState([]);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    let cancelado = false;
    // Uma lista por tabela. Tabela que ainda não existe volta vazia (ver
    // adminApi), então um padrão sem migration não derruba a tela.
    Promise.all(
      Object.entries(APIS_DE_TEMPLATE).map(async ([tipo, api]) => {
        try {
          return (await api.list() || []).map((t) => ({ ...t, tipo }));
        } catch {
          return [];
        }
      }),
    ).then((listas) => {
      if (cancelado) return;
      setItens(listas.flat());
      setCarregando(false);
    });
    return () => { cancelado = true; };
  }, []);

  const doAba = itens
    .filter((t) => (aba === "nao_eram" ? ehFracasso(t.tipo) : !ehFracasso(t.tipo) && falhou(t.resultado)))
    .sort((a, b) => new Date(b.criado_em || 0) - new Date(a.criado_em || 0));

  const quantos = (id) =>
    itens.filter((t) => (id === "nao_eram" ? ehFracasso(t.tipo) : !ehFracasso(t.tipo) && falhou(t.resultado))).length;

  function sair() {
    clearAdminToken();
    window.location.href = "/admin/login";
  }

  return (
    <AdminShell tema="fracasso">
      <div className="admin-header">
        <div style={{ display: "flex", alignItems: "center" }}>
          <span className="admin-logo notranslate">Trade<span>Zen</span></span>
          <span className="admin-header-title">Admin · O que deu errado</span>
        </div>
        <AdminPatternNav active="revisao-erros" />
        <button onClick={sair} className="admin-link-btn">Sair</button>
      </div>

      <main className="admin-main">
        <section className="admin-card" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <h2>O que deu errado</h2>
          <p style={{ margin: 0, fontSize: 12, color: "var(--text2)" }}>
            Rever o que não funcionou é o que afina o olho — e é o que o modelo
            precisa pra aprender a diferença.
          </p>

          <div className="revisao-abas">
            {ABAS.map((a) => (
              <button
                key={a.id}
                type="button"
                className={`revisao-aba${aba === a.id ? " ativa" : ""}`}
                onClick={() => setAba(a.id)}
                title={a.dica}
              >
                {a.rotulo}
                <span className="revisao-conta">{quantos(a.id)}</span>
              </button>
            ))}
          </div>
          <p style={{ margin: 0, fontSize: 11, color: "var(--text3)" }}>
            {ABAS.find((a) => a.id === aba).dica}
          </p>

          {carregando && <p style={{ color: "var(--text2)", fontSize: 13 }}>Carregando…</p>}

          {!carregando && doAba.length === 0 && (
            <p style={{ color: "var(--text2)", fontSize: 13 }}>
              {aba === "falharam"
                ? "Nenhum padrão marcado como falha ainda. Ao marcar, escreva “falhou” no campo Resultado."
                : "Nenhum contraexemplo marcado ainda — eles vêm das telas de Fracassos."}
            </p>
          )}

          <div className="revisao-lista">
            {doAba.map((t) => {
              const rota = ROTA_DO_TIPO[t.tipo];
              const texto = (aba === "nao_eram" ? t.motivo_fracasso : t.resultado) || t.observacao;
              return (
                <a
                  key={`${t.tipo}-${t.id}`}
                  className="revisao-item"
                  href={rota ? `${rota}?modo=visualizar&id=${t.id}` : undefined}
                  title={`Abrir ${rotuloDoTipo(t.tipo)} de ${t.ticker}`}
                >
                  <span className={`revisao-icone ${classeDoPadrao(t.tipo)}`} aria-hidden="true">
                    {iconeDoPadrao(t.tipo)}
                  </span>
                  <span className="revisao-texto">
                    <strong>{t.ticker}</strong>
                    <span>{rotuloDoTipo(t.tipo)} · {formatarData(t.data_p1)}</span>
                  </span>
                  {texto && <span className="revisao-motivo">{texto}</span>}
                  {aba === "falharam" ? (
                    <span className="revisao-tag">{rotuloDoDesfecho(t.resultado)}</span>
                  ) : (
                    // só aparece quando o fracasso foi classificado na marcação
                    rotuloDoTipoFracasso(t.tipo_fracasso) && (
                      <span className="revisao-tag">{rotuloDoTipoFracasso(t.tipo_fracasso)}</span>
                    )
                  )}
                </a>
              );
            })}
          </div>
        </section>
      </main>
    </AdminShell>
  );
}
