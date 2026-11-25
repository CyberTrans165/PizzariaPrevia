# DEPLOYMENT — Forno Bella Pizzeria

Status: **rascunho para aprovação** · Gerado em 25/11/2026 · Base: ETAPA 12. Os nomes de comandos e limites dos serviços **mudam com o tempo**: confirme na documentação oficial de cada serviço na Fase 0 e atualize este documento.

## 1. Modelo de entrega

- **Demonstração online** (sua) + **repositório modelo**.
- **Uma cópia por cliente:** projeto Supabase novo + projeto Vercel novo + chaves próprias do cliente. Nunca dividir banco entre clientes.
- Sem ambiente de teste separado e sem automação nesta versão: a criação do cliente é uma **checklist manual** (seção 7).

## 2. Contas e serviços

| Serviço | Para quê | Custo inicial |
|---|---|---|
| GitHub (ou similar) | repositório e integração contínua | gratuito |
| Supabase | banco, funções, armazenamento, agendador | plano gratuito na demo; conferir limites |
| Vercel | site e rewrite `/api` | plano gratuito na demo; uso comercial pode exigir plano pago |
| Mercado Pago | PIX (sandbox na demo; produção com a conta do cliente) | taxa por transação em produção |
| Cloudflare Turnstile | anti-abuso | gratuito |
| OpenStreetMap/Nominatim, BrasilAPI/ViaCEP | mapas e CEP | gratuito, com limite de uso |
| Domínio (cliente) | endereço próprio | custo anual do registro |

Valores e limites de planos devem ser conferidos antes de prometer algo ao cliente. Dados do plano gratuito do Supabase (pausa por inatividade, limites de execução e armazenamento) podem afetar a demonstração; verificar.

## 3. Variáveis de ambiente

**Servidor (segredos das funções Supabase)**
| Nome | Uso |
|---|---|
| `APP_SECRET_KEY` | criptografa TOTP e segredo do webhook (32 bytes aleatórios) |
| `MP_ACCESS_TOKEN` | Mercado Pago (sandbox na demo) |
| `MP_WEBHOOK_SECRET` | conferir assinatura de webhook do gateway |
| `TURNSTILE_SECRET` | conferir o token do CAPTCHA |
| `SITE_URL` | base dos links de acompanhamento e checagem de `Origin` |
| `IS_DEMO` | `true` na demonstração, `false` em cliente real |
| `NOMINATIM_CONTACT` | e-mail de identificação exigido pelo geocodificador |
| `GEOCODER_PROVIDER` | `nominatim` (trocável) |
| `SUPABASE_DB_URL` | conexão do Postgres usada pela função; fornecida pelo ambiente das funções |
| `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | fornecidas pelo ambiente das funções (a chave de serviço só para o Storage); **nunca** no navegador |

**Site (Vite, públicas por natureza)**
| Nome | Uso |
|---|---|
| `VITE_TURNSTILE_SITE_KEY` | chave pública do widget |
| `VITE_SITE_NAME` (opcional) | nome padrão antes de carregar o ADM |

O arquivo `.env.example` lista só os nomes. **Valores nunca entram no repositório.**

## 4. Vercel (`vercel.json`, exemplo)

```json
{
  "rewrites": [
    { "source": "/api/:path*", "destination": "https://<PROJECT_REF>.supabase.co/functions/v1/api/:path*" },
    { "source": "/(.*)", "destination": "/index.html" }
  ],
  "headers": [
    { "source": "/(.*)", "headers": [
      { "key": "Strict-Transport-Security", "value": "max-age=63072000; includeSubDomains" },
      { "key": "X-Content-Type-Options", "value": "nosniff" },
      { "key": "Referrer-Policy", "value": "strict-origin-when-cross-origin" },
      { "key": "Permissions-Policy", "value": "camera=(), microphone=(), geolocation=()" }
    ]}
  ]
}
```
A política de segurança de conteúdo (CSP) entra nesse arquivo na implementação, depois de listar os domínios realmente usados (Turnstile e imagens do Storage). **A ordem das regras importa** (a de `/api` vem antes do fallback de SPA). A função `api` é publicada **sem verificação de JWT** do Supabase, pois o login é próprio; a proteção está no código (sessão, CSRF, assinaturas).

## 5. Supabase

1. Criar projeto na região mais próxima do público (ex.: São Paulo, se disponível).
2. Aplicar migrações em ordem; carregar `seed/demo.sql` **só na demonstração**.
3. Confirmar **RLS ligada em todas as tabelas** e sem política para `anon`/`authenticated` (teste X-11).
4. Criar o bucket público de leitura `images`.
5. Definir os segredos das funções (seção 3) e publicar a função `api` sem verificação de JWT.
6. Configurar o **agendador** (expirar PIX, reenviar webhooks, limpar sessões e caches).
7. Ligar **backup automático** e anotar como restaurar.
8. Criar o dono com o **script de preparação** (pede e-mail e senha na hora; não guarda a senha em arquivo).

## 6. Integrações

- **Mercado Pago:** criar aplicação, copiar a chave de teste para `MP_ACCESS_TOKEN`; cadastrar a URL de notificação `https://<site>/api/webhooks/mercadopago` e copiar o segredo para `MP_WEBHOOK_SECRET`; testar um PIX completo. Em produção, trocar pelas credenciais do cliente e repetir o teste com valor baixo.
- **Turnstile:** criar o widget para o domínio do site, colocar a chave pública no site e a secreta no servidor.
- **Bot do cliente:** no ADM, cadastrar a URL, gerar o segredo, entregar o segredo ao responsável pelo bot por canal seguro, usar **Enviar evento de teste**.

## 7. Checklist para criar uma cópia de cliente

1. [ ] Criar repositório a partir do modelo (ou fork privado).
2. [ ] Criar projeto Supabase novo; anotar `PROJECT_REF`.
3. [ ] Aplicar migrações (sem o seed de demonstração, ou com cardápio vazio).
4. [ ] Definir segredos: `APP_SECRET_KEY` novo, Turnstile e Mercado Pago do cliente, `IS_DEMO=false`.
5. [ ] Publicar a função `api`; configurar o agendador; criar o bucket.
6. [ ] Criar projeto Vercel ligado ao repositório; ajustar `vercel.json` com o `PROJECT_REF`; definir `VITE_TURNSTILE_SITE_KEY`.
7. [ ] Configurar domínio próprio e HTTPS; atualizar `SITE_URL` e o domínio do Turnstile.
8. [ ] Criar o dono (script) e ligar 2 passos.
9. [ ] No ADM: nome, logo, cores, endereço e coordenadas, raio e faixas, horários, tempos, cardápio e fotos, contatos.
10. [ ] Escrever e **revisar com advogado** a política de privacidade; publicar.
11. [ ] Webhook do Mercado Pago apontando para o domínio do cliente; PIX de teste real de valor baixo e reembolso.
12. [ ] Webhook do bot cadastrado e testado (se o cliente tiver bot).
13. [ ] Rodar o **roteiro de aceite** (`TEST_PLAN.md` §11) e a checklist de `SECURITY.md` §10.
14. [ ] Testar a restauração do backup.
15. [ ] Entregar ao cliente: acesso, guia de uso do ADM, orientação da aba visível e do som, canal para pedidos de titulares de dados, contato de suporte.

## 8. Publicação e rotina

- **Demonstração:** cada alteração enviada ao ramo principal gera publicação automática do site; migrações e funções são aplicadas por comando controlado, **não automático**, para evitar mudar o banco sem conferir.
- **Prévias:** a Vercel pode gerar endereço de prévia por alteração; usar apenas contra o banco da demonstração, nunca contra o de um cliente.
- **Versão:** etiquetar versões estáveis no repositório; clientes só atualizam para versões etiquetadas.
- **Atualização de cliente:** ler as notas da versão, aplicar migrações, publicar função, publicar site, rodar testes de fumaça.
- **Rollback:** site volta à publicação anterior pela Vercel; função volta à versão anterior reimplantando a etiqueta; **migrações são sempre para frente** (para desfazer, criar uma migração nova), por isso fazer backup antes de migrar.

## 9. Teste de fumaça depois de cada publicação

- [ ] Página inicial carrega e mostra cardápio e Aberto/Fechado.
- [ ] Login do ADM funciona e o cookie é aceito no celular e no desktop.
- [ ] Cálculo de uma entrega de teste.
- [ ] Pedido com pagamento na entrega aparece no ADM com som.
- [ ] PIX de teste cria QR (sandbox) e o webhook chega.
- [ ] Agendador está rodando (PIX expira).
- [ ] Sem erros no console e sem violações de CSP.

## 10. Monitoramento e suporte

- Acompanhar os logs de função e os erros da Vercel; avisos do ADM para falhas de webhook.
- Conferir mensalmente: uso dos planos, backups, validade de certificados e chaves, atualização de dependências.
- Registrar para cada cliente: onde ficam as contas, quem é o dono delas, datas de rotação de segredos e versão instalada.

## 11. Custos (a preencher por cliente)

A demonstração deve caber nos planos gratuitos. Para cliente real, levantar: plano do Supabase e da Vercel adequados ao volume, domínio, taxas do Mercado Pago e custos do WhatsApp Business Platform (bot do cliente), serviço de mapas pago se trocar o gratuito. **Conferir preços atuais nos sites oficiais** antes de informar ao cliente.

## 12. Pendências

Escolher a região do Supabase; confirmar limites do plano gratuito (pausa por inatividade, agendador, tamanho de armazenamento); definir CSP final; decidir o responsável por cada conta; criar o guia de uso do ADM para o cliente.
