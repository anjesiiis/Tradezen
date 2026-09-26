import PainelMarcacao from "./PainelMarcacao.jsx";
import { PADROES } from "./bandeira.js";

// Bandeira, flâmula e cunha usam a mesma tela de marcação — 8 pontos em 4
// pares. Aqui só se escolhe com qual padrão a tela abre; o seletor no topo
// permite trocar sem sair da página.
export default function AdminTemplatesBandeiraAlta() {
  return <PainelMarcacao padraoInicial={PADROES.bandeira_alta} />;
}
