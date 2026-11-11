# Cantina da Mídia

App de vendas da cantina da equipe de mídia da Igreja Casa do Pai. É uma PWA offline-first:
abre e funciona sem internet depois da primeira visita.

> Estado atual: configuração inicial. As telas de venda e a sincronização ainda não existem.

## Requisitos

- Node.js 22 ou mais novo
- npm

## Rodar localmente

```bash
npm install
cp .env.example .env.local   # preencha DATABASE_URL
npm run dev                  # http://localhost:3000
```

O service worker só é gerado no build de produção. Para testar o modo offline no navegador:

```bash
npm run build && npm run start
```

## Variáveis de ambiente

| Variável | Obrigatória | Para que serve |
|---|---|---|
| `DATABASE_URL` | sim | Conexão de servidor com o Postgres do Supabase (pooler em modo transação, porta 6543). |
| `CANTINA_SLUG` | não | Cantina atendida por este deploy. Padrão: `midia`. |

Na Vercel, cadastre as mesmas variáveis em *Settings > Environment Variables*.

## Banco de dados (Drizzle + Supabase)

O schema fica em `src/db/schema.ts` e as migrations em `drizzle/`.

```bash
npm run db:generate   # gera uma migration a partir das mudanças no schema
npm run db:migrate    # aplica as migrations pendentes no banco da DATABASE_URL
npm run db:seed       # cria a cantina "Mídia" com 2 produtos (pode rodar mais de uma vez)
npm run db:studio     # abre o Drizzle Studio para ver os dados
```

Triggers, permissões e outras coisas que o Drizzle não gera ficam em migrations customizadas
(`npx drizzle-kit generate --custom --name=descricao`).

## Testes

```bash
npm run lint
npm run typecheck
npm test              # Vitest (unidade)
npm run test:e2e      # build + Playwright (ponta a ponta, inclusive offline)
```

Na primeira vez, instale o navegador do Playwright: `npx playwright install chromium`.

O GitHub Actions (`.github/workflows/ci.yml`) roda lint, typecheck, Vitest, build e Playwright em cada push.

## Estrutura

```
src/
  app/                 páginas e rotas (App Router)
    api/health/        GET /api/health → { ok: true }
    api/produtos/      GET /api/produtos
    serwist/[path]/    gera o service worker no build
    sw.ts              código do service worker
    manifest.ts        manifest da PWA
  db/                  schema e conexão do Drizzle (só servidor)
  local-db/            banco local no IndexedDB (Dexie) e fila outbox
  server/              código só de servidor (configuração)
drizzle/               migrations SQL
scripts/seed.ts        seed inicial
e2e/                   testes Playwright
```

## Decisões de arquitetura

- **PWA com Next.js** (App Router) e TypeScript em modo strict.
- **Offline-first.** No futuro, a interface vai ler e gravar só no IndexedDB (Dexie.js), e uma
  fila outbox vai sincronizar com a API.
- **Banco no Supabase (Postgres), acessado só pela API do Next.js com Drizzle ORM.** O navegador
  nunca fala direto com o banco. Todas as tabelas têm RLS ativo sem nenhuma policy, e as chaves
  públicas do Supabase (`anon` e `authenticated`) não têm permissão nelas.
- **v1 sem login e sem código de acesso.** A API não tem autenticação: quem souber o endereço do
  app consegue ler e gravar os dados.
- **Hospedagem na Vercel.**
- **Testes:** Vitest (unidade) e Playwright (ponta a ponta, incluindo modo offline).
- **Pagamentos só em Pix e dinheiro**, registrados manualmente.

Regras do schema:

- IDs `uuid`, aceitando IDs gerados pelo cliente.
- Dinheiro sempre em centavos (`integer`), nunca decimal.
- `cantina_id` em todas as tabelas.
- Nada é apagado: use `ativo`, `fechado_em`, `cancelado_em`, status `cancelado` ou `estornado_em`.
- Toda tabela tem `atualizado_em` e `seq`. O `seq` vem de uma sequência global do Postgres
  (`sync_seq`), preenchida por trigger a cada insert e update, e é o cursor da sincronização.
- A fonte (Geist Mono) é servida pelo próprio app, sem Google Fonts, para funcionar offline.
