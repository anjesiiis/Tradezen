import { SB_ITENS } from '../components/Sidebar.jsx';

describe('Menu lateral', () => {
  // Mercados Globais e Principais Índices saíram do MENU por pedido do
  // dono — as páginas continuam de pé, acessíveis por URL.
  it('tem só os três itens em uso, nessa ordem', () => {
    expect(SB_ITENS.map((i) => i.label)).toEqual(['Início', 'Criptomoedas', 'Favoritos']);
  });

  it('todo item tem id, rótulo e ícone', () => {
    for (const item of SB_ITENS) {
      expect(item.id, JSON.stringify(item)).toBeTruthy();
      expect(item.label, item.id).toBeTruthy();
      expect(item.icon, item.id).toBeTruthy();
    }
  });
});
