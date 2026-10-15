import PainelMarcacao from "./PainelMarcacao.jsx";
import { PADROES } from "./bandeira.js";

// Fracassos de Bandeira de Baixa: o que PARECE esse padrão e não é. Mesma tela de
// marcação de sempre — o que muda é a tabela em que cai, o campo de
// motivo e a cor, tudo vindo do próprio padrão (ver PADROES_FRACASSO).
export default function AdminTemplatesFracassoBandeiraBaixa() {
  return <PainelMarcacao padraoInicial={PADROES.bandeira_baixa_fracasso} />;
}
