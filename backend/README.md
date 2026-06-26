# TradeTec — Backend

## Estrutura
```
backend/
├── main.py                  ← API principal (FastAPI)
├── requirements.txt         ← dependências
├── data/
│   └── fetcher.py           ← busca dados (Yahoo + Binance)
└── patterns/
    └── classicos.py         ← detectores de padrões clássicos
```

## Instalação

```bash
# 1. Crie uma pasta e entre nela
mkdir tradetec-backend && cd tradetec-backend

# 2. Crie um ambiente virtual (recomendado)
python -m venv venv

# Windows:
venv\Scripts\activate

# Mac/Linux:
source venv/bin/activate

# 3. Instale as dependências
pip install -r requirements.txt
```

## Rodar

```bash
uvicorn main:app --reload --port 8000
```

Acesse: http://localhost:8000

## Endpoints

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | / | Status da API |
| GET | /mercado | Resumo do mercado (página inicial) |
| GET | /ativo/{ticker} | Candles + padrões de um ativo |
| GET | /padroes/{ticker} | Só os padrões detectados |
| GET | /ativos/buscar?q=... | Busca de ativos |

## Exemplos

```bash
# Mercado geral
curl http://localhost:8000/mercado

# Petrobras — 3 meses, diário
curl http://localhost:8000/ativo/PETR4.SA?periodo=3mo&intervalo=1d

# Bitcoin — 1 mês, 1 hora
curl http://localhost:8000/ativo/BTC-USD?periodo=1mo&intervalo=1h

# Buscar ativo
curl http://localhost:8000/ativos/buscar?q=petro
```

## Documentação automática

Com o servidor rodando, acesse:
- http://localhost:8000/docs (Swagger UI)
- http://localhost:8000/redoc (ReDoc)
