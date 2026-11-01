import {
  LIMITES_TELAS, cortarExtras, limiteDeTelas, limiteDeTelasExtras,
  motivoDoBloqueio, nivelDoUsuario,
} from '../lib/limitesTelas.js';

// Os números são oferta publicada, não detalhe de implementação: o 2 do
// grátis e o 4 do premium estão escritos na página de vendas. Se mudarem
// aqui sem mudar lá, o app passa a contradizer o que foi vendido.
const COM_CONTA = { id: 'u1' };

describe('Limites de telas por plano', () => {
  it('os números são 1 (sem conta), 2 (grátis) e 4 (premium)', () => {
    expect(LIMITES_TELAS).toEqual({ visitante: 1, free: 2, premium: 4 });
  });

  it.each([
    [null, 'free', 'visitante', 1],
    [undefined, 'premium', 'visitante', 1],   // sem conta, premium não existe
    [COM_CONTA, 'free', 'free', 2],
    [COM_CONTA, undefined, 'free', 2],        // plano ainda não chegou do /eu
    [COM_CONTA, 'premium', 'premium', 4],
  ])('user=%o plano=%s → %s, %i telas', (user, plano, nivel, telas) => {
    expect(nivelDoUsuario(user, plano)).toBe(nivel);
    expect(limiteDeTelas(user, plano)).toBe(telas);
  });

  // A principal vem da URL e não dá pra fechar — ela nunca conta como extra.
  it('a tela principal não conta como extra', () => {
    expect(limiteDeTelasExtras(null, 'free')).toBe(0);
    expect(limiteDeTelasExtras(COM_CONTA, 'free')).toBe(1);
    expect(limiteDeTelasExtras(COM_CONTA, 'premium')).toBe(3);
  });

  // Plano inventado (banco com dado estranho) cai no grátis, não no
  // premium: o padrão errado tem que ser o barato, nunca o caro.
  it('plano desconhecido cai no grátis', () => {
    expect(limiteDeTelas(COM_CONTA, 'ouro')).toBe(2);
  });
});

describe('Quem vê qual convite', () => {
  // Regra do pedido, e ela não se mistura nunca: preço pra quem não tem
  // conta é cobrar antes de mostrar o produto; e quem já é cadastrado não
  // pode receber convite pra se cadastrar.
  it('sem conta vê cadastro, nunca preço', () => {
    expect(motivoDoBloqueio(null, 'free')).toBe('cadastrado');
    expect(motivoDoBloqueio(null, 'premium')).toBe('cadastrado');
  });

  it('conta grátis vê upgrade, nunca cadastro', () => {
    expect(motivoDoBloqueio(COM_CONTA, 'free')).toBe('upgrade');
  });

  // Premium está no teto do que existe: não há o que vender, então não
  // há popup — só aviso.
  it('premium não recebe oferta nenhuma', () => {
    expect(motivoDoBloqueio(COM_CONTA, 'premium')).toBe('teto');
  });
});

describe('Bancada que já não cabe', () => {
  const extras = [{ ticker: 'A' }, { ticker: 'B' }, { ticker: 'C' }];

  it('premium mantém as três extras', () => {
    expect(cortarExtras(extras, COM_CONTA, 'premium')).toHaveLength(3);
  });

  // O caso real: abriu 4 telas com conta, saiu da conta, deu F5.
  it('sair da conta corta tudo menos a principal', () => {
    expect(cortarExtras(extras, null, 'free')).toEqual([]);
  });

  it('conta grátis fica com uma extra, a primeira que ela montou', () => {
    expect(cortarExtras(extras, COM_CONTA, 'free')).toEqual([{ ticker: 'A' }]);
  });

  it('quem está dentro do limite não perde nada e mantém a mesma lista', () => {
    const duas = [{ ticker: 'A' }];
    expect(cortarExtras(duas, COM_CONTA, 'free')).toBe(duas);
  });

  it('lista ausente não explode', () => {
    expect(cortarExtras(undefined, COM_CONTA, 'free')).toEqual([]);
    expect(cortarExtras(null, null, 'free')).toEqual([]);
  });
});
