# Forno Bella Pizzeria

Site de pedidos delivery com painel do dono (ADM). Versão de **demonstração**, feita para ser copiada para cada pizzaria cliente (uma cópia por cliente).

Os documentos de planejamento aprovados ficam em `docs/` (REQUIREMENTS, ARCHITECTURE, DATABASE, SECURITY e os demais). O andamento de cada fase está em [`docs/PROGRESSO.md`](docs/PROGRESSO.md).

## Tecnologias

- **Site e ADM:** React, Vite, TypeScript, Tailwind CSS 4 (um app só; o ADM fica em `/admin` e carrega sob demanda).
- **Servidor:** uma função do Supabase (`supabase/functions/api`, Deno) com login próprio do dono, cálculo do pedido, entrega e webhooks.
- **Banco:** Postgres do Supabase, com RLS ligada em todas as tabelas e sem acesso público direto.
- **Hospedagem:** Vercel, que encaminha `/api` para a função (mesma origem para o cookie de sessão).

## Estrutura

```
src/                          site e ADM (React)
supabase/functions/_shared/   regras do negócio usadas pelo site e pelo servidor (preço, entrega, horário, status, tema)
supabase/functions/api/       a função do servidor (rotas, banco, login)
supabase/migrations/          estrutura do banco (SQL versionado)
supabase/seed/demo.sql        dados de demonstração (cardápio, horários, faixas, paletas)
tests/                        testes de integração e verificações do banco
scripts/                      utilitários (verificação do banco, medição do hash de senha)
docs/                         documentos de planejamento
```

## Rodar no computador

Pré-requisitos: Node 20.19 ou mais novo, Docker (para o Supabase local) e o Supabase CLI (vem no `npm install`).

```bash
npm install
cp .env.example .env.local
cp supabase/.env.example supabase/.env.local   # preencha os valores de teste
npm run db:start      # sobe o Postgres e o Supabase locais (Docker)
npm run db:reset      # aplica migrações e o seed de demonstração
npm run fn:serve      # função api em http://127.0.0.1:54321/functions/v1/api
npm run dev           # site em http://localhost:5173 (o /api vai para a função local)
```

## Testes

```bash
npm test                                   # unitários; integração se DATABASE_URL estiver definida
DATABASE_URL=postgres://... npm run test:db   # migrações, seed, RLS e restrições num banco de TESTE vazio
npm run typecheck && npm run typecheck:fn  # tipos do site e da função (Deno)
```

`scripts/db/check.sh` apaga dados: use só num banco de teste.

## Segredos

Nenhum segredo vai para o repositório. Os do servidor ficam em `supabase/.env.local` (local) ou em `supabase secrets set` (produção). Só a chave pública do Turnstile vai para o navegador.

## Observação sobre as versões das dependências

As versões do `package.json` foram definidas sem acesso à internet. No primeiro `npm install`, confira se alguma precisa de ajuste e grave o `package-lock.json` no repositório.
