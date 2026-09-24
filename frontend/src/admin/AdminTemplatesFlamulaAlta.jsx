import PainelMarcacao from "./PainelMarcacao.jsx";
import { PADROES } from "./bandeira.js";
import { templatesFlamulaAltaApi } from "./adminApi";

// Bandeira e flâmula (alta e baixa) usam a mesma tela de marcação — 8
// pontos em 4 pares. Aqui só se escolhe o padrão e a tabela.
export default function AdminTemplatesFlamulaAlta() {
  return <PainelMarcacao padrao={PADROES.flamula_alta} api={templatesFlamulaAltaApi} />;
}
