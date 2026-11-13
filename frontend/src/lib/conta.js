/**
 * EXCLUSÃO DA CONTA PELO TITULAR (LGPD art. 18, VI)
 *
 * Passa pelo BACKEND e não direto pelo Supabase de propósito: apagar um
 * usuário do Auth exige a chave de serviço, que jamais pode estar no
 * navegador. O backend valida o token e apaga só quem pediu.
 */
import { supabase } from "./supabaseClient.js";

const API = import.meta.env.VITE_API_URL || "http://localhost:8000";

export async function excluirConta() {
  let token = null;
  try {
    const { data } = await supabase.auth.getSession();
    token = data?.session?.access_token || null;
  } catch {
    token = null;
  }
  if (!token) return { erro: "Sua sessão expirou. Entre de novo e tente outra vez." };

  try {
    const r = await fetch(`${API}/eu/conta`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!r.ok) {
      let detalhe = null;
      try { detalhe = (await r.json())?.detail; } catch { /* corpo vazio */ }
      return { erro: detalhe || `Não foi possível excluir a conta (erro ${r.status}).` };
    }
    // A sessão local tem que morrer junto: o usuário já não existe no
    // servidor, e deixar o token no navegador faria a tela parecer logada
    // numa conta que não existe mais.
    try { await supabase.auth.signOut(); } catch { /* já era */ }
    return { ok: true };
  } catch {
    return { erro: "Não foi possível falar com o servidor. Tente de novo em instantes." };
  }
}
