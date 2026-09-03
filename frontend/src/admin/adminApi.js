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

async function adminFetch(path, options = {}) {
  const token = getAdminToken();
  const headers = { ...(options.headers || {}) };
  if (options.body) headers["Content-Type"] = "application/json";
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${API}${path}`, { ...options, headers });

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
