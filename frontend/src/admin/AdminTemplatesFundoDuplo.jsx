import PainelMarcacao from "./PainelMarcacao.jsx";
import { PADROES } from "./bandeira.js";

// Fundo Duplo: mesma tela de marcação dos outros padrões — o que muda são os
// pontos, o desenho e as regras, que vivem em padroesExtras.js.
export default function AdminTemplatesFundoDuplo() {
  return <PainelMarcacao padraoInicial={PADROES.fundo_duplo} />;
}
