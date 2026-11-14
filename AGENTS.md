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
- **Toda escrita local passa por `src/local-db/escritas.ts`**, que grava a linha e o item da outbox
  na mesma transação. As telas leem com `useLeituraLocal(lerBancoLocal)` e calculam em um modelo de
  leitura puro em `src/lib/<tela>.ts`, com testes.
- **Um componente ou função por arquivo.** Nada de subcomponentes ou funções auxiliares empilhados no
  mesmo arquivo: cada um ganha o seu (o ESLint cobra com `react/no-multi-comp`). Exceção: os arquivos
  do shadcn em `src/componentes/ui`, que agrupam as partes do componente por convenção.
- **Interface com shadcn/ui** em `src/componentes/ui`. Use esses componentes antes de escrever um
  controle à mão. As cores vêm dos tokens de `globals.css` (nomes do shadcn); não use hex solto.
- **Dependências: use `npx npm@10 install`.** O npm 11 deste ambiente apaga do `package-lock.json`
  os bindings nativos do rolldown e quebra o Vitest (o CLI do shadcn também roda `npm install`).
  Depois de mexer em dependências, `grep -c 'node_modules/@rolldown/binding-' package-lock.json`
  tem que dar 15.
- **Segredos só no servidor.** Nunca crie variáveis `NEXT_PUBLIC_` com segredos.
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
