# Status de vencimento das recorrentes — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Substituir a exibição `Próximo: 2026-08-31` na listagem de recorrentes por um status amigável com dias restantes e alerta de pendência.

**Architecture:** Função pura `statusRecorrente(rec, hoje)` em `src/lib/finance.ts` seguindo o padrão das funções existentes (`proximoVencimento`, `primeiroPendente`, `somarDias`), testada via Vitest. A página `Recorrentes.tsx` apenas formata o resultado retornado.

**Tech Stack:** TypeScript, React, Vite, Vitest.

## Global Constraints

- Comparação de datas sempre por string ISO `YYYY-MM-DD` (ordem lexicográfica), consistente com o restante do código.
- Para calcular diferença em dias, usar `new Date(iso + 'T00:00:00').getTime()` (padrão já usado em `finance.ts`), nunca `Date.parse(iso)`.
- Texto de UI em português.
- Versão do app (`package.json` e `CHANGELOG.md`) será incrementada uma única vez no deploy conjunto das duas melhorias — NÃO nesta plan.
- `npm test` = `vitest run`; `npm run build` = `tsc --noEmit && vite build`.

---

### Task 1: Função pura `statusRecorrente`

**Files:**
- Modify: `src/lib/finance.ts` (adicionar ao final, após `gerarRecorrentesPendentes`)
- Test: `src/lib/finance.test.ts` (adicionar novo `describe` no final)

**Interfaces:**
- Consumes: `Recorrente` (de `../types`), `somarDias`, `proximoVencimento`, `primeiroPendente` — todos já exportados em `finance.ts`.
- Produces:
  ```ts
  export type StatusRecorrente =
    | { tipo: 'atrasado'; data: string }
    | { tipo: 'hoje' }
    | { tipo: 'amanha' }
    | { tipo: 'futuro'; data: string };

  export function statusRecorrente(rec: Recorrente, hoje: string): StatusRecorrente
  ```
  Os objetos `atrasado`/`futuro` carregam a data do vencimento em ISO (`YYYY-MM-DD`).

- [ ] **Step 1: Escrever os testes que falham**

Adicione ao final de `src/lib/finance.test.ts` (os fixtures `aluguel`, `academia` e `salario` já existem no arquivo):

```ts
import { statusRecorrente } from './finance';

describe('statusRecorrente', () => {
  it('atrasada com ultimo_processado mostra a pendência vencida', () => {
    const rec = { ...aluguel, ultimo_processado: '2026-06-30' };
    expect(statusRecorrente(rec, '2026-08-10')).toEqual({ tipo: 'atrasado', data: '2026-07-31' });
  });

  it('nunca processada e dia do mês já passou mostra atrasado', () => {
    const rec = { ...salario, ultimo_processado: null };
    expect(statusRecorrente(rec, '2026-07-10')).toEqual({ tipo: 'atrasado', data: '2026-07-05' });
  });

  it('vence hoje com ultimo_processado', () => {
    const rec = { ...salario, ultimo_processado: '2026-06-05' };
    expect(statusRecorrente(rec, '2026-07-05')).toEqual({ tipo: 'hoje' });
  });

  it('vence hoje nunca processada', () => {
    const rec = { ...salario, ultimo_processado: null };
    expect(statusRecorrente(rec, '2026-07-05')).toEqual({ tipo: 'hoje' });
  });

  it('vence amanhã com ultimo_processado', () => {
    const rec = { ...salario, ultimo_processado: '2026-06-05' };
    expect(statusRecorrente(rec, '2026-07-04')).toEqual({ tipo: 'amanha' });
  });

  it('vence amanhã nunca processada', () => {
    const rec = { ...salario, ultimo_processado: null };
    expect(statusRecorrente(rec, '2026-07-04')).toEqual({ tipo: 'amanha' });
  });

  it('futura mostra a data do próximo vencimento', () => {
    const rec = { ...salario, ultimo_processado: '2026-07-05' };
    expect(statusRecorrente(rec, '2026-07-20')).toEqual({ tipo: 'futuro', data: '2026-08-05' });
  });

  it('nunca processada e dia ainda não chegou no mês é futuro', () => {
    const rec = { ...aluguel, ultimo_processado: null };
    expect(statusRecorrente(rec, '2026-07-20')).toEqual({ tipo: 'futuro', data: '2026-07-31' });
  });

  it('inativa não mostra pendência, só o próximo vencimento futuro', () => {
    const rec = { ...aluguel, ativo: false, ultimo_processado: '2026-07-31' };
    expect(statusRecorrente(rec, '2026-08-05')).toEqual({ tipo: 'futuro', data: '2026-08-31' });
  });

  it('inativa com ultimo_processado antigo avança até o próximo futuro', () => {
    const rec = { ...aluguel, ativo: false, ultimo_processado: '2026-01-31' };
    expect(statusRecorrente(rec, '2026-08-05')).toEqual({ tipo: 'futuro', data: '2026-08-31' });
  });

  it('dia 31 em mês com 28 dias vence hoje (clamp)', () => {
    const rec = { ...aluguel, ultimo_processado: '2026-01-31' };
    expect(statusRecorrente(rec, '2026-02-28')).toEqual({ tipo: 'hoje' });
  });
});
```

Nota: `aluguel` é mensal dia 31, `salario` é mensal dia 5. Não reimporte os fixtures; eles já estão no escopo do arquivo.

- [ ] **Step 2: Rodar os testes e confirmar que falham**

Run: `npm test`
Expected: FAIL — `statusRecorrente` não está definida/exportada em `finance.ts` (erro de import/resolve).

- [ ] **Step 3: Implementar `statusRecorrente`**

Adicione ao final de `src/lib/finance.ts`:

```ts
export type StatusRecorrente =
  | { tipo: 'atrasado'; data: string }
  | { tipo: 'hoje' }
  | { tipo: 'amanha' }
  | { tipo: 'futuro'; data: string };

export function statusRecorrente(rec: Recorrente, hoje: string): StatusRecorrente {
  const amanha = somarDias(hoje, 1);

  const classificar = (data: string): StatusRecorrente => {
    if (data < hoje) return { tipo: 'atrasado', data };
    if (data === hoje) return { tipo: 'hoje' };
    if (data === amanha) return { tipo: 'amanha' };
    return { tipo: 'futuro', data };
  };

  if (!rec.ativo) {
    const base = rec.ultimo_processado ?? somarDias(hoje, -1);
    let data = proximoVencimento(rec, base);
    while (data < hoje) data = proximoVencimento(rec, data);
    return { tipo: 'futuro', data };
  }

  if (rec.ultimo_processado) {
    return classificar(proximoVencimento(rec, rec.ultimo_processado));
  }

  const pendente = primeiroPendente(rec, hoje);
  if (pendente) return classificar(pendente);
  return classificar(proximoVencimento(rec, somarDias(hoje, -1)));
}
```

`Recorrente`, `somarDias`, `proximoVencimento` e `primeiroPendente` já estão no escopo do arquivo (import/definição existentes).

- [ ] **Step 4: Rodar os testes e confirmar que passam**

Run: `npm test`
Expected: PASS — todos os `describe` verdes, incluindo os novos `statusRecorrente`.

- [ ] **Step 5: Commit**

```bash
git add src/lib/finance.ts src/lib/finance.test.ts
git commit -m "feat: status de vencimento das recorrentes (função pura)"
```

---

### Task 2: Exibição do status na página Recorrentes

**Files:**
- Modify: `src/pages/Recorrentes.tsx:4` (import finance), `src/pages/Recorrentes.tsx:5` (import format), `src/pages/Recorrentes.tsx:30-33` (remover `proximoDe`), `src/pages/Recorrentes.tsx:92` (linha de status)

**Interfaces:**
- Consumes: `statusRecorrente(rec, hoje)` e `StatusRecorrente` de `src/lib/finance.ts`; `dataBonita(iso)` e `hojeISO()` de `src/lib/format.ts`.
- Produces: nada novo — apenas a exibição.

- [ ] **Step 1: Atualizar imports**

Em `src/pages/Recorrentes.tsx`, substituir:

```tsx
import { proximoVencimento, somarDias } from '../lib/finance';
import { brl, hojeISO } from '../lib/format';
```

por:

```tsx
import { statusRecorrente } from '../lib/finance';
import { brl, dataBonita, hojeISO } from '../lib/format';
```

- [ ] **Step 2: Remover `proximoDe` e adicionar `statusLinha`**

Substituir (linhas 30-33):

```tsx
  const proximoDe = (r: Recorrente): string => {
    const base = r.ultimo_processado ?? somarDias(hoje, -1);
    return proximoVencimento(r, base);
  };
```

por:

```tsx
  const statusLinha = (r: Recorrente) => {
    const s = statusRecorrente(r, hoje);
    if (s.tipo === 'atrasado') return <p className="text-xs text-danger">Pendente desde {dataBonita(s.data)}</p>;
    if (s.tipo === 'hoje') return <p className="text-xs font-semibold text-primary">Vence hoje</p>;
    if (s.tipo === 'amanha') return <p className="text-xs font-semibold text-primary">Vence amanhã</p>;
    const dias = Math.round((new Date(s.data + 'T00:00:00').getTime() - new Date(hoje + 'T00:00:00').getTime()) / 86400000);
    return <p className="text-xs text-ink-muted">Em {dias} dias ({dataBonita(s.data)})</p>;
  };
```

A variável `hoje` (de `hojeISO()`) já existe na linha 28 — `statusLinha` a usa do closure.

- [ ] **Step 3: Usar `statusLinha` na listagem**

Substituir (linha 92):

```tsx
                <p className="text-xs text-ink-muted">Próximo: {proximoDe(r)} · {r.frequencia}</p>
```

por:

```tsx
                {statusLinha(r)}
```

- [ ] **Step 4: Rodar testes e build**

Run: `npm test`
Expected: PASS.

Run: `npm run build`
Expected: sucesso (`tsc --noEmit` sem erros + `vite build` gera `dist/`).

- [ ] **Step 5: Commit**

```bash
git add src/pages/Recorrentes.tsx
git commit -m "feat: exibir status de vencimento das recorrentes na listagem"
```

---

### Self-Review

**Spec coverage:**
- Função pura `statusRecorrente` com tipo `StatusRecorrente` — Task 1.
- Lógica de `ultimo_processado` vs `null`, inativas, comparação ISO, reuso de `somarDias`/`proximoVencimento`/`primeiroPendente` — Task 1.
- Exibição na listagem com os 4 estados e `dataBonita` — Task 2.
- Testes cobrindo: atrasada (c/ e s/ `ultimo_processado`), hoje (c/ e s/), amanhã (c/ e s/), futura, nunca processada → futuro, inativa (2 casos), clamp dia 31 — Task 1.

**Placeholder scan:** nenhum passo descreve sem mostrar código.

**Type consistency:** `StatusRecorrente` e `statusRecorrente(rec, hoje)` usados com a mesma assinatura na Task 1 e Task 2; `dataBonita` e `hojeISO` existem em `format.ts`; `text-danger`/`text-primary`/`text-ink-muted` são classes Tailwind já usadas no app.
