import { CHAVE_VISTO, podeAparecer } from '../components/PopupCadastro.jsx';

const DIA = 24 * 60 * 60 * 1000;

describe('Convite pra criar conta — onde e quando', () => {
  beforeEach(() => localStorage.clear());

  // nessas telas o convite seria redundante ou atrapalharia trabalho
  it('não entra nas telas de conta nem no admin', () => {
    for (const rota of ['/cadastro', '/login', '/admin', '/admin/templates/bandeira-alta',
                        '/recuperar-senha', '/redefinir-senha']) {
      expect(podeAparecer(rota)).toBe(false);
    }
  });

  it('entra nas telas de uso normal', () => {
    for (const rota of ['/', '/ativo/PETR4.SA', '/mercados', '/favoritos']) {
      expect(podeAparecer(rota)).toBe(true);
    }
  });

  it('quem acabou de fechar não vê de novo', () => {
    const agora = Date.now();
    const ler = () => agora - 2 * DIA;
    expect(podeAparecer('/ativo/PETR4.SA', agora, ler)).toBe(false);
  });

  it('depois de uma semana, volta', () => {
    const agora = Date.now();
    const ler = () => agora - 8 * DIA;
    expect(podeAparecer('/ativo/PETR4.SA', agora, ler)).toBe(true);
  });

  it('data estragada no storage não trava o convite pra sempre', () => {
    localStorage.setItem(CHAVE_VISTO, 'nao-e-uma-data');
    expect(podeAparecer('/ativo/PETR4.SA')).toBe(true);
  });
});
