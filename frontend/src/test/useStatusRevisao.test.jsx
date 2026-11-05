import { act, render, waitFor } from '@testing-library/react';
import { useStatusRevisao } from '../admin/useStatusRevisao.js';
import { statusDe } from '../admin/statusRevisao.js';

// O hook é a parte delicada: a troca é OTIMISTA (o selo muda na hora e o
// servidor confirma depois), porque o Render dorme e cada clique esperaria
// segundos. Se o servidor recusar, o selo tem que VOLTAR — selo que ficou
// mentindo é pior que selo nenhum, a pessoa marca como revisto e segue.

const listar = vi.fn();
const mudar = vi.fn();
vi.mock('../admin/adminApi.js', async () => {
  const real = await vi.importActual('../admin/adminApi.js');
  return {
    ...real,
    statusRevisaoApi: { listar: (...a) => listar(...a), mudar: (...a) => mudar(...a) },
  };
});

let api;
function Sonda({ padrao = 'bandeira_alta', aoFalhar }) {
  api = useStatusRevisao(padrao, { aoFalhar });
  return null;
}

const montar = (props) => render(<Sonda {...props} />);

describe('useStatusRevisao', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // o `listar` devolve { marcacoes, indisponivel, motivo }: mapa vazio
    // tem três causas (migration, rede, lista nova) e o motivo separa
    listar.mockResolvedValue({ marcacoes: { 7: { status: 'visto' } }, indisponivel: false, motivo: null });
    mudar.mockResolvedValue({ status: 'ok' });
  });

  it('busca o mapa de uma vez, pela rota do padrão', async () => {
    montar();
    await waitFor(() => expect(listar).toHaveBeenCalledWith('bandeira-alta'));
    // um pedido só pra pintar a lista inteira, não um por card
    expect(listar).toHaveBeenCalledTimes(1);
  });

  it('a tela de fracasso usa a rota de fracasso', async () => {
    montar({ padrao: 'bandeira_alta_fracasso' });
    await waitFor(() => expect(listar).toHaveBeenCalledWith('bandeira-alta-fracasso'));
  });

  it('o selo muda ANTES de o servidor responder', async () => {
    let soltar;
    mudar.mockReturnValue(new Promise((r) => { soltar = r; }));
    montar();
    await waitFor(() => expect(api.mapa['7']).toBeTruthy());

    act(() => { api.mudar(7, 'revisto'); });

    expect(statusDe(api.mapa, 7)).toBe('revisto');   // sem esperar
    await act(async () => { soltar({}); });
  });

  it('servidor recusou: o selo volta ao que era e o erro é avisado', async () => {
    const erro = Object.assign(new Error('falhou'), { status: 503 });
    mudar.mockRejectedValue(erro);
    const aoFalhar = vi.fn();
    montar({ aoFalhar });
    await waitFor(() => expect(api.mapa['7']).toBeTruthy());

    await act(async () => { await api.mudar(7, 'revisto'); });

    expect(statusDe(api.mapa, 7)).toBe('visto');     // voltou
    expect(aoFalhar).toHaveBeenCalledWith(erro);
  });

  it('clicar no status que já está não manda pedido nenhum', async () => {
    montar();
    await waitFor(() => expect(api.mapa['7']).toBeTruthy());

    await act(async () => { await api.mudar(7, 'visto'); });

    expect(mudar).not.toHaveBeenCalled();
  });

  describe('registrar abertura', () => {
    it('marca "aberto" quem ainda não tinha status', async () => {
      listar.mockResolvedValue({ marcacoes: {}, indisponivel: false, motivo: null });
      montar();
      await waitFor(() => expect(listar).toHaveBeenCalled());

      await act(async () => { api.registrarAbertura(99); });

      expect(mudar).toHaveBeenCalledWith('bandeira-alta', 99, 'aberto');
    });

    // Quem já decidiu "visto" ou "em andamento" não volta pra "aberto" só
    // por reabrir — seria apagar a decisão dele.
    it.each(['visto', 'em_andamento', 'revisto', 'aberto'])(
      'não mexe em quem já está "%s"', async (status) => {
        listar.mockResolvedValue({ marcacoes: { 7: { status } }, indisponivel: false, motivo: null });
        montar();
        await waitFor(() => expect(api.mapa['7']).toBeTruthy());

        await act(async () => { api.registrarAbertura(7); });

        expect(mudar).not.toHaveBeenCalled();
      },
    );
  });

  // Sem a migration 025 o backend devolve 503 e o `listar` avisa. A tela
  // usa isto pra esconder os botões, em vez de oferecer controle que não
  // grava.
  it('o aviso de migration vem do motivo, e chega na tela', async () => {
    listar.mockResolvedValue({
      marcacoes: {}, indisponivel: true,
      motivo: 'Rode backend/sql/025_status_revisao.sql no SQL Editor do Supabase.',
    });
    montar();

    await waitFor(() => expect(api.indisponivel).toBe(true));
    expect(api.motivo).toMatch(/025_status_revisao\.sql/);
  });

  // O defeito que isto previne: lista nova, sem marcação nenhuma, dizia
  // "falta rodar a migration 025" — mandava consertar o que já estava
  // certo.
  it('lista sem marcação nenhuma NÃO é indisponível', async () => {
    listar.mockResolvedValue({ marcacoes: {}, indisponivel: false, motivo: null });
    montar();

    await waitFor(() => expect(listar).toHaveBeenCalled());
    expect(api.indisponivel).toBe(false);
  });

  // "Load failed" é o texto do WebKit pra fetch que NÃO chegou a ter
  // resposta. Mostrar cru é inútil: está em inglês e não diz o que fazer.
  it('falha de rede dá recado de rede, não de migration', async () => {
    listar.mockRejectedValue(new TypeError('Load failed'));
    montar();

    await waitFor(() => expect(api.indisponivel).toBe(true));
    expect(api.motivo).toMatch(/não conseguiu falar com o servidor/i);
    expect(api.motivo).not.toMatch(/migration/i);
  });

  it('com status, não é indisponível', async () => {
    montar();
    await waitFor(() => expect(api.indisponivel).toBe(false));
  });

  it('padrão sem rota de status não busca nada', async () => {
    montar({ padrao: 'inventado' });
    await waitFor(() => expect(api.disponivel).toBe(false));
    expect(listar).not.toHaveBeenCalled();
  });
});
