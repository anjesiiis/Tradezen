/**
 * TEXTO DA POLÍTICA DE PRIVACIDADE — LGPD
 * =======================================
 *
 * Fica como DADO, separado da página que desenha, por dois motivos:
 *  • é um documento legal: o teste consegue afirmar que a base legal de
 *    cada finalidade continua declarada, o que JSX espalhado não permite;
 *  • quando o texto mudar, muda aqui, sem tocar em layout.
 *
 * REGRA QUE EU SEGUI AO ESCREVER: não afirmar nada que eu não tenha
 * conferido. As certificações do Supabase abaixo são citadas com a fonte
 * porque eu li a página; a retenção de log NÃO promete prazo porque o
 * prazo é do provedor de hospedagem e não está sob nosso controle; e a
 * região do banco está descrita como "pode estar fora do Brasil" porque
 * não dá pra confirmar a região por fora.
 */

// Em UM lugar só: trocar o canal de contato é trocar esta linha.
// ATENÇÃO: este endereço precisa EXISTIR. Sem caixa de entrada, o canal
// do art. 18 não é efetivo — e a lei exige que seja.
export const EMAIL_PRIVACIDADE = "privacidade@tradezen.com.br";

export const ATUALIZADA_EM = "12 de novembro de 2026";

export const DADOS_COLETADOS = [
  {
    dado: "Nome",
    finalidade: "Identificar você dentro da plataforma e personalizar a interface.",
    base: "Execução de contrato (art. 7º, V)",
  },
  {
    dado: "Endereço de email",
    finalidade: "Autenticação, recuperação de acesso e comunicações sobre a sua conta.",
    base: "Execução de contrato (art. 7º, V)",
  },
  {
    dado: "Número de WhatsApp",
    finalidade: "Notificações de alerta que você configurou e suporte. Opcional: a plataforma funciona inteira sem ele.",
    base: "Legítimo interesse (art. 7º, IX)",
  },
  {
    dado: "Número de WhatsApp para novidades e ofertas",
    finalidade: "Mensagens de divulgação do TradeZen.",
    base: "Consentimento (art. 7º, I) — só se você marcar a caixa, e revogável a qualquer momento",
  },
  {
    dado: "Seus desenhos, anotações e análises no gráfico",
    finalidade: "Guardar o seu trabalho para você reabrir de outro aparelho.",
    base: "Execução de contrato (art. 7º, V)",
  },
];

export const NAO_FAZEMOS = [
  "Não vendemos nem compartilhamos os seus dados com terceiros para publicidade.",
  "Não fazemos rastreamento comportamental, não usamos pixel de rede social e não temos ferramenta de analytics.",
  "Não usamos os seus desenhos e análises para nada além de devolvê-los a você. Eles não alimentam modelo, não viram estatística e não são lidos por nós.",
  "Não pedimos CPF, endereço, data de nascimento nem dado financeiro.",
];

export const SEGURANCA = [
  "Em trânsito, tudo passa por HTTPS/TLS. O site redireciona HTTP para HTTPS automaticamente.",
  "Em repouso, os dados ficam no Supabase, que declara criptografia AES-256 em repouso e TLS em trânsito, além de ser certificado ISO 27001 e SOC 2 Type 2 (supabase.com/security).",
  "O acesso é restrito por Row Level Security no banco: as regras são aplicadas pelo próprio PostgreSQL, de modo que uma conta não alcança os dados de outra mesmo que o aplicativo tenha uma falha.",
  "O painel administrativo exige autenticação e uma lista fechada de emails autorizados; tentativas de acesso negado são registradas.",
];

// Declarada porque o próprio aviso de privacidade do Supabase diz que os
// dados podem ficar nos EUA ou em outro país onde eles mantenham
// instalações. Mesmo que o projeto esteja numa região brasileira, parte
// da infraestrutura (cache de arquivos, funções de borda) é global.
export const TRANSFERENCIA_INTERNACIONAL =
  "Os dados são hospedados pelo Supabase, sobre infraestrutura da Amazon Web Services. "
  + "O aviso de privacidade do Supabase informa que os dados podem ser armazenados em servidores "
  + "nos Estados Unidos ou em outro país onde a empresa mantenha instalações, e parte da "
  + "infraestrutura (cache de arquivos e funções de borda) é distribuída globalmente. "
  + "Portanto declaramos que pode haver transferência internacional de dados, amparada nas "
  + "cláusulas contratuais do provedor e na necessidade de execução do contrato com você.";

export const RETENCAO = [
  {
    quando: "Enquanto a sua conta existir",
    o_que: "Mantemos os dados acima para a plataforma funcionar.",
  },
  {
    quando: "Quando você exclui a conta",
    o_que: "Perfil, preferências, alertas, notificações e todos os seus desenhos e análises são "
      + "apagados na mesma operação, imediatamente. Cópias residuais em backups do provedor "
      + "desaparecem em até 30 dias.",
  },
  {
    quando: "Registros técnicos de acesso",
    o_que: "Guardamos data, rota e endereço IP de tentativas de acesso ao painel administrativo, "
      + "para detectar abuso. Esses registros ficam no provedor de hospedagem e são descartados "
      + "conforme o prazo de retenção dele; não os copiamos para outro lugar.",
  },
];

export const DIREITOS = [
  { direito: "Confirmação e acesso", como: "Os seus dados aparecem na tela de Configurações." },
  { direito: "Correção", como: "Edite nome, telefone e avatar em Configurações." },
  { direito: "Exclusão da conta e dos dados", como: "Botão \"Excluir minha conta\" em Configurações. É imediato e irreversível." },
  { direito: "Revogação do consentimento de marketing", como: "Desmarque a opção de novidades em Configurações. Isso não afeta a sua conta." },
  { direito: "Portabilidade", como: `Peça por email para ${EMAIL_PRIVACIDADE} e devolvemos os seus dados em formato legível por máquina.` },
  { direito: "Informação sobre compartilhamento", como: "Está nesta página: o único terceiro é a infraestrutura descrita acima." },
];

// Honestidade sobre armazenamento no navegador. A palavra "cookie" é a
// que as pessoas conhecem, mas dizer que usamos cookie de sessão seria
// falso: a sessão é guardada em localStorage pelo Supabase Auth.
export const ARMAZENAMENTO_LOCAL =
  "Não usamos cookies de rastreamento, nem de publicidade, nem de analytics. "
  + "O que guardamos no seu navegador é o necessário para o site funcionar: a sua sessão de "
  + "login (no localStorage, pelo Supabase Auth) e preferências de interface, como tema e "
  + "último gráfico aberto. Nada disso é enviado a terceiros, e apagar os dados do site no "
  + "navegador remove tudo.";
