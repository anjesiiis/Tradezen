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
// Chunk que não baixou. Acontece depois de cada deploy: o nome dos
// arquivos leva um hash, então a versão nova apaga os arquivos da antiga.
// Quem tem o index.html velho no cache (o Safari guarda com vontade) pede
// um arquivo que não existe mais, o import falha, e NADA renderiza — a
// tela branca clássica de "tava funcionando e parou sozinho".
//
// Não é erro de programação: é versão velha pedindo peça velha. O conserto
// é recarregar buscando na rede, e é isso que se faz aqui, uma vez só.
const CHAVE_RECARGA = "tradezen_recarregou_por_chunk";

// Duas marcas, pra dois perigos diferentes:
// - a da sessão impede o laço ENTRE cargas da página (recarregou e
//   quebrou de novo → não insiste);
// - esta, em memória, impede o laço DENTRO da mesma carga: o React
//   tenta renderizar de novo depois de capturar o erro, e sem ela a
//   segunda tentativa via a marca da sessão já posta e caía na tela de
//   erro, apagando o "Atualizando" meio segundo antes da navegação.
let recargaEmAndamento = false;

function ehChunkQueFaltou(erro) {
  const texto = `${erro?.name || ""} ${erro?.message || ""}`.toLowerCase();
  return (
    // cada navegador descreve a mesma falha com outras palavras
    /dynamically imported module|importing a module script failed|error loading dynamically|failed to fetch|chunkloaderror|module script/.test(texto) ||
    // "text/html is not a valid JavaScript MIME type" (Safari/Firefox) e
    // "Expected a JavaScript module script but the server responded with
    // a MIME type of text/html" (Chrome): é o servidor devolvendo a
    // página no lugar do arquivo que sumiu. Faltava no teste, e por isso
    // a tela de erro aparecia em vez de a recuperação rodar.
    /mime type|text\/html/.test(texto)
  );
}

/** Recarrega uma vez só, furando o cache. Devolve true se vai recarregar. */
function tentarRecarregar() {
  if (recargaEmAndamento) return true;   // já está indo: segue mostrando "Atualizando"
  try {
    if (sessionStorage.getItem(CHAVE_RECARGA)) return false;   // já tentamos: não entra em laço
    sessionStorage.setItem(CHAVE_RECARGA, "1");
  } catch {
    return false;   // sem sessionStorage não há como evitar o laço: melhor não recarregar
  }
  recargaEmAndamento = true;
  const url = new URL(window.location.href);
  url.searchParams.set("v", Date.now().toString(36));   // URL nova = o cache não serve
  window.location.replace(url.toString());
  return true;
}

export default class ErrorBoundary extends Component {
  state = { erro: null, recarregando: false };

  static getDerivedStateFromError(erro) {
    // `recarregando` em vez de voltar pro filho: devolver o filho faria
    // ele estourar de novo no mesmo instante, e o usuário veria a tela de
    // erro piscar antes da navegação. Aqui a tela fica numa mensagem curta
    // até o location.replace levar embora.
    if (ehChunkQueFaltou(erro) && tentarRecarregar()) return { recarregando: true };
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
    if (this.state.recarregando) {
      return (
        <div className="erro-tela">
          <span className="erro-logo notranslate">TRADE<span>ZEN</span></span>
          <h2>Atualizando o site…</h2>
          <p>Saiu uma versão nova. Buscando os arquivos novos — é rápido.</p>
        </div>
      );
    }
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
