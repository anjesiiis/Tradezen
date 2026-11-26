/**
 * TRADEZEN — TERMOS DE USO
 * ========================
 *
 * O texto mora aqui, e não dentro da página, pelo mesmo motivo da
 * Política de Privacidade (lib/politicaPrivacidade.js): assim um teste
 * consegue afirmar que as cláusulas que NÃO podem desaparecer continuam
 * declaradas — principalmente a que diz que o TradeZen não é recomendação
 * de investimento.
 *
 * ATENÇÃO: isto não é parecer jurídico. É um texto que descreve com
 * honestidade o que o produto faz hoje, escrito pra ser lido por quem vai
 * usar. Antes de cobrar de alguém, um advogado precisa revisar — a parte
 * de planos e de responsabilidade é a que mais importa revisar.
 */

export const ATUALIZADA_EM = "26 de novembro de 2026";
export const EMAIL_CONTATO = "privacidade@tradezen.com.br";

// A cláusula mais importante do documento inteiro, e por isso vem antes
// de tudo: é ela que separa plataforma educacional de consultoria de
// investimento, que no Brasil é atividade regulada pela CVM e exige
// registro. O TradeZen não tem esse registro e não quer ter.
export const NAO_E_RECOMENDACAO = [
  "O TradeZen é uma plataforma educacional de análise técnica. Nada aqui é recomendação, indicação ou aconselhamento de investimento.",
  "Não somos consultores nem analistas de valores mobiliários registrados na CVM, e não prestamos consultoria de investimento.",
  "Os padrões gráficos marcados e exibidos são material de estudo. Padrão identificado não é previsão: um padrão que se formou pode falhar, e falha com frequência.",
  "Nenhum resultado passado garante resultado futuro, e nós não prometemos nem sugerimos lucro de nenhum tamanho.",
  "Toda decisão de comprar ou vender é sua, tomada por sua conta e risco. Operar no mercado financeiro pode levar à perda total do capital investido.",
];

export const QUEM_PODE_USAR = [
  "É preciso ter 18 anos ou mais e capacidade civil para criar uma conta.",
  "A conta é pessoal. Não compartilhe seu acesso: o que acontece numa conta é tratado como feito pelo titular dela.",
  "Você é responsável por manter sua senha em segredo. Se suspeitar de acesso indevido, troque a senha e nos avise.",
];

export const USO_ACEITAVEL = {
  pode: [
    "Usar a plataforma para estudar análise técnica, à vontade.",
    "Salvar seus próprios desenhos, indicadores e bancadas de gráficos.",
    "Exportar e levar os seus dados embora quando quiser (ver a Política de Privacidade).",
  ],
  nao_pode: [
    "Raspar, copiar em massa ou revender os dados, as marcações de padrão ou o conteúdo da plataforma.",
    "Automatizar acesso com robôs ou scripts, nem burlar os limites de requisição.",
    "Tentar obter acesso a dados de outras contas, a áreas administrativas ou ao banco de dados.",
    "Revender, sublicenciar ou dar acesso da sua conta a terceiros.",
    "Usar a plataforma para qualquer atividade ilegal, inclusive manipulação de mercado.",
  ],
};

export const PLANOS = [
  {
    titulo: "Plano gratuito",
    texto: "Dá acesso aos gráficos, indicadores e ferramentas de desenho, sem custo e sem prazo.",
  },
  {
    titulo: "Plano Pro",
    texto: "Acrescenta as detecções de padrão gráfico marcadas pela nossa equipe. As condições, o preço e a forma de pagamento são informados no momento da contratação.",
  },
  {
    titulo: "Direito de arrependimento",
    texto: "Contratação feita pela internet pode ser desfeita em até 7 dias corridos, contados da contratação, com devolução do valor pago — é o artigo 49 do Código de Defesa do Consumidor. Basta pedir pelo email de contato.",
  },
  {
    titulo: "Cancelamento",
    texto: "Você pode cancelar quando quiser. O acesso ao Pro vale até o fim do período já pago, e não há multa nem prazo mínimo de permanência.",
  },
];

// Declarado porque o dado NÃO é nosso e tem atraso: dizer isso é o que
// evita que alguém trate a cotação da tela como preço de execução.
export const DADOS_DE_MERCADO = [
  "As cotações e o histórico vêm de terceiros: Yahoo Finance (ações, índices, câmbio, commodities) e Binance (criptomoedas).",
  "Esses dados podem ter atraso, lacunas ou erros, e podem mudar ou ficar indisponíveis sem aviso, porque não dependem de nós.",
  "Não garantimos exatidão de preço nem de horário. Não use a cotação exibida aqui como preço de execução de uma ordem.",
];

export const PROPRIEDADE = [
  "A marca TradeZen, o código, o design e as marcações de padrão gráfico da plataforma são nossos.",
  "O que você cria dentro da plataforma — seus desenhos, anotações, indicadores e bancadas — é seu. Não usamos isso para nada além de mostrar de volta para você.",
  "Você não precisa de autorização para estudar e aprender com o conteúdo. Precisa, sim, para redistribuí-lo ou vendê-lo.",
];

export const DISPONIBILIDADE = [
  "Fazemos o possível para manter a plataforma no ar, mas não prometemos funcionamento ininterrupto: dependemos de serviços de terceiros (hospedagem, banco de dados, fontes de cotação) que podem falhar.",
  "Podemos mudar, suspender ou encerrar funcionalidades. Mudança que reduza o que você contratou no Pro será avisada antes, por email.",
  "Podemos suspender uma conta que descumpra estes termos, principalmente nos casos de raspagem de dados e de tentativa de acesso indevido.",
];

export const RESPONSABILIDADE = [
  "Não respondemos por prejuízo decorrente de decisão de investimento tomada por você, nem por perda em operação no mercado.",
  "Não respondemos por erro, atraso ou indisponibilidade dos dados de mercado fornecidos por terceiros.",
  "Nada nestes termos afasta os direitos que o Código de Defesa do Consumidor garante a você.",
];

export const ENCERRAR_CONTA =
  "Você pode apagar sua conta e todos os seus dados sozinho, a qualquer momento, em Configurações › Conta › Excluir minha conta. A exclusão é imediata e irreversível.";

export const MUDANCAS =
  "Se estes termos mudarem, a data no topo da página muda com eles. Mudança relevante é avisada por email para quem tem conta, com no mínimo 15 dias de antecedência quando afetar um plano pago.";

export const LEI_E_FORO =
  "Estes termos seguem a lei brasileira. Como relação de consumo, eventual discussão judicial pode ser proposta no foro do domicílio do consumidor, conforme o Código de Defesa do Consumidor.";
