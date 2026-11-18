import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import IndicadorSalvamento from '../components/IndicadorSalvamento.jsx';
import {
  ESPERA_SUMIR_MS, anunciarStatus, assinarStatus, registrarTentativa,
  statusAtual, zerarStatus,
} from '../lib/statusSalvamento.js';

/**
 * Não há botão de salvar: o que a pessoa desenha vai pro navegador na
 * hora e pra conta quando a mão para. Justamente por isso o selo existe —
 * sem botão pra apertar, não há como saber se o trabalho está guardado, e
 * a dúvida é pior que a espera.
 */
describe('Quadro de avisos da gravação', () => {
  beforeEach(() => zerarStatus());

  it('começa escondido', () => {
    expect(statusAtual()).toBe('oculto');
  });

  it('avisa quem está ouvindo, e já diz como está agora', () => {
    const ouviu = vi.fn();
    assinarStatus(ouviu);
    // o motivo vai junto do estado: é o que o selo precisa pra dizer a causa
    expect(ouviu).toHaveBeenCalledWith('oculto', null);

    anunciarStatus('salvando');
    expect(ouviu).toHaveBeenCalledWith('salvando', null);

    // e no erro o motivo viaja junto, que é o ponto de ele existir
    const motivo = { tipo: 'rede', texto: 'Sem conexão.' };
    anunciarStatus('erro', { motivo });
    expect(ouviu).toHaveBeenCalledWith('erro', motivo);
  });

  it('deixar de ouvir para de receber', () => {
    const ouviu = vi.fn();
    const parar = assinarStatus(ouviu);
    parar();
    anunciarStatus('salvando');
    expect(ouviu).toHaveBeenCalledTimes(1);   // só o estado inicial
  });

  it('estado inventado é ignorado em vez de virar selo em branco', () => {
    anunciarStatus('voando');
    expect(statusAtual()).toBe('oculto');
  });

  // Selo permanente vira cenário e deixa de ser lido
  it('"Salvo" some sozinho', () => {
    vi.useFakeTimers();
    anunciarStatus('salvo');
    expect(statusAtual()).toBe('salvo');
    vi.advanceTimersByTime(ESPERA_SUMIR_MS + 50);
    expect(statusAtual()).toBe('oculto');
    vi.useRealTimers();
  });

  // Sumir com o erro seria esconder que o trabalho pode não ter subido
  it('"erro" fica na tela', () => {
    vi.useFakeTimers();
    anunciarStatus('erro');
    vi.advanceTimersByTime(ESPERA_SUMIR_MS * 3);
    expect(statusAtual()).toBe('erro');
    vi.useRealTimers();
  });

  it('uma edição nova cancela o sumiço do "Salvo" anterior', () => {
    vi.useFakeTimers();
    anunciarStatus('salvo');
    vi.advanceTimersByTime(ESPERA_SUMIR_MS - 200);
    anunciarStatus('editando');
    vi.advanceTimersByTime(ESPERA_SUMIR_MS);
    expect(statusAtual()).toBe('editando');
    vi.useRealTimers();
  });
});

describe('Selo na tela', () => {
  beforeEach(() => zerarStatus());

  it('não mostra nada enquanto não há o que avisar', () => {
    render(<IndicadorSalvamento/>);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it.each([
    ['editando', 'Editando…'],
    ['salvando', 'Salvando…'],
    ['salvo', 'Salvo'],
  ])('mostra o recado de %s', async (estado, texto) => {
    render(<IndicadorSalvamento/>);
    act(() => anunciarStatus(estado));
    expect(await screen.findByText(texto)).toBeInTheDocument();
  });

  // O ERRO É OUTRA COISA, e por isso saiu da lista acima. Antes ele dizia
  // só "Não salvou na conta": nem a causa, nem o que fazer, nem o que
  // mais importa pra quem vê um aviso vermelho — que o trabalho NÃO se
  // perdeu. As três partes abaixo são o conserto disso.
  describe('o aviso de erro', () => {
    const MOTIVO = {
      tipo: 'tabela',
      texto: 'O lugar onde seus gráficos ficam guardados ainda não existe no banco.',
    };

    it('primeiro garante que o trabalho está salvo no navegador', async () => {
      render(<IndicadorSalvamento/>);
      act(() => anunciarStatus('erro', { motivo: MOTIVO }));
      expect(await screen.findByText(/Salvo neste navegador/)).toBeInTheDocument();
      expect(screen.getByText(/não perde nada neste dispositivo/)).toBeInTheDocument();
    });

    it('depois diz a causa real', async () => {
      render(<IndicadorSalvamento/>);
      act(() => anunciarStatus('erro', { motivo: MOTIVO }));
      expect(await screen.findByText(new RegExp(MOTIVO.texto.slice(0, 30)))).toBeInTheDocument();
    });

    it('oferece tentar de novo quando há quem tente', async () => {
      const tentar = vi.fn();
      registrarTentativa(tentar);
      render(<IndicadorSalvamento/>);
      act(() => anunciarStatus('erro', { motivo: MOTIVO }));
      fireEvent.click(await screen.findByText('Tentar agora'));
      expect(tentar).toHaveBeenCalled();
    });

    it('sem quem tente, não mostra botão morto', async () => {
      render(<IndicadorSalvamento/>);
      act(() => anunciarStatus('erro', { motivo: MOTIVO }));
      await screen.findByText(/Salvo neste navegador/);
      expect(screen.queryByText('Tentar agora')).not.toBeInTheDocument();
    });

    // Voltar a salvar tem de apagar o motivo: mostrar a causa de um
    // problema já resolvido seria assustar por nada.
    it('o motivo não sobrevive ao próximo sucesso', async () => {
      render(<IndicadorSalvamento/>);
      act(() => anunciarStatus('erro', { motivo: MOTIVO }));
      await screen.findByText(/Salvo neste navegador/);
      act(() => anunciarStatus('salvo'));
      expect(screen.queryByText(/Salvo neste navegador/)).not.toBeInTheDocument();
      expect(await screen.findByText('Salvo')).toBeInTheDocument();
    });
  });

  // Quem usa leitor de tela também precisa saber que salvou
  it('a região é anunciada sem interromper a leitura', () => {
    const { container } = render(<IndicadorSalvamento/>);
    const area = container.querySelector('.ind-salvo-area');
    expect(area).toHaveAttribute('aria-live', 'polite');
  });

  // Um aria-live que nasce junto com o texto costuma não ser anunciado:
  // o leitor de tela só acompanha regiões que já existiam
  it('a região existe antes de ter texto', () => {
    const { container } = render(<IndicadorSalvamento/>);
    expect(container.querySelector('.ind-salvo-area')).toBeInTheDocument();
  });

  it('acompanha a mudança de estado sem remontar', async () => {
    render(<IndicadorSalvamento/>);
    act(() => anunciarStatus('salvando'));
    expect(await screen.findByText('Salvando…')).toBeInTheDocument();

    act(() => anunciarStatus('salvo'));
    await waitFor(() => expect(screen.getByText('Salvo')).toBeInTheDocument());
    expect(screen.queryByText('Salvando…')).not.toBeInTheDocument();
  });
});
