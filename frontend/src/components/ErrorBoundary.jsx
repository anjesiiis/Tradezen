import { Component } from "react";

/**
 * TRADEZEN — REDE DE SEGURANÇA DO RENDER
 * ======================================
 *
 * Qualquer erro durante o render de um componente derruba a árvore toda e
 * o React entrega uma tela branca. Sem isto, um erro num canto do app
 * apaga o site inteiro e não sobra nem o nome do que quebrou.
 *
 * Isto cobre só erro de RENDER. Erro antes do React subir (bundle que não
 * carrega, sintaxe que o navegador não entende) não chega aqui: quem pega
 * aquele caso é o vigia em index.html, que roda antes de tudo.
 *
 * O texto do erro fica visível e copiável de propósito. Num celular não
 * existe console à mão, e "tente de novo" sem o motivo não conserta nada:
 * com a mensagem na tela, dá pra mandar pra quem vai corrigir.
 */
export default class ErrorBoundary extends Component {
  state = { erro: null };

  static getDerivedStateFromError(erro) {
    return { erro };
  }

  componentDidCatch(erro, info) {
    // fica no console pra quem tiver um à mão (desktop, Web Inspector)
    console.error("[TradeZen] erro de render:", erro, info?.componentStack);
    this.detalhe = `${erro?.message || erro}\n\n${info?.componentStack || ""}`.trim();
  }

  copiar = () => {
    const texto = this.detalhe || String(this.state.erro?.message || this.state.erro);
    navigator.clipboard?.writeText(texto).catch(() => {});
  };

  render() {
    if (!this.state.erro) return this.props.children;

    return (
      <div className="erro-tela">
        <span className="erro-logo notranslate">TRADE<span>ZEN</span></span>
        <h2>Algo quebrou ao abrir esta tela</h2>
        <p>
          O erro está escrito aqui embaixo. Recarregar costuma resolver — se
          voltar a acontecer, copie a mensagem e mande pro suporte.
        </p>
        <pre className="erro-detalhe">{String(this.state.erro?.message || this.state.erro)}</pre>
        <div className="erro-acoes">
          <button className="erro-btn" onClick={() => window.location.reload()}>Recarregar</button>
          <button className="erro-btn secundario" onClick={this.copiar}>Copiar o erro</button>
          <a className="erro-btn secundario" href="/">Ir pra tela inicial</a>
        </div>
      </div>
    );
  }
}
