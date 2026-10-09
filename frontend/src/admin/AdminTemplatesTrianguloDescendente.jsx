import PainelMarcacao from "./PainelMarcacao.jsx";
import { PADROES } from "./bandeira.js";

// Triângulo Descendente: mesma tela de marcação dos outros padrões — o que muda são os
// pontos, o desenho e as regras, que vivem em padroesExtras.js.
export default function AdminTemplatesTrianguloDescendente() {
  return <PainelMarcacao padraoInicial={PADROES.triangulo_descendente} />;
}
