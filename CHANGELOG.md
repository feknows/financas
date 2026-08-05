# Changelog

## 1.1.0 — 2026-08-05

- Recorrentes mostram o status de vencimento em cada linha (Pendente desde, Vence hoje, Vence amanhã, Em X dias).
- Exclusões (lançamentos, contas, categorias, metas e recorrentes) agora são adiadas por 6 segundos com botão Desfazer — e o `confirm()` de confirmação foi removido.
- Desfazer re-insere o item no lugar original; se a exclusão falhar no banco, o item é restaurado automaticamente.

## 1.0.0 — 2026-07-31

- Primeira versão do app Finanças (PWA).
- Contas (corrente, investimento, espécie, cartão) com saldo calculado e fatura do cartão.
- Categorias criadas pelo usuário.
- Lançamentos com receitas, despesas e transferências (atualização otimista).
- Recorrentes com geração automática de lançamentos.
- Projeção de saldo para os próximos 6 meses com gráfico.
- Metas de poupança com depósito mensal sugerido.
- Limites por categoria com alertas de 80% e 100%.
- Tema "Ledger de papel", mobile-first, instalável no iOS.
