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

export const supabase = createClient(
  url || "https://placeholder.supabase.co",
  anonKey || "placeholder-anon-key"
);
