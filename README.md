# Finanças

Controle de gastos e economia pessoal — PWA mobile-first.

## Setup

1. Crie um projeto no Supabase e habilite **Email/Password** em Authentication > Providers.
2. Crie um usuário em Authentication > Users (Auto-confirm: ✅).
3. Copie `.env.example` para `.env.local` e preencha `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`.
4. Rode `supabase/schema.sql` no SQL Editor.
5. `npm install` e `npm run dev`.

## Comandos

| Comando | Descrição |
|---|---|
| `npm run dev` | Dev server |
| `npm test` | Testes (Vitest) |
| `npm run build` | Typecheck + build |
| `npm run gen-icons` | Regenera os ícones PWA |
