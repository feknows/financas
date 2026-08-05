# Substituir confirm() por Excluir + Desfazer — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Substituir `window.confirm()` por um fluxo **Excluir + Desfazer** (Gmail/Slack) em Lançamentos, Contas, Categorias, Metas e Recorrentes, com delete adiado de 6s no Supabase e toast com botão Desfazer.

**Architecture:** Delete adiado — a exclusão no Supabase só roda em `setTimeout(6000)`; nesse meio-tempo o item sai otimista da tela e um toast global (store Zustand + componente) oferece **Desfazer**, que cancela o timer e restaura o item no store. Nada é persistido durante a janela, então o undo é trivial.

**Tech Stack:** TypeScript, React, Zustand, Vite, Vitest.

## Global Constraints

- Manter a assinatura `(id: number)` das funções `excluirConta`, `excluirCategoria`, `excluirLancamento`, `excluirRecorrente`, `excluirMeta` no `DataState`.
- `excluirLimite` NÃO muda.
- As chamadas das páginas passam a ser **sem `await`**.
- Mensagens do toast por entidade: Lançamento → "Lançamento excluído"; Conta → "Conta excluída"; Categoria → "Categoria excluída"; Meta → "Meta excluída"; Recorrente → "Recorrente excluída".
- Texto de UI em português.
- Versão do app (`package.json` e `CHANGELOG.md`) será incrementada uma única vez no deploy conjunto das duas melhorias — NÃO nesta plan.
- `npm test` = `vitest run`; `npm run build` = `tsc --noEmit && vite build`.

---

### Task 1: Store global do toast

**Files:**
- Create: `src/store/toast.ts`
- Test: `src/store/toast.test.ts`

**Interfaces:**
- Consumes: `create` de `zustand` (v4 — mesmo uso de `src/store/auth.ts` e `src/store/data.ts`).
- Produces:
  ```ts
  interface ToastState {
    mensagem: string;
    visivel: boolean;
    onDesfazer: (() => void) | null;
    mostrar: (mensagem: string, onDesfazer: (() => void) | null) => void;
    esconder: () => void;
  }
  export const useToastStore = create<ToastState>((set) => ({ ... }));
  ```
  `mostrar` substitui o toast anterior (um por vez); `esconder` limpa e oculta. Auto-dismiss de 6s é responsabilidade do componente `Toast` (Task 2), não da store.

- [ ] **Step 1: Escrever o teste que falha**

Crie `src/store/toast.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { useToastStore } from './toast';

describe('useToastStore', () => {
  beforeEach(() => {
    useToastStore.setState({ mensagem: '', visivel: false, onDesfazer: null });
  });

  it('mostrar exibe o toast com mensagem e callback de desfazer', () => {
    const fn = () => {};
    useToastStore.getState().mostrar('Conta excluída', fn);
    const s = useToastStore.getState();
    expect(s.visivel).toBe(true);
    expect(s.mensagem).toBe('Conta excluída');
    expect(s.onDesfazer).toBe(fn);
  });

  it('mostrar substitui o toast anterior', () => {
    useToastStore.getState().mostrar('Conta excluída', () => {});
    useToastStore.getState().mostrar('Meta excluída', () => {});
    expect(useToastStore.getState().mensagem).toBe('Meta excluída');
  });

  it('esconder oculta e limpa o callback', () => {
    useToastStore.getState().mostrar('Conta excluída', () => {});
    useToastStore.getState().esconder();
    const s = useToastStore.getState();
    expect(s.visivel).toBe(false);
    expect(s.onDesfazer).toBe(null);
  });
});
```

- [ ] **Step 2: Rodar o teste e confirmar que falha**

Run: `npm test`
Expected: FAIL — `Cannot find module './toast'`.

- [ ] **Step 3: Criar a store**

Crie `src/store/toast.ts`:

```ts
import { create } from 'zustand';

interface ToastState {
  mensagem: string;
  visivel: boolean;
  onDesfazer: (() => void) | null;
  mostrar: (mensagem: string, onDesfazer: (() => void) | null) => void;
  esconder: () => void;
}

export const useToastStore = create<ToastState>((set) => ({
  mensagem: '',
  visivel: false,
  onDesfazer: null,
  mostrar: (mensagem, onDesfazer) => set({ mensagem, onDesfazer, visivel: true }),
  esconder: () => set({ visivel: false, onDesfazer: null })
}));
```

- [ ] **Step 4: Rodar o teste e confirmar que passa**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/store/toast.ts src/store/toast.test.ts
git commit -m "feat: store global do toast de excluir/desfazer"
```

---

### Task 2: Componente `Toast` e renderização no `AppShell`

**Files:**
- Create: `src/components/Toast.tsx`
- Modify: `src/components/AppShell.tsx:45` (renderizar `<Toast />` antes do `</main>`... na verdade dentro do `div` raiz, após `<main>` e `<nav>`)

**Interfaces:**
- Consumes: `useToastStore` de `src/store/toast.ts` (campos `visivel`, `mensagem`, `onDesfazer`, `esconder`).
- Produces: componente `Toast` que renderiza snackbar fixo ou `null`.

- [ ] **Step 1: Criar o componente**

Crie `src/components/Toast.tsx`:

```tsx
import { useEffect } from 'react';
import { useToastStore } from '../store/toast';

export default function Toast() {
  const visivel = useToastStore((s) => s.visivel);
  const mensagem = useToastStore((s) => s.mensagem);
  const onDesfazer = useToastStore((s) => s.onDesfazer);
  const esconder = useToastStore((s) => s.esconder);

  useEffect(() => {
    if (!visivel) return;
    const timer = setTimeout(() => esconder(), 6000);
    return () => clearTimeout(timer);
  }, [visivel, mensagem, esconder]);

  if (!visivel) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-20 left-1/2 z-40 w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 rounded-xl border border-line bg-surface p-4 shadow-lg"
    >
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium">{mensagem}</p>
        {onDesfazer && (
          <button
            onClick={() => { onDesfazer(); esconder(); }}
            className="shrink-0 rounded-lg bg-primary px-3 py-1.5 text-sm font-semibold text-white"
          >
            Desfazer
          </button>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Renderizar no `AppShell`**

Em `src/components/AppShell.tsx`, adicionar import no topo:

```tsx
import Toast from './Toast';
```

E, dentro do `div` raiz, após o `</nav>` (linha 64) e antes do `</div>` final:

```tsx
      <Toast />
```

- [ ] **Step 3: Rodar testes e build**

Run: `npm test`
Expected: PASS.

Run: `npm run build`
Expected: sucesso.

- [ ] **Step 4: Commit**

```bash
git add src/components/Toast.tsx src/components/AppShell.tsx
git commit -m "feat: componente Toast com botão desfazer renderizado no AppShell"
```

---

### Task 3: Exclusões adiadas no store de dados

**Files:**
- Modify: `src/store/data.ts:2` (import), `src/store/data.ts:134-138` (`excluirConta`), `src/store/data.ts:154-158` (`excluirCategoria`), `src/store/data.ts:183-188` (`excluirLancamento`), `src/store/data.ts:207-211` (`excluirRecorrente`), `src/store/data.ts:250-254` (`excluirMeta`)

**Interfaces:**
- Consumes: `supabase` de `src/lib/supabase.ts`, `useToastStore` de `./toast`.
- Produces: as 5 funções `excluirX(id)` com a MESMA assinatura `(id: number) => Promise<void>` do `DataState`, mas agora retornando imediatamente (o delete ocorre em timer de 6s).

- [ ] **Step 1: Importar a toast store**

Em `src/store/data.ts`, adicionar logo após `import { hojeISO } from '../lib/format';`:

```ts
import { useToastStore } from './toast';
```

- [ ] **Step 2: Substituir as 5 exclusões**

Substituir `excluirConta` (linhas 134-138):

```ts
  excluirConta: async (id) => {
    const { error } = await supabase.from('contas').delete().eq('id', id);
    if (error) throw error;
    set({ contas: get().contas.filter((c) => c.id !== id) });
  },
```

por:

```ts
  excluirConta: async (id) => {
    const antes = get().contas;
    set({ contas: antes.filter((x) => x.id !== id) });
    let cancelado = false;
    useToastStore.getState().mostrar('Conta excluída', () => {
      cancelado = true;
      set({ contas: antes });
    });
    setTimeout(async () => {
      if (cancelado) return;
      const { error } = await supabase.from('contas').delete().eq('id', id);
      if (error) set({ contas: antes });
    }, 6000);
  },
```

Substituir `excluirCategoria` (linhas 154-158):

```ts
  excluirCategoria: async (id) => {
    const { error } = await supabase.from('categorias').delete().eq('id', id);
    if (error) throw error;
    set({ categorias: get().categorias.filter((c) => c.id !== id) });
  },
```

por:

```ts
  excluirCategoria: async (id) => {
    const antes = get().categorias;
    set({ categorias: antes.filter((x) => x.id !== id) });
    let cancelado = false;
    useToastStore.getState().mostrar('Categoria excluída', () => {
      cancelado = true;
      set({ categorias: antes });
    });
    setTimeout(async () => {
      if (cancelado) return;
      const { error } = await supabase.from('categorias').delete().eq('id', id);
      if (error) set({ categorias: antes });
    }, 6000);
  },
```

Substituir `excluirLancamento` (linhas 183-188):

```ts
  excluirLancamento: async (id) => {
    const antes = get().lancamentos;
    set({ lancamentos: antes.filter((x) => x.id !== id) });
    const { error } = await supabase.from('lancamentos').delete().eq('id', id);
    if (error) { set({ lancamentos: antes }); throw error; }
  },
```

por:

```ts
  excluirLancamento: async (id) => {
    const antes = get().lancamentos;
    set({ lancamentos: antes.filter((x) => x.id !== id) });
    let cancelado = false;
    useToastStore.getState().mostrar('Lançamento excluído', () => {
      cancelado = true;
      set({ lancamentos: antes });
    });
    setTimeout(async () => {
      if (cancelado) return;
      const { error } = await supabase.from('lancamentos').delete().eq('id', id);
      if (error) set({ lancamentos: antes });
    }, 6000);
  },
```

Substituir `excluirRecorrente` (linhas 207-211):

```ts
  excluirRecorrente: async (id) => {
    const { error } = await supabase.from('recorrentes').delete().eq('id', id);
    if (error) throw error;
    set({ recorrentes: get().recorrentes.filter((x) => x.id !== id) });
  },
```

por:

```ts
  excluirRecorrente: async (id) => {
    const antes = get().recorrentes;
    set({ recorrentes: antes.filter((x) => x.id !== id) });
    let cancelado = false;
    useToastStore.getState().mostrar('Recorrente excluída', () => {
      cancelado = true;
      set({ recorrentes: antes });
    });
    setTimeout(async () => {
      if (cancelado) return;
      const { error } = await supabase.from('recorrentes').delete().eq('id', id);
      if (error) set({ recorrentes: antes });
    }, 6000);
  },
```

Substituir `excluirMeta` (linhas 250-254):

```ts
  excluirMeta: async (id) => {
    const { error } = await supabase.from('metas').delete().eq('id', id);
    if (error) throw error;
    set({ metas: get().metas.filter((x) => x.id !== id) });
  }
```

por:

```ts
  excluirMeta: async (id) => {
    const antes = get().metas;
    set({ metas: antes.filter((x) => x.id !== id) });
    let cancelado = false;
    useToastStore.getState().mostrar('Meta excluída', () => {
      cancelado = true;
      set({ metas: antes });
    });
    setTimeout(async () => {
      if (cancelado) return;
      const { error } = await supabase.from('metas').delete().eq('id', id);
      if (error) set({ metas: antes });
    }, 6000);
  }
```

`excluirLimite` (linhas 228-232) permanece intacto.

- [ ] **Step 3: Rodar testes e build**

Run: `npm test`
Expected: PASS (inclui os testes do toast store da Task 1).

Run: `npm run build`
Expected: sucesso.

- [ ] **Step 4: Commit**

```bash
git add src/store/data.ts
git commit -m "feat: exclusões adiadas com desfazer no store de dados"
```

---

### Task 4: Páginas removem o `confirm()`

**Files:**
- Modify: `src/pages/Lancamentos.tsx:47-50`, `src/pages/Contas.tsx:53-58`, `src/pages/Categorias.tsx:44-47`, `src/pages/Metas.tsx:56-59`, `src/pages/Recorrentes.tsx:68-71`

**Interfaces:**
- Consumes: as 5 funções `excluirX(id)` de `src/store/data.ts` (Task 3).
- Produces: nada novo — handlers que chamam `excluirX(id)` sem `await`.

- [ ] **Step 1: `Lancamentos.tsx`**

Substituir (linhas 47-50):

```tsx
  const excluir = async (l: Lancamento) => {
    if (!confirm('Excluir este lançamento?')) return;
    try { await excluirLancamento(l.id); } catch { /* silencioso */ }
  };
```

por:

```tsx
  const excluir = (l: Lancamento) => {
    excluirLancamento(l.id);
  };
```

- [ ] **Step 2: `Contas.tsx`**

Substituir (linhas 53-58):

```tsx
  const excluir = async (c: Conta) => {
    const temLancamentos = lancamentos.some((l) => l.conta_id === c.id || l.conta_destino_id === c.id);
    if (temLancamentos) { alert('Não é possível excluir: a conta tem lançamentos.'); return; }
    if (!confirm(`Excluir a conta "${c.nome}"?`)) return;
    try { await excluirConta(c.id); } catch { /* silencioso */ }
  };
```

por:

```tsx
  const excluir = (c: Conta) => {
    const temLancamentos = lancamentos.some((l) => l.conta_id === c.id || l.conta_destino_id === c.id);
    if (temLancamentos) { alert('Não é possível excluir: a conta tem lançamentos.'); return; }
    excluirConta(c.id);
  };
```

O guard de lançamentos é preservado.

- [ ] **Step 3: `Categorias.tsx`**

Substituir (linhas 44-47):

```tsx
  const excluir = async (cat: Categoria) => {
    if (!confirm(`Excluir a categoria "${cat.nome}"? Lançamentos antigos ficam sem categoria.`)) return;
    try { await excluirCategoria(cat.id); } catch { /* silencioso */ }
  };
```

por:

```tsx
  const excluir = (cat: Categoria) => {
    excluirCategoria(cat.id);
  };
```

- [ ] **Step 4: `Metas.tsx`**

Substituir (linhas 56-59):

```tsx
  const excluir = async (m: Meta) => {
    if (!confirm(`Excluir a meta "${m.nome}"?`)) return;
    try { await excluirMeta(m.id); } catch { /* silencioso */ }
  };
```

por:

```tsx
  const excluir = (m: Meta) => {
    excluirMeta(m.id);
  };
```

- [ ] **Step 5: `Recorrentes.tsx`**

Substituir (linhas 68-71):

```tsx
  const excluir = async (r: Recorrente) => {
    if (!confirm(`Excluir a recorrente "${r.nome}"?`)) return;
    try { await excluirRecorrente(r.id); } catch { /* silencioso */ }
  };
```

por:

```tsx
  const excluir = (r: Recorrente) => {
    excluirRecorrente(r.id);
  };
```

Nota: o nome da entidade agora aparece apenas no toast ("Recorrente excluída"), então a variável do template literal é removida.

- [ ] **Step 6: Confirmar que não sobrou `confirm(`**

Run: `Select-String -Path "src\pages\*.tsx" -Pattern "confirm\("`
Expected: nenhuma ocorrência de `confirm(` em `src/pages`.

- [ ] **Step 7: Rodar testes e build**

Run: `npm test`
Expected: PASS.

Run: `npm run build`
Expected: sucesso.

- [ ] **Step 8: Commit**

```bash
git add src/pages/Lancamentos.tsx src/pages/Contas.tsx src/pages/Categorias.tsx src/pages/Metas.tsx src/pages/Recorrentes.tsx
git commit -m "feat: substituir confirm por excluir com desfazer nas páginas"
```

---

### Task 5: Build final, versionar e publicar (executado UMA vez após as duas melhorias)

**Files:**
- Modify: `package.json` (version), `CHANGELOG.md`

**Interfaces:**
- Consumes: o resultado das Tasks 1-4 desta plan e da plan de status de vencimento (feita antes).
- Produces: deploy em produção do PWA com ambas as melhorias.

- [ ] **Step 1: Testes e build finais**

Run: `npm test`
Expected: PASS.

Run: `npm run build`
Expected: sucesso.

- [ ] **Step 2: Incrementar versão**

Em `package.json`, alterar `"version": "1.0.0"` → `"version": "1.1.0"`.

- [ ] **Step 3: Adicionar entrada no CHANGELOG**

Adicionar no topo de `CHANGELOG.md` (após o `# Changelog`):

```markdown
## 1.1.0 - 2026-08-05

- Recorrentes mostram status de vencimento (pendência atrasada, vence hoje, vence amanhã, dias restantes).
- Exclusões agora usam o padrão Excluir + Desfazer (toast com 6s para desfazer) em vez de confirm() nativo.
```

- [ ] **Step 4: Commit e push**

```bash
git add package.json CHANGELOG.md
git commit -m "chore: bump 1.1.0"
git push
```

- [ ] **Step 5: Deploy produção**

Run (redirect de stdin para não abrir prompt interativo):

```bash
echo y | vercel --prod --yes
```

Confirmar que o deploy terminou com sucesso e que a URL de produção (https://financas-mu-teal.vercel.app) está servindo o bundle novo.

---

### Self-Review

**Spec coverage:**
- Store `toast.ts` com interface exata do spec — Task 1.
- Componente `Toast` com auto-dismiss 6s, botão Desfazer, `fixed bottom-20 z-40 max-w-lg`, `role="status"`/`aria-live` — Task 2.
- `<Toast />` no AppShell — Task 2.
- 5 exclusões adiadas com mesmo padrão do spec (remover otimista → mostrar → timer 6s → cancelado/falha = rollback) e mensagens corretas por entidade — Task 3.
- `excluirLimite` intacto — Task 3.
- 5 páginas removendo `confirm()` e chamando sem `await` — Task 4.
- Fora de escopo respeitado (um toast por vez, sem fila/animações, sem undo pós-servidor) — Tasks 1-4.

**Placeholder scan:** todos os passos de código mostram o conteúdo completo.

**Type consistency:** `mostrar(mensagem, onDesfazer)` e `esconder()` usados igualmente na store (Task 1), no Toast (Task 2) e em `data.ts` (Task 3); assinaturas `excluirX(id)` mantidas. Classes Tailwind (`bg-surface`, `border-line`, `bg-primary`, `text-ink-muted`) já usadas no app.
