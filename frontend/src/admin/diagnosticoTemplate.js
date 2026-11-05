/**
 * TRADEZEN — POR QUE ESTE TEMPLATE NÃO ABRIU
 * ==========================================
 *
 * Seis telas do admin tinham o mesmo `catch {}` sem argumento: qualquer
 * coisa que desse errado virava "Não foi possível abrir este template."
 * O recado do backend — a tabela que falta, a sessão que venceu, a linha
 * que não existe mais — era jogado fora ali, e não havia como saber o que
 * fazer a seguir.
 *
 * O `adminApi` já pendura `status` e `data` no erro que lança. Aqui isso
 * vira uma frase que diz O QUE FAZER, e não só o que aconteceu. O número
 * do HTTP vai junto no fim, entre parênteses: quem for pedir ajuda tem o
 * que colar.
 *
 * Mora num módulo próprio porque a frase tem que ser a mesma nas seis
 * telas. Seis cópias seria garantir que cinco ficam velhas.
 */

/**
 * O que dizer na tela quando abrir falhou.
 *
 * @param {Error & {status?: number, data?: any}} erro
 * @param {string|number} id — o template que a pessoa clicou
 */
export function explicarFalhaAoAbrir(erro, id) {
  const status = erro?.status;
  const recado = (erro?.data?.detail || erro?.message || "").trim();
  const qual = id != null ? ` (nº ${id})` : "";

  // 503 é a nossa própria mensagem de "rode a migration": o backend já
  // diz qual arquivo, então ela passa inteira.
  if (status === 503) return recado || "A tabela deste padrão ainda não existe no Supabase.";

  if (status === 401 || status === 403) {
    return "Sua sessão de admin venceu. Peça um novo link de acesso e tente de novo. (401)";
  }
  if (status === 404) {
    return `Este template${qual} não está mais no banco — talvez tenha sido apagado ou movido de lado. Atualize a lista. (404)`;
  }
  if (status === 422) {
    return `O endereço deste template${qual} saiu inválido, então o servidor não soube qual buscar. (422)`;
  }
  if (status === 429) {
    return "Muitos pedidos seguidos. Espere alguns segundos e tente de novo. (429)";
  }
  if (status >= 500) {
    return `O servidor falhou ao buscar este template${qual}${recado ? `: ${recado}` : "."} (${status})`;
  }
  // Sem status: não chegou a ter resposta (rede caída, backend dormindo no
  // Render) ou estourou no próprio navegador ao montar o gráfico.
  if (!status) {
    return recado
      ? `Não deu pra abrir este template${qual}: ${recado}`
      : `Não deu pra falar com o servidor. Verifique a conexão e tente de novo.`;
  }
  return `Não deu pra abrir este template${qual}: ${recado || `erro ${status}`} (${status})`;
}

/**
 * O recado pra qualquer falha de rede/servidor numa tela do admin.
 *
 * Existe porque "Load failed" chegou a aparecer no topo da tela: é o
 * texto que o WebKit põe em `erro.message` quando o fetch NÃO CHEGOU a
 * ter resposta (o Chrome diz "Failed to fetch"). Mostrar isso cru é pior
 * que inútil — está em inglês, não diz o que fazer, e some a informação
 * de que servidor nenhum foi consultado.
 *
 * Caso real medido: o PATCH estava fora do `allow_methods` do CORS, então
 * o navegador recusava o pedido antes de mandá-lo. Um erro de servidor e
 * um pedido que nem saiu pedem providências opostas, e a frase tem que
 * separar os dois.
 */
export function explicarFalha(erro, oQue = "isto") {
  const status = erro?.status;
  const recado = (erro?.data?.detail || erro?.message || "").trim();

  if (!status) {
    // Sem status não houve resposta: rede, CORS, ou o Render dormindo.
    if (/load failed|failed to fetch|networkerror/i.test(recado)) {
      return `O navegador não conseguiu falar com o servidor ao salvar ${oQue}. `
        + "Pode ser conexão, ou o backend reiniciando — tente de novo em alguns segundos.";
    }
    return recado ? `Não deu pra salvar ${oQue}: ${recado}` : `Não deu pra salvar ${oQue}.`;
  }
  if (status === 503) return recado || "Falta rodar uma migration no Supabase.";
  if (status === 401 || status === 403) {
    return "Sua sessão de admin venceu. Peça um novo link de acesso. (401)";
  }
  if (status === 429) return "Muitos pedidos seguidos. Espere alguns segundos. (429)";
  return `Não deu pra salvar ${oQue}${recado ? `: ${recado}` : ""} (${status})`;
}

/**
 * O template veio, mas dá pra desenhar?
 *
 * Devolve null quando está bom, ou a frase do que falta. Sem isto, um
 * template sem candles abria o gráfico vazio e parecia que o TradeZen
 * tinha perdido a marcação — quando o que faltava era o dado.
 */
export function problemaNoTemplate(t) {
  if (!t || typeof t !== "object") return "O servidor respondeu sem o template.";
  if (!t.ticker) return "Este template está sem o ativo gravado, então não há o que desenhar.";
  if (!Array.isArray(t.candles) || t.candles.length === 0) {
    return "Este template está sem os candles gravados, então o gráfico não pode ser montado.";
  }
  // `pontos` é o que faz a marcação existir. Vazio não é erro de leitura:
  // é template gravado pela metade, e abrir mostraria candles sem padrão.
  const pontos = t.pontos;
  const temPontos = Array.isArray(pontos)
    ? pontos.length > 0
    : pontos && typeof pontos === "object" && Object.keys(pontos).length > 0;
  if (!temPontos) return "Este template está sem os pontos da marcação.";
  return null;
}

/**
 * Registra no console o bastante pra entender sem reproduzir: o id, o
 * status e o corpo que o servidor mandou.
 */
export function registrarFalha(onde, id, erro) {
  console.error(`[admin] ${onde} falhou`, {
    templateId: id,
    status: erro?.status ?? "(sem resposta)",
    detail: erro?.data?.detail,
    mensagem: erro?.message,
    erro,
  });
}
