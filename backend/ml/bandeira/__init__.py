"""Treino do Random Forest da bandeira (alta e baixa).

Entrada: os templates marcados à mão no /admin. Saída: um modelo .pkl com
métricas registradas no Supabase (tabela `modelos_treinados`).

NADA AQUI DETECTA PADRÃO SOZINHO. O que o modelo faz é dizer, para uma
bandeira que ALGUÉM já desenhou, o quanto a forma dela parece com as que
deram certo. Quem acha a bandeira continua sendo a pessoa.
"""
