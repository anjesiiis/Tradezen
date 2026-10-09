import PainelMarcacao from "./PainelMarcacao.jsx";
import { PADROES } from "./bandeira.js";

// Triângulo Simétrico: mesma tela de marcação dos outros padrões — o que muda são os
// pontos, o desenho e as regras, que vivem em padroesExtras.js.
export default function AdminTemplatesTrianguloSimetrico() {
  return <PainelMarcacao padraoInicial={PADROES.triangulo_simetrico} />;
}
