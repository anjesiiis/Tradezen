import PainelMarcacao from "./PainelMarcacao.jsx";
import { PADROES } from "./bandeira.js";

// Fundo Triplo: mesma tela de marcação dos outros padrões — o que muda são os
// pontos, o desenho e as regras, que vivem em padroesExtras.js.
export default function AdminTemplatesFundoTriplo() {
  return <PainelMarcacao padraoInicial={PADROES.fundo_triplo} />;
}
