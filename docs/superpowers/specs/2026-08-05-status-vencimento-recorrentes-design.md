# Status de vencimento das recorrentes

Data: 2026-08-05
Projeto: Finanças (PWA)
Status: Aprovado

## Problema

A listagem de recorrentes exibe apenas `Próximo: 2026-08-31` (data ISO crua). O usuário quer saber rapidamente **em quanto tempo** vence cada recorrente, e ser alertado quando há ocorrência vencida que ainda não virou lançamento.

## Objetivo

Substituir a exibição atual por texto amigável com dias restantes e alerta de pendência:
- Pendência atrasada → `Pendente desde 15/08` (destaque vermelho)
- Vence hoje → `Vence hoje`
- Vence amanhã → `Vence amanhã`
- Futuro → `Em 26 dias (31/08)` (cor muted)

## Abordagem escolhida

Função pura `statusRecorrente(rec, hoje)` em `src/lib/finance.ts`, testável e seguindo o padrão existente de funções puras nesse arquivo. A página apenas formata o resultado.

## Mudanças

### 1. `src/lib/finance.ts` — nova função

```ts
export type StatusRecorrente =
  | { tipo: 'atrasado'; data: string }
  | { tipo: 'hoje' }
  | { tipo: 'amanha' }
  | { tipo: 'futuro'; data: string };

export function statusRecorrente(rec: Recorrente, hoje: string): StatusRecorrente
```

Lógica (espelha `gerarRecorrentesPendentes`):
- **Já processada** (`ultimo_processado` preenchido): o próximo vencimento é `proximoVencimento(rec, rec.ultimo_processado)`.
  - `data < hoje` → `atrasado` (ocorrência vencida ainda não gerada)
  - `data === hoje` → `hoje`
  - `data === amanhã` → `amanha`
  - senão → `futuro`
- **Nunca processada** (`ultimo_processado === null`): usa `primeiroPendente(rec, hoje)`.
  - retorna `hoje` → `hoje`
  - retorna data anterior → `atrasado`
  - retorna `null` (dia ainda não chegou no mês) → próximo vencimento via `proximoVencimento(rec, somarDias(hoje, -1))`:
    - amanhã → `amanha`
    - senão → `futuro`

Detalhes:
- Recorrentes inativas (`ativo === false`) → `futuro` com base no próximo vencimento (sem pendência).
- Reutiliza `somarDias`, `proximoVencimento` e `primeiroPendente` já existentes.
- Comparação de datas por string ISO (`YYYY-MM-DD`), consistente com o resto do código.
- `proximoVencimento(rec, rec.ultimo_processado)` nunca retorna a própria `ultimo_processado` (é estritamente após), então não há risco de duplicar a pendência.

### 2. `src/pages/Recorrentes.tsx` — exibição

- Substituir o uso de `proximoDe(r)` na listagem (linha 92) por `statusRecorrente(r, hoje)`.
- Remover a função local `proximoDe` (não é mais necessária).
- Mapear o status para o texto e cor:
  - `atrasado` → `<p className="text-xs text-danger">Pendente desde {dataBonita(data)}</p>`
  - `hoje` → `<p className="text-xs font-semibold text-primary">Vence hoje</p>`
  - `amanha` → `<p className="text-xs font-semibold text-primary">Vence amanhã</p>`
  - `futuro` → `<p className="text-xs text-ink-muted">Em {dias} dias ({dataBonita(data)})</p>`
- Dias restantes calculados pela diferença entre `data` e `hoje`.
- `dataBonita` vem de `src/lib/format.ts`.

### 3. `src/lib/finance.test.ts` — novos testes

- Atrasada com `ultimo_processado` (próximo vencimento anterior a hoje)
- Vence hoje (com `ultimo_processado` e com `null`)
- Vence amanhã (com `ultimo_processado` e com `null`)
- Futura (mais de 1 dia)
- Nunca processada com dia ainda não chegado no mês → `futuro`
- Inativa (sem pendência, mostra próximo futuro)
- Dia 31 em mês com 30/28 dias (borda)

## Fora de escopo

- Processamento de recorrentes ao cadastrar (permanece no mount do AppShell).
- Geração retroativa de ocorrências passadas.
- Validação da faixa de `dia` no formulário (débito v1.1 separado).
- Aviso na Visão Geral (o usuário escolheu apenas a listagem).

## Verificação

- `npm test` (testes unitários passam)
- `npm run build` (tsc + vite build verde)
