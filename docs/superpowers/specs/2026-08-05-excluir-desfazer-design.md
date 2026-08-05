# Substituir confirm() por Excluir + Desfazer

Data: 2026-08-05
Projeto: Finanças (PWA)
Status: Aprovado

## Problema

As páginas Lançamentos, Contas, Categorias, Metas e Recorrentes usam `window.confirm()` para confirmar exclusões. O popup nativo do browser não combina com o restante do app (visual inconsistente, sem contexto, sem opção de desfazer).

## Objetivo

Substituir o `confirm()` por um fluxo **Excluir + Desfazer** (padrão Gmail/Slack):
- Ao excluir, o item sai da tela imediatamente e um toast "excluído" aparece com botão **Desfazer**
- O toast some sozinho após ~6s; se ninguém desfazer, a exclusão é persistida no Supabase
- Se clicar em **Desfazer**, o item volta e a exclusão no banco é cancelada

## Abordagem escolhida

Delete **adiado**: a exclusão no Supabase só é executada quando a janela de desfazer expira (6s). Isso torna o undo trivial (nada foi persistido ainda) e evita problemas de FK (ex: conta com lançamentos em cascata) e de id que muda no re-insert.

Trade-off: se o app for fechado durante a janela, o registro não é apagado e volta ao recarregar — comportamento seguro (nada é perdido).

## Mudanças

### 1. `src/store/toast.ts` (novo)

Store Zustand global para o toast:

```ts
interface ToastState {
  mensagem: string;
  visivel: boolean;
  onDesfazer: (() => void) | null;
  mostrar: (mensagem: string, onDesfazer: (() => void) | null) => void;
  esconder: () => void;
}
```

- `mostrar` define mensagem, callback de desfazer e marca `visivel = true`
- `esconder` limpa e marca `visivel = false`
- Auto-dismiss em ~6s é responsabilidade do componente `Toast`

### 2. `src/components/Toast.tsx` (novo)

Snackbar fixo no fundo da tela, acima da barra de navegação (padrão mobile):
- Renderiza nada quando `visivel === false`
- Mensagem + botão **Desfazer** (estilo destacado)
- Ao clicar em Desfazer: chama `onDesfazer()` e `esconder()`
- `useEffect` com `setTimeout(6000)` que chama `esconder()`; reinicia quando a mensagem muda
- Posicionado com `fixed bottom-20` (acima da nav de ~64px + margem) e `z-40`, respeitando o `max-w-lg` centralizado das páginas
- Acessível: `role="status"`/`aria-live="polite"`

### 3. `src/components/AppShell.tsx`

- Renderizar `<Toast />` no final do layout. Todas as telas logadas passam pelo AppShell; Login não tem exclusões.

### 4. `src/store/data.ts` — exclusões adiadas

As funções `excluirConta`, `excluirCategoria`, `excluirLancamento`, `excluirMeta` e `excluirRecorrente` mudam para o padrão abaixo (mantendo a mesma assinatura `(id: number)`):

```ts
excluirLancamento: async (id) => {
  const antes = get().lancamentos;
  set({ lancamentos: antes.filter((x) => x.id !== id) });      // remove otimista
  let cancelado = false;
  useToastStore.getState().mostrar('Lançamento excluído', () => {
    cancelado = true;
    set({ lancamentos: antes });                                // desfaz
  });
  setTimeout(async () => {
    if (cancelado) return;                                       // undo cancela o delete
    const { error } = await supabase.from('lancamentos').delete().eq('id', id);
    if (error) set({ lancamentos: antes });                      // rollback em falha
  }, 6000);
}
```

Mensagens do toast por entidade:
- Lançamento → "Lançamento excluído"
- Conta → "Conta excluída"
- Categoria → "Categoria excluída"
- Meta → "Meta excluída"
- Recorrente → "Recorrente excluída"

`excluirLimite` **não muda** (hoje não usa `confirm`).

### 5. Páginas — remover `confirm()`

- `src/pages/Lancamentos.tsx` (linha 47-50)
- `src/pages/Contas.tsx` (linha 56)
- `src/pages/Categorias.tsx` (linha 45)
- `src/pages/Metas.tsx` (linha 57)
- `src/pages/Recorrentes.tsx` (linha 68-71)

Cada uma passa a chamar `excluirX(id)` **sem `await`** (a função retorna imediatamente; o delete acontece no timer de 6s). Remover a variável de texto usada no `confirm` quando ela só existia para isso.

## Fora de escopo

- Fila de múltiplos toasts simultâneos (um por vez; novo `mostrar` substitui o anterior)
- Animações complexas de entrada/saída
- Undo após persistência real no servidor
- Desfazer de limites
- Alterar o padrão do `confirm` para outras confirmações futuras

## Verificação

- `npm test` (testes unitários passam)
- `npm run build` (tsc + vite build verde)
