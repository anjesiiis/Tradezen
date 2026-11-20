"""TradeZen — aplica os templates de email no Supabase Auth.

POR QUE ISTO E UM ARQUIVO E NAO UM COPIA-E-COLA NO PAINEL
=========================================================
Template colado no painel do Supabase nao esta em lugar nenhum: nao tem
historico, nao tem revisao, e quando alguem mexe ninguem sabe o que havia
antes. Aqui o HTML fica versionado junto com o resto do projeto, e este
script e o unico caminho pra producao.

COMO RODAR
----------
    export SUPABASE_ACCESS_TOKEN="sbp_..."     # token pessoal, NAO a chave do projeto
    python backend/emails/aplicar.py --conferir   # mostra o que esta no ar hoje
    python backend/emails/aplicar.py              # aplica

O token sai de https://supabase.com/dashboard/account/tokens e e PESSOAL:
da acesso a todos os projetos da conta. Ele nunca e impresso por este
script, nunca entra em arquivo e nao deve ser colado em conversa nenhuma.

SO MEXE NOS TEMPLATES. Remetente (smtp_sender_name / smtp_admin_email) nao
entra aqui de proposito: esses campos so valem com SMTP proprio
configurado, e configurar SMTP e decisao de quem paga a conta do provedor.
"""

# O python do sistema pode ser mais velho que o 3.11 do projeto, e
# "dict | None" na assinatura e avaliado na definicao da funcao. Com isto
# a anotacao vira texto e o script roda em qualquer um dos dois.
from __future__ import annotations

import json
import os
import ssl
import sys
import urllib.error
import urllib.request
from pathlib import Path

PROJETO = os.environ.get("SUPABASE_PROJECT_REF", "wxkgcpclxgwlxdmeaigp")
API = f"https://api.supabase.com/v1/projects/{PROJETO}/config/auth"
AQUI = Path(__file__).parent

# Assunto e corpo de cada template. A chave e o nome do campo na Management
# API; errar o nome do campo faz a API aceitar e ignorar em silencio, que e
# o pior resultado possivel — por isso --conferir existe.
TEMPLATES = {
    "confirmation": {
        "assunto": "Confirme seu cadastro no TradeZen",
        "arquivo": "confirmar_cadastro.html",
    },
    "recovery": {
        "assunto": "Redefinir sua senha do TradeZen",
        "arquivo": "recuperar_senha.html",
    },
}


def token() -> str:
    t = os.environ.get("SUPABASE_ACCESS_TOKEN", "").strip()
    if not t:
        sys.exit(
            "Falta SUPABASE_ACCESS_TOKEN.\n"
            "  export SUPABASE_ACCESS_TOKEN=\"sbp_...\"\n"
            "  Pegue em https://supabase.com/dashboard/account/tokens"
        )
    return t


def chamar(metodo: str, corpo: dict | None = None) -> dict:
    dados = json.dumps(corpo).encode() if corpo is not None else None
    req = urllib.request.Request(API, data=dados, method=metodo)
    req.add_header("Authorization", f"Bearer {token()}")
    req.add_header("Content-Type", "application/json")
    try:
        with urllib.request.urlopen(req, timeout=30, context=ssl.create_default_context()) as r:
            return json.loads(r.read() or "{}")
    except urllib.error.HTTPError as e:
        detalhe = e.read().decode(errors="replace")[:400]
        # 401 aqui e quase sempre token do PROJETO (anon/service_role) no
        # lugar do token PESSOAL da conta. Sao coisas diferentes.
        dica = ""
        if e.code == 401:
            dica = ("\n  401 costuma ser a chave do projeto no lugar do token pessoal. "
                    "O token pessoal comeca com 'sbp_'.")
        sys.exit(f"A API respondeu {e.code}: {detalhe}{dica}")
    except urllib.error.URLError as e:
        sys.exit(f"Nao deu pra falar com a API do Supabase: {e.reason}")


def montar() -> dict:
    corpo = {}
    for nome, cfg in TEMPLATES.items():
        caminho = AQUI / cfg["arquivo"]
        html = caminho.read_text(encoding="utf-8")
        if "{{ .ConfirmationURL }}" not in html:
            sys.exit(f"{cfg['arquivo']} nao tem {{{{ .ConfirmationURL }}}} — "
                     "o email iria sem link nenhum.")
        corpo[f"mailer_subjects_{nome}"] = cfg["assunto"]
        corpo[f"mailer_templates_{nome}_content"] = html
    return corpo


def conferir() -> None:
    atual = chamar("GET")
    for nome, cfg in TEMPLATES.items():
        assunto = atual.get(f"mailer_subjects_{nome}") or "(vazio — usa o padrao do Supabase)"
        html = atual.get(f"mailer_templates_{nome}_content") or ""
        marca = "TradeZen" in html
        print(f"[{nome}]")
        print(f"  assunto : {assunto}")
        print(f"  corpo   : {len(html)} caracteres"
              f"{' — ja e o do TradeZen' if marca else ' — AINDA NAO e o do TradeZen'}")
    # O remetente e o ponto que template nenhum resolve, entao vale dizer.
    print("\n[remetente]")
    print(f"  smtp_sender_name  : {atual.get('smtp_sender_name') or '(vazio)'}")
    print(f"  smtp_admin_email  : {atual.get('smtp_admin_email') or '(vazio)'}")
    print(f"  SMTP proprio ligado: {bool(atual.get('smtp_host'))}")
    if not atual.get("smtp_host"):
        print("  -> Sem SMTP proprio, o nome do remetente continua sendo o do Supabase,")
        print("     por mais que o assunto e o corpo estejam em portugues.")


def main() -> None:
    if "--conferir" in sys.argv:
        conferir()
        return
    corpo = montar()
    chamar("PATCH", corpo)
    print("Templates aplicados. Conferindo o que ficou no ar:\n")
    conferir()


if __name__ == "__main__":
    main()
