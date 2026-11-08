<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Cantina da Mídia: regras para IAs

Leia o `README.md` antes de mudar qualquer coisa. Estas regras valem para todo código novo.

## Arquitetura

- **O navegador nunca acessa o banco.** Nada de cliente do Supabase no front, nada de chave
  pública. Todo acesso ao Postgres passa pelas rotas em `src/app/api/` usando `getDb()` de
  `src/db`. O módulo `src/db` importa `server-only`; não o importe em componentes de cliente
  (só `import type` do schema é permitido no navegador).
- **Offline-first.** A interface vai ler e gravar no IndexedDB (`src/local-db`, Dexie). Mudanças
  locais entram na tabela `outbox` e são enviadas à API depois. Não faça a interface depender da
  rede para funcionar.
- **Código da equipe.** Toda rota de API que lê ou grava dados chama `exigirCodigoEquipe(request)`
  de `src/server/codigo-acesso.ts` antes de qualquer outra coisa. O código vive em
  `CODIGO_ACESSO_EQUIPE`, só no servidor; nunca crie variáveis `NEXT_PUBLIC_` com segredos.
- **Toda escrita no servidor é idempotente:** upsert pelo `id`
  (`insert ... on conflict (id) do update`). O mesmo item da outbox pode chegar mais de uma vez.

## Regras do schema (`src/db/schema.ts`)

- IDs são `uuid` e podem ser gerados pelo cliente (`crypto.randomUUID()`). O servidor aceita o
  ID que vier.
- Dinheiro sempre em centavos, `integer`. Nunca `decimal`, `numeric` ou `float`.
- Toda tabela de negócio tem `cantina_id`, e toda consulta filtra por ele.
- **Nada é apagado.** Não use `DELETE`. Use `ativo = false`, `fechado_em`, `cancelado_em`,
  status `cancelado` ou `estornado_em`.
- Toda tabela tem `atualizado_em` e `seq`, preenchidos pelo trigger `definir_seq_e_atualizado_em`.
  Não grave esses campos à mão. Tabela nova precisa do mesmo trigger (migration customizada).
- Toda tabela nova tem RLS ativo sem policies (`.enableRLS()`) e `REVOKE ALL ... FROM anon, authenticated`.
- Mudou o schema? Rode `npm run db:generate`, revise o SQL gerado e espelhe a mudança no Dexie
  (`src/local-db`) com uma nova `this.version(n)`. Nunca edite uma migration já aplicada.

## Antes de entregar

`npm run lint && npm run typecheck && npm test && npm run test:e2e`
