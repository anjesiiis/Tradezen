import { escreverModoNaUrl, lerModoDaUrl } from '../admin/modoTemplate.js';

describe('Modo da tela na URL', () => {
  it('entende ?modo=visualizar&id=12', () => {
    expect(lerModoDaUrl('?modo=visualizar&id=12')).toEqual({ modo: 'visualizar', id: 12 });
    expect(lerModoDaUrl('?modo=editar&id=7')).toEqual({ modo: 'editar', id: 7 });
  });

  it('ignora o que não dá pra abrir', () => {
    expect(lerModoDaUrl('')).toBeNull();
    expect(lerModoDaUrl('?modo=visualizar')).toBeNull();          // sem id
    expect(lerModoDaUrl('?id=12')).toBeNull();                    // sem modo
    expect(lerModoDaUrl('?modo=apagar&id=12')).toBeNull();        // modo inventado
    expect(lerModoDaUrl('?modo=editar&id=abc')).toBeNull();       // id torto
    expect(lerModoDaUrl('?modo=editar&id=0')).toBeNull();
  });

  it('escreve o modo no endereço sem recarregar', () => {
    window.history.replaceState(null, '', '/admin/templates/bandeira-alta');

    escreverModoNaUrl('visualizar', 42);

    expect(window.location.search).toBe('?modo=visualizar&id=42');
    expect(lerModoDaUrl(window.location.search)).toEqual({ modo: 'visualizar', id: 42 });
  });

  it('trocar de modo troca só o parâmetro', () => {
    window.history.replaceState(null, '', '/admin/templates/bandeira-alta?modo=visualizar&id=42');

    escreverModoNaUrl('editar', 42);

    expect(window.location.search).toBe('?modo=visualizar&id=42'.replace('visualizar', 'editar'));
  });

  it('fechar limpa o endereço', () => {
    window.history.replaceState(null, '', '/admin/templates/bandeira-alta?modo=editar&id=42');

    escreverModoNaUrl(null);

    expect(window.location.search).toBe('');
    expect(window.location.pathname).toBe('/admin/templates/bandeira-alta');
  });
});
