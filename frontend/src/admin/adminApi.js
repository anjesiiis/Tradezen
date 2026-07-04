const API = "http://localhost:8000";
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
    body: JSON.stringify({ email }),
  });
}

export async function fetchAtivoCandles(ticker, periodo = "1y", intervalo = "1d") {
  const url = `${API}/ativo/${encodeURIComponent(ticker)}?periodo=${periodo}&intervalo=${intervalo}`;
  const res = await fetch(url);
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.detail || "Erro ao buscar candles.");
  return data;
}

export async function listTemplates() {
  const data = await adminFetch("/admin/templates");
  return data.templates;
}

export async function createTemplate(payload) {
  const data = await adminFetch("/admin/templates", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return data.template;
}

export async function updateTemplate(id, payload) {
  const data = await adminFetch(`/admin/templates/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
  return data.template;
}

export async function deleteTemplate(id) {
  await adminFetch(`/admin/templates/${id}`, { method: "DELETE" });
}
