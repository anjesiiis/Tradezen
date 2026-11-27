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

DOIS MODOS
----------
    python backend/emails/aplicar.py              # templates (assunto + corpo)
    python backend/emails/aplicar.py --smtp       # SMTP proprio + remetente

O --smtp e o que faz o email CHEGAR em quem nao e do time do projeto. Sem
ele, o servico padrao do Supabase so entrega pra endereco do time e no
maximo 2 por hora — ou seja, usuario de verdade nao recebe nada. Ele le
estas variaveis:

    SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS,
    SMTP_REMETENTE_NOME, SMTP_REMETENTE_EMAIL

SMTP_PASS nunca e impressa, nunca entra em arquivo e nao deve ser colada
em conversa nenhuma. No Gmail ela e uma SENHA DE APP de 16 letras, nao a
senha da conta.
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
    limite = atual.get("rate_limit_email_sent")
    if limite is not None:
        print(f"  limite de envio   : {limite} emails por hora")
    if not atual.get("smtp_host"):
        print("  -> Sem SMTP proprio, o nome do remetente continua sendo o do Supabase,")
        print("     por mais que o assunto e o corpo estejam em portugues.")
        print("  -> E pior: o servico padrao SO entrega pra endereco do time do projeto.")
        print("     Usuario de verdade nao recebe o email de confirmacao. Rode --smtp.")
    else:
        print(f"  -> SMTP proprio de pe em {atual.get('smtp_host')}.")


# Campos de SMTP na Management API. SMTP_PASS fica de fora desta lista de
# exibicao de proposito — ver `montar_smtp`.
VARIAVEIS_SMTP = {
    "SMTP_HOST": "smtp_host",
    "SMTP_PORT": "smtp_port",
    "SMTP_USER": "smtp_user",
    "SMTP_PASS": "smtp_pass",
    "SMTP_REMETENTE_NOME": "smtp_sender_name",
    "SMTP_REMETENTE_EMAIL": "smtp_admin_email",
}


def montar_smtp() -> dict:
    """Le as variaveis de ambiente e monta o corpo. Valida antes de mandar."""
    faltando = [v for v in VARIAVEIS_SMTP if not os.environ.get(v, "").strip()]
    if faltando:
        sys.exit(
            "Faltam variaveis de ambiente: " + ", ".join(faltando) + "\n"
            "  Exemplo com Gmail:\n"
            '    export SMTP_HOST="smtp.gmail.com"\n'
            '    export SMTP_PORT="465"\n'
            '    export SMTP_USER="voce@gmail.com"\n'
            '    export SMTP_PASS="senha-de-app-16-letras"   # NAO a senha da conta\n'
            '    export SMTP_REMETENTE_NOME="TradeZen"\n'
            '    export SMTP_REMETENTE_EMAIL="voce@gmail.com"'
        )

    corpo = {campo: os.environ[var].strip() for var, campo in VARIAVEIS_SMTP.items()}

    try:
        porta = int(corpo["smtp_port"])
    except ValueError:
        sys.exit(f"SMTP_PORT precisa ser numero, veio {corpo['smtp_port']!r}.")
    corpo["smtp_port"] = porta

    # ── A PEGADINHA DO GMAIL ──
    # O Gmail NAO deixa mandar email com um "From" que nao seja a conta
    # autenticada (ou um alias verificado dentro dela). Se smtp_admin_email
    # for diferente de smtp_user, ele recusa o envio ou reescreve o
    # remetente — e o sintoma e o pior possivel: cadastro parece funcionar
    # e o email simplesmente nao chega, sem erro em lugar nenhum.
    #
    # Verificar um alias como nao-responda@tradezen.com.br exige RECEBER um
    # email de confirmacao naquele endereco, e pra isso o dominio precisa de
    # registro MX — que hoje nao existe (conferido com dig).
    if "gmail.com" in corpo["smtp_host"] and corpo["smtp_admin_email"].lower() != corpo["smtp_user"].lower():
        sys.exit(
            "Com o Gmail, SMTP_REMETENTE_EMAIL tem de ser o MESMO que SMTP_USER.\n"
            f"  SMTP_USER             = {corpo['smtp_user']}\n"
            f"  SMTP_REMETENTE_EMAIL  = {corpo['smtp_admin_email']}\n"
            "  O Gmail recusa remetente que nao seja a conta autenticada, e o\n"
            "  sintoma e o email nao chegar sem dar erro. Use o proprio endereco\n"
            "  do Gmail, ou troque pra um provedor que aceite o seu dominio\n"
            "  (Resend, Brevo) depois de por os registros de DNS."
        )

    if "@" not in corpo["smtp_admin_email"]:
        sys.exit(f"SMTP_REMETENTE_EMAIL nao parece um email: {corpo['smtp_admin_email']!r}")

    return corpo


def aplicar_smtp() -> None:
    corpo = montar_smtp()
    # Mostra o que vai ser gravado SEM a senha. Conferir antes de mandar
    # importa: errar o host aqui derruba o email de todo mundo em silencio.
    print("Vou gravar isto no Supabase Auth:")
    for campo, valor in corpo.items():
        if campo == "smtp_pass":
            print(f"  {campo:18} : (oculta, {len(str(valor))} caracteres)")
        else:
            print(f"  {campo:18} : {valor}")
    print()
    chamar("PATCH", corpo)
    print("SMTP aplicado. Conferindo o que ficou no ar:\n")
    conferir()
    print("\nAGORA TESTE DE VERDADE: cadastre um email que NAO seja do time do")
    print("projeto (o de um amigo, ou um @gmail seu que nao esteja no Supabase).")
    print("Se chegar, a troca funcionou. Era isso que nao acontecia antes.")


def main() -> None:
    if "--conferir" in sys.argv:
        conferir()
        return
    if "--smtp" in sys.argv:
        aplicar_smtp()
        return
    corpo = montar()
    chamar("PATCH", corpo)
    print("Templates aplicados. Conferindo o que ficou no ar:\n")
    conferir()


if __name__ == "__main__":
    main()
