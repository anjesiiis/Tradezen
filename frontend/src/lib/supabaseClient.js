import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  // createClient() joga exceção síncrona com string vazia (derruba a
  // página inteira, não só o auth) — por isso o placeholder abaixo em vez
  // de "". Com placeholder, o client se constrói normalmente e só falha
  // (de forma tratável, com try/catch) na hora de fazer uma chamada real.
  console.error(
    "[supabase] VITE_SUPABASE_URL/VITE_SUPABASE_ANON_KEY não configurados. " +
    "Copie frontend/.env.example para frontend/.env.local e preencha com a " +
    "URL e a chave publishable/anon do projeto (Supabase → Project Settings → API)."
  );
}

// Deixa explícito se o client é real ou de mentira. Sem isso, faltar a
// chave virava um "Invalid API key" cru no meio do cadastro — mensagem
// que parece problema de formato de chave/versão de biblioteca e manda a
// investigação pro lado errado (foi exatamente o que aconteceu). As telas
// de login/cadastro leem isso e avisam o que realmente falta.
export const supabaseConfigurado = Boolean(url && anonKey);

export const supabase = createClient(
  url || "https://placeholder.supabase.co",
  anonKey || "placeholder-anon-key"
);
