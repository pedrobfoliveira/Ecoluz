# EcoLuz

**Plataforma web para monitoramento de consumo de energia e identificação de vulnerabilidade energética familiar.**

> Projeto acadêmico desenvolvido para a disciplina de Desenvolvimento Full Stack — SENAI CIMATEC.
> Alinhado aos ODS 7 (energia limpa e acessível), 11 (cidades e comunidades sustentáveis) e 13 (ação contra a mudança do clima).

**Acesse:** [link_do_vercel]

---

## Funcionalidades

- Cadastro e autenticação de usuários via Supabase Auth
- Perfil do usuário com nome e e-mail editáveis
- Perfil familiar com dados de renda, moradores e equipamentos elétricos
- Registro mensal de contas de luz (mês, ano, consumo em kWh, valor e status de atraso)
- Histórico de contas com filtros de ordenação
- Dashboard de dados de consumo com:
  - Gráfico de barras dos últimos 5 meses
  - Diagnóstico de risco energético (baixo / médio / alto)
  - Sistema de alertas automáticos

---

## Stack

| Camada | Tecnologia |
|---|---|
| Frontend | HTML, CSS e JavaScript puro |
| Backend | Node.js + Express (servidor estático + rota `/js/env.js`) |
| Banco de dados | PostgreSQL via Supabase |
| Autenticação | Supabase Auth |
| Deploy | Vercel |

---

## Estrutura de arquivos

```
ecoluz/
├── public/
│   ├── index.html          # Página inicial
│   ├── login.html          # Login
│   ├── cadastro.html       # Cadastro
│   ├── perfil.html         # Perfil do usuário e perfil familiar
│   ├── formulario.html     # Registro mensal de contas de luz
│   ├── dados-consumo.html  # Dashboard de consumo e diagnóstico
│   ├── assets/             # Imagens e logo
│   ├── css/                # Folhas de estilo por página
│   └── js/                 # Scripts por página + supabaseClient.js
├── server.js               # Servidor Express
├── .env                    # Variáveis de ambiente (não comitar)
├── .env.example            # Modelo do .env
└── package.json
```

---

## Como rodar localmente

### Pré-requisitos

- Node.js instalado
- Conta no [Supabase](https://supabase.com) com um projeto criado

### Passo a passo

1. Clone o repositório:
   ```bash
   git clone <url-do-repositorio>
   cd ecoluz
   ```

2. Instale as dependências:
   ```bash
   npm install
   ```

3. Crie o arquivo `.env` com base no `.env.example`:
   ```
   SUPABASE_URL=https://seuprojeto.supabase.co
   SUPABASE_KEY=sua_chave_anon_aqui
   ```

4. Inicie o servidor:
   ```bash
   node server.js
   ```

5. Acesse `http://localhost:3000` no navegador.

---

## Banco de dados (Supabase)

### Tabelas necessárias

#### `contas_luz`
Armazena o histórico mensal de contas de luz de cada usuário.

| Coluna | Tipo | Descrição |
|---|---|---|
| `id` | uuid (PK) | Identificador único |
| `user_id` | uuid | Referência ao usuário autenticado |
| `mes` | integer | Mês (1–12) |
| `ano` | integer | Ano |
| `consumo_kwh` | numeric | Consumo em quilowatts-hora |
| `valor` | numeric | Valor da conta em reais |
| `em_atraso` | boolean | Indica se a conta está em atraso |
| `created_at` | timestamp | Data de criação |

#### `perfil_familiar`
Armazena um registro por usuário com dados para cálculo do diagnóstico energético.

| Coluna | Tipo | Descrição |
|---|---|---|
| `id` | uuid (PK) | Identificador único |
| `user_id` | uuid (unique) | Referência ao usuário autenticado |
| `moradores` | integer | Número de pessoas na residência |
| `renda` | text | Faixa de renda familiar (`ate_1000`, `1001_2000`, `2001_3000`, `3001_5000`, `acima_5000`) |
| `equipamentos` | jsonb | Quantidade de cada equipamento, ex: `{"ar_condicionado": 2, "geladeira": 1}` |
| `updated_at` | timestamp | Última atualização |

> Ative Row Level Security (RLS) em ambas as tabelas e crie políticas para que cada usuário acesse apenas seus próprios dados.

---

## Lógica de alertas

Os alertas são calculados automaticamente na página **Dados de Consumo** sempre que o usuário possui ao menos um registro de conta.

### Alerta 1 — Conta em atraso
Disparado quando uma ou mais contas cadastradas estão marcadas com `em_atraso = true`.

> Exemplo: "3 contas em atraso — Regularize sua situação para evitar multas e juros."

### Alerta 2 — Aumento de consumo
Disparado quando o consumo do **último mês registrado** é **30% ou mais acima** da média dos até 3 meses anteriores.

**Fórmula:**
```
variação = ((consumo_último - média_anteriores) / média_anteriores) × 100
```

Se `variação ≥ 30%`, o alerta é ativado com a variação percentual e os valores envolvidos.

> Requer ao menos 2 registros de contas para funcionar.

O contador **"Alertas ativos"** no card de Resumo reflete o total dos dois tipos somados.

---

## Lógica de diagnóstico de risco energético

O diagnóstico só é calculado quando o usuário preencheu o **Perfil Familiar**. A pontuação é acumulativa: quanto maior, maior o risco.

### 1. Renda per capita
> `renda_per_capita = ponto_médio_da_faixa_de_renda / número_de_moradores`

| Renda per capita | Pontos |
|---|---|
| Abaixo de R$ 300 | 45 |
| R$ 300 – R$ 599 | 30 |
| R$ 600 – R$ 999 | 15 |
| R$ 1.000 ou mais | 5 |

### 2. Percentual da renda gasto na última conta
> `percentual = (valor_da_conta / ponto_médio_da_renda) × 100`

| Percentual da renda | Pontos |
|---|---|
| Acima de 50% | 60 |
| 15% – 50% | 35 |
| 10% – 15% | 25 |
| 5% – 10% | 15 |
| Até 5% | 0 |

> Contas que superam metade da renda familiar são consideradas situação crítica.

### 3. Contas em atraso
> `5 pontos × número de contas em atraso`, limitado a 20 pontos.

### 4. Equipamentos elétricos
A pontuação de cada equipamento é multiplicada pela quantidade informada no perfil familiar. O total de pontos por equipamentos é limitado a **20 pts** para não dominar o diagnóstico.

| Equipamento | Pontos por unidade |
|---|---|
| Ar-condicionado | 4 |
| Chuveiro elétrico | 3 |
| Máquina de lavar | 2 |
| Micro-ondas | 1 |
| Geladeira | 0,5 |
| Televisão | 0,5 |
| Computador/Notebook | 0,5 |
| Ferro elétrico | 0,5 |

Os pontos brutos são multiplicados por um **fator de renda** antes de entrar no total:

| Faixa de renda | Fator |
|---|---|
| Até R$ 1.000 | 1,5× |
| R$ 1.001 – R$ 2.000 | 1,0× |
| R$ 2.001 – R$ 3.000 | 0,6× |
| R$ 3.001 – R$ 5.000 | 0,3× |
| Acima de R$ 5.000 | 0,1× |

> Exemplo: 5 ar-condicionados com renda acima de R$ 5.000 → 20 pts × 0,1 = **2 pts** (negligível). Os mesmos 5 ACs com renda até R$ 1.000 → 20 pts × 1,5 = 30 pts → **limitado a 20 pts**. Ter muitos aparelhos só aumenta o risco quando a renda não acompanha.

### Classificação final

| Total de pontos | Nível |
|---|---|
| 0 – 30 | Baixo risco |
| 31 – 60 | Risco médio |
| 61 ou mais | Alto risco |

---

## Segurança

- As chaves do Supabase **não ficam no código-fonte**.
- O servidor Express lê o `.env` e expõe apenas a `anon key` via rota dinâmica `/js/env.js`, que o frontend importa como módulo ES.
- O arquivo `.env` está no `.gitignore` e nunca deve ser comitado.
- A `service_role` key do Supabase não é utilizada no projeto.

---

## Licença

Projeto acadêmico — uso educacional.
