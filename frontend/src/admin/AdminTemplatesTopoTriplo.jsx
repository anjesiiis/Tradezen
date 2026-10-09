import PainelMarcacao from "./PainelMarcacao.jsx";
import { PADROES } from "./bandeira.js";

// Topo Triplo: mesma tela de marcação dos outros padrões — o que muda são os
// pontos, o desenho e as regras, que vivem em padroesExtras.js.
export default function AdminTemplatesTopoTriplo() {
  return <PainelMarcacao padraoInicial={PADROES.topo_triplo} />;
}
