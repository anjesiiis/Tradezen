// Modo da tela na URL: ?modo=visualizar&id=12
//
// Antes, abrir um template era só estado interno — recarregar a página ou
// mandar o endereço pra alguém voltava pra tela de marcação vazia. Com o
// modo na URL, "abra esse aqui" vira um link.

export function lerModoDaUrl(busca) {
  const params = new URLSearchParams(busca || "");
  const modo = params.get("modo");
  const id = Number(params.get("id"));
  if ((modo !== "visualizar" && modo !== "editar") || !Number.isFinite(id) || id <= 0) return null;
  return { modo, id };
}

/**
 * Escreve (ou limpa) o modo na barra de endereço sem recarregar a tela.
 * replaceState e não navigate: trocar de modo não é página nova, e não
 * deve encher o botão "voltar" do navegador.
 */
export function escreverModoNaUrl(modo, id) {
  const url = new URL(window.location.href);
  if (modo && id) {
    url.searchParams.set("modo", modo);
    url.searchParams.set("id", String(id));
  } else {
    url.searchParams.delete("modo");
    url.searchParams.delete("id");
  }
  window.history.replaceState(null, "", url.pathname + url.search);
}
