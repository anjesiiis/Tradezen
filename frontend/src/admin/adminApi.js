import { supabase } from "../lib/supabaseClient";

const API = import.meta.env.VITE_API_URL || "http://localhost:8000";
const ADMIN_TOKEN_KEY = "admin_token";

export function getAdminToken() {
  return localStorage.getItem(ADMIN_TOKEN_KEY);
}
export function setAdminToken(token) {
  localStorage.setItem(ADMIN_TOKEN_KEY, token);
}
export function clearAdminToken() {
  localStorage.removeItem(ADMIN_TOKEN_KEY);
}

// O que fica guardado é o access_token do magic link, que vale 1 hora. O
// client do Supabase mantém a sessão viva sozinho (refresh token), então
// quando o backend recusa o token velho dá pra pegar o novo da sessão em
// vez de mandar o admin pedir outro link por email — que era o que
// acontecia ao abrir cada tela de template.
async function tokenDaSessao() {
  try {
    const { data } = await supabase.auth.getSession();
    const token = data?.session?.access_token;
    if (token) {
      setAdminToken(token);
      return token;
    }
  } catch { /* sem sessão do Supabase: aí é login mesmo */ }
  return null;
}

/** Token válido pra esta aba: o guardado ou um renovado pela sessão. */
export async function sincronizarTokenAdmin() {
  return getAdminToken() || (await tokenDaSessao());
}

function enviar(path, options, token) {
  const headers = { ...(options.headers || {}) };
  if (options.body) headers["Content-Type"] = "application/json";
  if (token) headers["Authorization"] = `Bearer ${token}`;
  return fetch(`${API}${path}`, { ...options, headers });
}

async function adminFetch(path, options = {}) {
  let res = await enviar(path, options, getAdminToken());

  // 401 = token expirado: renova e repete uma vez só. 403 é outra coisa
  // (email sem acesso ao painel), repetir não ajudaria.
  if (res.status === 401) {
    const renovado = await tokenDaSessao();
    if (renovado) res = await enviar(path, options, renovado);
  }

  if (res.status === 401 || res.status === 403) {
    clearAdminToken();
    if (!window.location.pathname.startsWith("/admin/login")) {
      window.location.href = "/admin/login";
    }
  }

  let data = null;
  try { data = await res.json(); } catch { /* corpo vazio */ }

  if (!res.ok) {
    const erro = new Error(data?.detail || `Erro ${res.status}`);
    erro.status = res.status;
    erro.data = data;
    throw erro;
  }
  return data;
}

export function requestMagicLink(email) {
  return adminFetch("/admin/auth/magic-link", {
    method: "POST",
    // `origem` = de onde o link foi pedido. O backend valida contra uma
    // allow-list e monta o destino do magic link a partir disso, em vez de
    // depender de uma env var no servidor estar setada certa (ver
    // _url_callback em admin_auth.py). Em dev isso vira localhost sozinho.
    body: JSON.stringify({ email, origem: window.location.origin }),
  });
}

export async function fetchAtivoCandles(ticker, periodo = "1y", intervalo = "1d") {
  const url = `${API}/ativo/${encodeURIComponent(ticker)}?periodo=${periodo}&intervalo=${intervalo}`;
  const res = await fetch(url);
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.detail || "Erro ao buscar candles.");
  return data;
}

export async function fetchAtivos() {
  const res = await fetch(`${API}/ativos`);
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.detail || "Erro ao buscar ativos.");
  return data;
}

// Fábrica de CRUD genérico — cada padrão instancia a sua, apontando pro
// próprio endpoint. Não compartilha dado nenhum entre padrões, só o
// código de "fazer um GET/POST/PUT/DELETE".
function makeTemplateApi(basePath) {
  return {
    async list() {
      const data = await adminFetch(basePath);
      return data.templates;
    },
    // A listagem vem sem os candles de propósito (ver _COLUNAS_LISTA no
    // backend — devolver tudo estourava o servidor). Quem precisa do
    // template inteiro (visualizar/editar) busca por aqui.
    async get(id) {
      const data = await adminFetch(`${basePath}/${id}`);
      return data.template;
    },
    async create(payload) {
      const data = await adminFetch(basePath, { method: "POST", body: JSON.stringify(payload) });
      return data.template;
    },
    async update(id, payload) {
      const data = await adminFetch(`${basePath}/${id}`, { method: "PUT", body: JSON.stringify(payload) });
      return data.template;
    },
    async remove(id) {
      await adminFetch(`${basePath}/${id}`, { method: "DELETE" });
    },
  };
}

export const templatesOcoApi = makeTemplateApi("/admin/templates");
export const templatesTopoDuploApi = makeTemplateApi("/admin/templates-topo-duplo");
export const templatesNiveisApi = makeTemplateApi("/admin/templates-niveis");
export const templatesBandeiraAltaApi = makeTemplateApi("/admin/templates-bandeira-alta");
export const templatesBandeiraBaixaApi = makeTemplateApi("/admin/templates-bandeira-baixa");
export const templatesFlamulaAltaApi = makeTemplateApi("/admin/templates-flamula-alta");
export const templatesFlamulaBaixaApi = makeTemplateApi("/admin/templates-flamula-baixa");
export const templatesCunhaAltaApi = makeTemplateApi("/admin/templates-cunha-alta");
export const templatesCunhaBaixaApi = makeTemplateApi("/admin/templates-cunha-baixa");
export const templatesCanalAltaApi = makeTemplateApi("/admin/templates-canal-alta");
export const templatesCanalBaixaApi = makeTemplateApi("/admin/templates-canal-baixa");

// Qual API usar pra cada padrão de continuação — é o que permite trocar de
// padrão sem sair da tela de marcação (ver o seletor em PainelMarcacao).
export const API_DO_PADRAO = {
  bandeira_alta: templatesBandeiraAltaApi,
  bandeira_baixa: templatesBandeiraBaixaApi,
  flamula_alta: templatesFlamulaAltaApi,
  flamula_baixa: templatesFlamulaBaixaApi,
  cunha_alta: templatesCunhaAltaApi,
  cunha_baixa: templatesCunhaBaixaApi,
  canal_alta: templatesCanalAltaApi,
  canal_baixa: templatesCanalBaixaApi,
};

/**
 * Detecção automática no histórico do ativo.
 *
 * Hoje o backend só detecta OCO — é o único detector automático que
 * existe (patterns/classicos.py). A resposta traz `cobertos` dizendo
 * quais padrões foram realmente procurados, pra a tela não dizer "nenhum
 * encontrado" quando a verdade é "ninguém procurou".
 */
export async function detectarPadroes(ticker, periodo = "5y", intervalo = "1d") {
  const r = await fetch(
    `${API}/detectar/${encodeURIComponent(ticker)}?periodo=${periodo}&intervalo=${intervalo}`
  );
  if (!r.ok) throw new Error(`Erro ${r.status}`);
  return r.json();
}
