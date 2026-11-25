# ARCHITECTURE — Forno Bella Pizzeria

Status: **rascunho para aprovação** · Gerado em 25/11/2026 · Base: ETAPAS 6 a 12.

## 1. Visão geral

```
Navegador (React + Vite)                Vercel                         Supabase
┌───────────────────────┐   HTTPS   ┌────────────────┐  /api/*  ┌─────────────────────────┐
│ Site público          │──────────▶│ arquivos       │─────────▶│ Edge Function "api"     │
│ ADM em /admin         │           │ estáticos +    │ rewrite  │ (login, pedidos, entrega│
│ (consulta a cada ~5 s)│◀──────────│ rewrite /api   │◀─────────│  pagamento, webhooks)   │
└───────────────────────┘           └────────────────┘          │        │                │
                                                                │   Postgres (RLS ligada) │
Mercado Pago ──webhook──────────────────────────────────────────▶│   Storage (fotos)       │
Bot do cliente ◀──webhook assinado──────────────────────────────│   Agendador (pg_cron)   │
Cloudflare Turnstile / OSM Nominatim / BrasilAPI ◀── só o servidor ┘
```

Pontos centrais:
- **O navegador nunca acessa tabelas diretamente.** Tudo passa pela função `api`. As tabelas têm RLS ligada e **nenhuma política para anônimos**; só o servidor (chave de serviço) lê e grava.
- **Sem Supabase Auth.** Login próprio (hash + sessão no servidor), conforme ETAPA 10.
- **Mesma origem:** a Vercel encaminha `/api/*` para a função, então o cookie de sessão é do mesmo endereço do site (primeiro-partido).
- **Sem Realtime:** o ADM e o acompanhamento consultam o servidor periodicamente.

## 2. Tecnologias

| Camada | Escolha |
|---|---|
| Front | React 18, Vite, TypeScript estrito, Tailwind CSS com variáveis de tema |
| Rotas | React Router |
| Dados no front | TanStack Query (cache e consultas periódicas) |
| Formulários e validação | React Hook Form + Zod (esquemas compartilhados com o servidor) |
| Carrinho | estado local salvo no aparelho (localStorage) |
| Servidor | Supabase Edge Functions (Deno, TypeScript), uma função `api` com roteador (ex.: Hono) |
| Banco | Postgres (Supabase), migrações em SQL versionadas |
| Arquivos | Supabase Storage (fotos de produto e logo) |
| Pagamento | Mercado Pago (PIX), sandbox na demonstração |
| Anti-abuso | Cloudflare Turnstile |
| Mapas | OpenStreetMap/Nominatim + BrasilAPI/ViaCEP, atrás de uma interface trocável |
| Hospedagem do site | Vercel |
| Testes | Vitest, Playwright, testes Deno das funções |

## 3. Estrutura do repositório (proposta)

```
/
├─ src/
│  ├─ site/            páginas e componentes públicos
│  ├─ admin/           telas do ADM (carregadas sob demanda)
│  ├─ theme/           aplicação das cores do tema no :root
│  └─ lib/             cliente da API, tipos das respostas
├─ supabase/
│  ├─ functions/_shared/domain/  regras puras: preço, entrega, horário, status, tema e contraste, esquemas Zod
│  ├─ functions/api/   roteador e módulos: auth, repo, routes (e, nas próximas fases, orders, payments, webhooks, maps, admin)
│  ├─ migrations/      SQL versionado
│  └─ seed/            dados de demonstração
├─ docs/               os 10 documentos de planejamento
├─ vercel.json         rewrite /api e fallback de SPA
├─ .env.example        nomes das variáveis, sem valores
└─ package.json
```
`supabase/functions/_shared/` é importado pelo front (atalho `@shared`) e pelo servidor, para que as **regras de preço, taxa e horário sejam as mesmas** nos dois lados (o servidor sempre é quem decide). Fica dentro de `supabase/functions/` porque é a pasta que o Supabase empacota ao publicar a função (ajuste feito na Fase 1).

**Acesso ao banco pela função:** conexão direta ao Postgres com o cliente `postgres` (postgres.js), pela variável `SUPABASE_DB_URL` que o Supabase fornece às funções. Isso permite transações de verdade (mudar status + histórico + evento do bot numa só operação) e consultas sempre parametrizadas. A chave de serviço só será usada para o Storage (envio de fotos).

## 4. Módulos do servidor

| Módulo | Responsabilidade |
|---|---|
| `auth` | login, hash, sessões, limite de tentativas, 2 passos opcional, CSRF |
| `menu` | cardápio público e cadastro no ADM |
| `pricing` | cálculo de itens, promoções, borda, adicionais (função pura, testada) |
| `delivery` | geocodificação com cache, Haversine, faixas, frete grátis |
| `orders` | criação, validação, máquina de estados, histórico de status |
| `payments` | PIX no Mercado Pago, expiração, reembolso |
| `webhooks-in` | recebe Mercado Pago, confere assinatura, idempotência |
| `webhooks-out` | fila de entrega ao bot, assinatura HMAC, novas tentativas |
| `settings` | loja, horários, tema, política de privacidade |
| `privacy` | anonimizar dados de cliente |
| `jobs` | expirar PIX, limpar sessões, reenviar webhooks, limpar caches |
| `maps` | interface `Geocoder` (Nominatim hoje; trocável) |

## 5. Rotas da API (resumo)

**Públicas**
| Método e rota | Função |
|---|---|
| `GET /api/store` | dados públicos da loja, horários, tema, aberto/fechado |
| `GET /api/menu` | cardápio ativo (cache curto) |
| `POST /api/delivery/quote` | valida endereço, retorna distância, taxa e frete grátis |
| `POST /api/orders` | cria pedido (exige Turnstile); para PIX devolve o QR |
| `GET /api/orders/:code?t=<token>` | status do pedido para o cliente |
| `POST /api/payments/:orderCode/retry` | nova tentativa de PIX |
| `POST /api/webhooks/mercadopago` | notificação do gateway |

**ADM (exigem sessão e CSRF)**
| Método e rota | Função |
|---|---|
| `POST /api/admin/login`, `/logout`, `GET /me` | sessão |
| `POST /api/admin/2fa/setup`, `/confirm`, `/disable` | confirmação em dois passos |
| `GET /api/admin/orders?since=` | lista e novos pedidos (consulta periódica) |
| `POST /api/admin/orders/:id/advance`, `/cancel`, `/refund`, `/mark-paid` | operações do pedido |
| `GET /api/admin/dashboard` | resumo de hoje e do mês |
| `CRUD /api/admin/{flavors,sizes,crusts,addons,products,promotions}` | cardápio |
| `PUT /api/admin/settings`, `/hours`, `/fee-bands`, `/theme` | configurações |
| `POST /api/admin/upload` | envio de imagem |
| `POST /api/admin/privacy/anonymize` | apagar dados de um cliente |
| `POST /api/admin/demo/reset` | só quando `IS_DEMO=true` |

Resposta padrão de erro: `{ "error": { "code", "message" } }`, com mensagens em português e sem detalhes internos.

## 6. Sequências principais

**Login do dono**
1. ADM envia e-mail e senha (e código de 2 passos, se ligado) para `POST /api/admin/login`.
2. Servidor confere limite de tentativas, compara a senha com o hash e responde com a mesma mensagem para qualquer falha.
3. Em caso de sucesso: gera ID aleatório de 256 bits, grava **só o hash do ID** em `sessions`, envia cookie `HttpOnly; Secure; SameSite=Strict; Path=/`.
4. Cada requisição do ADM: lê o cookie, calcula o hash, busca a sessão, confere validade, renova o prazo deslizante e valida o cabeçalho anti-CSRF.

**Pedido com PIX**
1. Cliente envia carrinho, dados e token Turnstile para `POST /api/orders`.
2. Servidor: valida Turnstile e limites → loja aberta → itens e preços → endereço, distância e taxa → total.
3. Grava o pedido como `aguardando pagamento` e cria o pagamento PIX no Mercado Pago (chave de idempotência = código do pedido).
4. Devolve código do pedido, token do link e dados do PIX. O navegador mostra o QR e consulta o status.
5. O Mercado Pago chama o webhook; o servidor confere a assinatura, **consulta o pagamento na API do gateway**, e só então marca `recebido` e gera o evento de status.
6. O ADM vê o pedido na próxima consulta, com som.

**Pedido com pagamento na entrega:** igual, sem passos 3 e 5; o pedido já nasce `recebido`.

**Evento para o bot:** ao mudar o status, a mesma transação grava o histórico e um item na fila `bot_deliveries`; o job de entrega envia o POST assinado e repete com espera crescente em caso de falha.

## 7. Tarefas agendadas

| Tarefa | Frequência | Faz |
|---|---|---|
| expirar PIX | a cada minuto | marca `expirado` os pedidos aguardando pagamento vencidos e cancela a cobrança |
| entregar webhooks ao bot | a cada minuto | envia pendentes e reenvia falhas |
| limpar sessões e contadores | diária | remove sessões vencidas e janelas de limite antigas |
| limpar cache de geocodificação | semanal | remove entradas antigas |

## 8. Cache e desempenho

- `GET /api/menu` e `/api/store` com cache curto (CDN da Vercel e navegador), invalidado por tempo.
- Geocodificação com cache por endereço normalizado (respeita o limite de uso do Nominatim).
- Imagens em WebP, carregamento tardio, tamanhos responsivos.
- Código do ADM separado do site por divisão de pacotes.
- Consultas periódicas do ADM e do acompanhamento são leves (`since` e índices por status e data).

## 9. Erros e observabilidade

- Registro estruturado de erros nas funções, **sem dados pessoais nem de pagamento**.
- Cada requisição ganha um ID de correlação, devolvido ao cliente em caso de erro.
- Falhas de webhook de saída e de entrada ficam em tabelas consultáveis pelo dono (aviso no ADM quando há falha repetida).
- Painel de logs do Supabase e da Vercel; alerta simples por e-mail do provedor, a critério de cada cliente.

## 10. Decisões e alternativas descartadas

| Decisão | Alternativa descartada | Motivo |
|---|---|---|
| Edge Functions | servidor Node próprio; Next.js | menos peças por cliente e mesma stack planejada |
| Consulta a cada ~5 s | Supabase Realtime; SSE | compatível com login próprio e mais simples; atraso aceito |
| Login próprio | Supabase Auth | pedido do dono: e-mail e senha só no servidor, com hash e ID de sessão guardados no servidor |
| Um app com /admin | dois apps | cópia por cliente mais simples |
| Mesma origem via rewrite | cookie em domínio do Supabase | evita bloqueio de cookie de terceiros |

## 11. Riscos técnicos (a validar na Fase 0 do plano)

1. **Hash de senha na Edge Function:** Argon2id em WebAssembly pode estourar o limite de CPU da função; planejar parâmetros moderados e, se necessário, usar PBKDF2-SHA256 do WebCrypto com muitas iterações ou scrypt/bcrypt. Medir antes de decidir. **Fase 0 (25/11/2026):** implementado PBKDF2-HMAC-SHA256 nativo do WebCrypto, 600.000 iterações, cerca de 90 ms por hash medido localmente. O formato guardado descreve o algoritmo, então dá para trocar por Argon2id depois sem perder senhas. Falta medir dentro da função no Supabase.
2. **Rewrite da Vercel com cookies:** confirmar que `Set-Cookie` e `Cookie` atravessam o encaminhamento sem alteração e que o Secure/SameSite se comportam.
3. **Limites de tempo e memória das funções** em chamadas externas (geocodificação, Mercado Pago); definir tempos máximos e respostas amigáveis.
4. **Nominatim:** uso gratuito e limitado, com exigência de identificação do aplicativo e de cache; imprecisão em alguns endereços.
5. **Aba do ADM em segundo plano:** navegadores reduzem a frequência de tarefas e bloqueiam som até haver interação; ver `ADMIN_PANEL.md`.
6. **Ordem e duplicidade de webhooks:** tratar por idempotência e consulta ao gateway.
7. **Agendador do Supabase** (pg_cron/funções agendadas): confirmar disponibilidade no plano gratuito e a frequência mínima.
