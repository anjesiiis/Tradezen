import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext.jsx";
import { CSS } from "../styles/appCss.js";
import {
  EMOJIS, NOME_MAX, avatarDoPerfil, carregarPerfil, formatarTelefone,
  mudancas, nomeValido, salvarPerfil, telefoneValido,
} from "../lib/perfil.js";

/**
 * TRADEZEN — CONFIGURAÇÕES DA CONTA
 * =================================
 *
 * Abas: Perfil, Segurança, Plano e Notificações. Só o Perfil está
 * pronto — as outras três mostram o que vem, em vez de levar a lugar
 * nenhum: o menu da conta já aponta pra cá, e link que não abre nada é
 * pior que aviso honesto.
 */

const ABAS = [
  { id: "perfil", rotulo: "Perfil", icone: "👤", rota: "/configuracoes" },
  { id: "seguranca", rotulo: "Segurança", icone: "🔒", rota: "/configuracoes/seguranca" },
  { id: "plano", rotulo: "Plano e cobrança", icone: "💳", rota: "/configuracoes/plano" },
  { id: "notificacoes", rotulo: "Notificações", icone: "🔔", rota: "/configuracoes/notificacoes" },
];

const EM_BREVE = {
  seguranca: ["Trocar a senha", "Autenticação em dois fatores", "Sessões ativas em outros aparelhos"],
  plano: ["O plano atual e o que ele inclui", "Trocar de plano", "Histórico de pagamentos"],
  notificacoes: ["Alertas de padrões por email", "Resumo diário", "Avisos no navegador"],
};

function Avatar({ perfil, email, tamanho = 96 }) {
  const a = avatarDoPerfil(perfil, email);
  return (
    <div className="cfg-avatar" style={{ width: tamanho, height: tamanho, fontSize: tamanho * 0.45 }}>
      {a.tipo === "upload"
        ? <img src={a.valor} alt="" />
        : <span className={a.tipo === "iniciais" ? "cfg-avatar-iniciais" : ""}
                style={a.tipo === "iniciais" ? { fontSize: tamanho * 0.34 } : undefined}>{a.valor}</span>}
    </div>
  );
}

function Perfil({ user }) {
  const [original, setOriginal] = useState(null);
  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [avatar, setAvatar] = useState({ tipo: null, valor: null });
  const [escolhendoEmoji, setEscolhendoEmoji] = useState(false);
  const [estado, setEstado] = useState("carregando");   // carregando | pronto | salvando | salvo
  const [erro, setErro] = useState("");

  useEffect(() => {
    let vivo = true;
    carregarPerfil(user?.id).then((p) => {
      if (!vivo) return;
      // Sem linha em profiles (sql/017 não rodou, ou cadastro antigo): a
      // tela abre com o que o próprio cadastro guardou, em vez de vazia.
      const base = p || { nome: user?.user_metadata?.nome || "" };
      setOriginal(base);
      setNome(base.nome || "");
      setTelefone(formatarTelefone(base.telefone || ""));
      setAvatar({ tipo: base.avatar_tipo || null, valor: base.avatar_valor || null });
      setEstado("pronto");
    });
    return () => { vivo = false; };
  }, [user]);

  const atual = useMemo(() => ({
    nome: nome.trim(),
    telefone: telefone.replace(/\D/g, "") || null,
    avatar_tipo: avatar.tipo,
    avatar_valor: avatar.valor,
  }), [nome, telefone, avatar]);

  const diff = original ? mudancas(original, atual) : {};
  const mudou = Object.keys(diff).length > 0;
  const valido = nomeValido(nome) && telefoneValido(telefone);

  async function salvar() {
    setEstado("salvando");
    setErro("");
    const r = await salvarPerfil(user?.id, diff);
    if (r.erro) { setErro(r.erro); setEstado("pronto"); return; }
    setOriginal({ ...original, ...atual });
    setEstado("salvo");
    setTimeout(() => setEstado("pronto"), 2500);
  }

  if (estado === "carregando") return <p className="cfg-aviso">Carregando seu perfil…</p>;

  return (
    <div className="cfg-form">
      <section className="cfg-bloco">
        <h2>Foto</h2>
        <div className="cfg-avatar-linha">
          <Avatar perfil={{ ...atual, nome }} email={user?.email} />
          <div className="cfg-avatar-acoes">
            <button type="button" className="cfg-btn-secundario" onClick={() => setEscolhendoEmoji((v) => !v)}>
              {escolhendoEmoji ? "Fechar" : "Escolher emoji"}
            </button>
            {avatar.tipo && (
              <button type="button" className="cfg-btn-texto" onClick={() => setAvatar({ tipo: null, valor: null })}>
                Usar minhas iniciais
              </button>
            )}
          </div>
        </div>

        {escolhendoEmoji && (
          <div className="cfg-emojis" role="listbox" aria-label="Escolher emoji do perfil">
            {EMOJIS.map((x) => (
              <button
                key={x.e}
                type="button"
                title={x.nome}
                aria-label={x.nome}
                aria-selected={avatar.valor === x.e}
                className={`cfg-emoji ${avatar.valor === x.e ? "ativo" : ""}`}
                onClick={() => { setAvatar({ tipo: "emoji", valor: x.e }); setEscolhendoEmoji(false); }}
              >{x.e}</button>
            ))}
          </div>
        )}
        {/* Enviar foto fica pra depois: pede bucket no Supabase Storage e
            redimensionamento antes do upload. Prometer aqui um botão que
            não funciona seria pior. */}
        <p className="cfg-dica">Enviar uma foto própria entra numa próxima etapa.</p>
      </section>

      <section className="cfg-bloco">
        <h2>Seus dados</h2>

        <label className="cfg-campo">
          <span className="cfg-campo-linha">
            Nome de exibição
            <i className="cfg-contador">{nome.trim().length}/{NOME_MAX}</i>
          </span>
          <input
            className="cfg-input"
            value={nome}
            maxLength={NOME_MAX}
            onChange={(e) => setNome(e.target.value)}
            placeholder="Como você quer ser chamado"
          />
          {nome.length > 0 && !nomeValido(nome) && (
            <small className="cfg-erro">Use de 2 a 40 caracteres.</small>
          )}
        </label>

        <label className="cfg-campo">
          <span>Email</span>
          {/* leitura: trocar email é outro fluxo, com confirmação nos dois
              endereços — não cabe num campo solto */}
          <input className="cfg-input" value={user?.email || ""} readOnly disabled />
          <small>Para trocar o email, fale com o suporte por enquanto.</small>
        </label>

        <label className="cfg-campo">
          <span>Telefone <i>(opcional)</i></span>
          <input
            className="cfg-input"
            value={telefone}
            inputMode="tel"
            onChange={(e) => setTelefone(formatarTelefone(e.target.value))}
            placeholder="(85) 99999-9999"
          />
          <small className={!telefoneValido(telefone) ? "cfg-erro" : ""}>
            {!telefoneValido(telefone) ? "Faltam dígitos — use DDD + número." : "Vai servir pros alertas por WhatsApp."}
          </small>
        </label>
      </section>

      {erro && <p className="cfg-erro-caixa">{erro}</p>}

      <div className="cfg-rodape">
        <button
          type="button"
          className="cfg-btn"
          disabled={!mudou || !valido || estado === "salvando"}
          onClick={salvar}
        >
          {estado === "salvando" ? "Salvando…" : "Salvar alterações"}
        </button>
        {estado === "salvo" && <span className="cfg-ok">Salvo ✓</span>}
        {!mudou && estado === "pronto" && <span className="cfg-dica">Nada mudou ainda.</span>}
      </div>
    </div>
  );
}

function EmBreve({ aba }) {
  return (
    <div className="cfg-form">
      <section className="cfg-bloco">
        <h2>{ABAS.find((a) => a.id === aba)?.rotulo}</h2>
        <p className="cfg-dica">Esta parte ainda está sendo construída. Vem por aqui:</p>
        <ul className="cfg-lista">
          {(EM_BREVE[aba] || []).map((x) => <li key={x}>{x}</li>)}
        </ul>
      </section>
    </div>
  );
}

export default function Configuracoes() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { user, loading } = useAuth();

  const aba = ABAS.find((a) => a.rota === pathname.replace(/\/+$/, ""))?.id || "perfil";

  useEffect(() => {
    if (!loading && !user) navigate("/login", { replace: true });
  }, [loading, user, navigate]);

  if (loading || !user) return null;

  return (
    <div className="cfg">
      {/* Cada página do app injeta o CSS (ver Landing e Dashboard): quem
          abre /configuracoes direto na URL não passa por nenhuma das duas,
          e sem esta linha a tela vinha sem estilo nenhum — HTML cru. */}
      <style>{CSS}</style>
      <div className="cfg-topo">
        <button className="cfg-voltar" onClick={() => navigate(-1)} aria-label="Voltar">←</button>
        <h1>Configurações</h1>
      </div>

      <div className="cfg-corpo">
        {/* No celular isto vira uma fileira que rola de lado — a mesma
            lista, sem virar menu escondido. */}
        <nav className="cfg-abas" aria-label="Seções das configurações">
          {ABAS.map((a) => (
            <button
              key={a.id}
              className={`cfg-aba ${aba === a.id ? "ativa" : ""}`}
              onClick={() => navigate(a.rota)}
              aria-current={aba === a.id ? "page" : undefined}
            >
              <span aria-hidden="true">{a.icone}</span>{a.rotulo}
            </button>
          ))}
        </nav>

        <main className="cfg-conteudo">
          {aba === "perfil" ? <Perfil user={user} /> : <EmBreve aba={aba} />}
        </main>
      </div>
    </div>
  );
}
