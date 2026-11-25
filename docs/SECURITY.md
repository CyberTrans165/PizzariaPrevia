# SECURITY — Forno Bella Pizzeria

Status: **rascunho para aprovação** · Gerado em 25/11/2026 · Base: ETAPA 10 (e ETAPAS 7, 8, 11, 12). Este documento não é parecer jurídico.

## 1. O que protegemos

1. Acesso ao ADM (pedidos, preços, reembolso).
2. Dados pessoais dos clientes (nome, telefone, endereço).
3. Integridade dos valores (preço, taxa, total, pagamento).
4. Segredos (chaves do banco, do Mercado Pago, do Turnstile, do webhook).
5. Disponibilidade do pedido (abuso e spam).

## 2. Ameaças consideradas e respostas

| Ameaça | Resposta |
|---|---|
| Adivinhar a senha do dono | senha forte, limite de tentativas por e-mail e por IP, atraso progressivo, 2 passos opcional, mensagem de erro igual para qualquer falha |
| Roubo de sessão | ID aleatório de 256 bits; **no banco só o hash**; cookie HttpOnly + Secure + SameSite=Strict; validade deslizante e limite absoluto; logout apaga no servidor; ID novo a cada login |
| Requisição forjada (CSRF) | SameSite=Strict, cabeçalho anti-CSRF exigido em toda ação do ADM, checagem de `Origin` |
| Injeção SQL | consultas parametrizadas; nenhuma montagem de SQL com texto do usuário |
| XSS | React escapa por padrão; nunca `dangerouslySetInnerHTML` com texto do usuário; política de segurança de conteúdo (CSP) restritiva; texto de ADM e de cliente tratado como não confiável |
| Alterar preço no navegador | o servidor recalcula tudo (preço, taxa, área, horário, disponibilidade) |
| Ver pedido de outra pessoa | link com token de 128+ bits; no banco só o hash; resposta idêntica para código inexistente e token errado; sem numeração sequencial na URL |
| Bots e spam de pedidos | Turnstile no envio, limite por telefone e por aparelho/IP, validação de telefone |
| Webhook falso do Mercado Pago | conferir assinatura, **consultar o pagamento na API do gateway** antes de marcar como pago, idempotência |
| Webhook falso para o bot | o bot confere a assinatura HMAC com o segredo do ADM e a data (anti-repetição) |
| Envio de arquivo malicioso | só imagens (JPEG, PNG, WebP), tipo conferido pelo conteúdo, tamanho máximo, nome gerado pelo servidor, reprocessamento da imagem |
| Vazamento de segredo | segredos só em variáveis do servidor; `.env.example` sem valores; chave de serviço nunca vai ao navegador; varredura de segredos no repositório |
| Vazamento do banco | senha só em hash; sessões só em hash; TOTP e segredo do webhook criptografados; sem dados de cartão |
| SSRF pela URL do webhook do bot | só `https`, bloquear endereços privados e locais, tempo máximo curto, sem seguir redirecionamentos para fora |

## 3. Autenticação do dono (decisão do dono)

- **Somente e-mail e senha, conferidos no servidor.** O navegador nunca recebe nem guarda o hash.
- **Hash:** Argon2id com salt e parâmetros gravados no valor. Se não couber no limite de CPU da função, usar alternativa aprovada (PBKDF2-SHA256 do WebCrypto com iterações altas, ou scrypt/bcrypt), **medida na Fase 0**. Parâmetros regulados por configuração e reprocessamento do hash no login quando subirem.
- **Política de senha:** mínimo 12 caracteres, verificação contra lista de senhas comuns, sem exigir símbolos obrigatórios; o dono pode trocar a senha estando logado (confirmando a atual).
- **Limites:** por e-mail e por IP, janelas deslizantes; bloqueio temporário com tempo crescente; resposta sem revelar se o e-mail existe.
- **Sessão:** ID de 256 bits vindo de gerador criptográfico; prazo deslizante (sugerido 8 h) e limite absoluto (sugerido 7 dias); **encerrar todas as sessões** disponível no ADM; troca de ID no login.
- **2 passos (opcional):** TOTP de aplicativo autenticador; segredo criptografado; 8 códigos de recuperação (só hash). Desligado na demonstração.
- **Recuperação de senha:** não há e-mail automático nesta versão. A redefinição é feita por **script de preparação** com acesso ao projeto (quem administra o projeto). Registrar isso na entrega ao cliente.
- **Registro:** logins, falhas e trocas vão para `audit_log` sem senha e sem dados pessoais.

## 4. Autorização

- Só existe um papel: dono. Toda rota `/api/admin/*` exige sessão válida.
- Rotas públicas só devolvem dados públicos e o pedido pelo token do link.
- Tabelas com RLS ligada e sem política para `anon`/`authenticated`; **a chave de serviço existe só na função**.
- Operações sensíveis (reembolso, anonimizar, reset da demonstração) pedem confirmação no ADM e entram no `audit_log`.

## 5. Dados, privacidade e LGPD

**Papéis (a confirmar com cada pizzaria):** a pizzaria é a **controladora**; os provedores (Supabase, Vercel, Mercado Pago, Cloudflare, OpenStreetMap/BrasilAPI) atuam como operadores ou terceiros.

| Dado | Finalidade | Base legal sugerida | Retenção |
|---|---|---|---|
| nome, telefone, endereço do pedido | executar entrega e contato | execução de contrato / procedimentos preliminares | sem prazo automático (decisão do dono) |
| telefone + consentimento de WhatsApp | atualizações pelo bot | consentimento (caixa no checkout) | enquanto o pedido existir |
| dados do pagamento (id, status, valor) | confirmar e reembolsar | execução de contrato | idem |
| IP e cabeçalhos | segurança e limite de abuso | legítimo interesse | só em forma de hash, janelas curtas |

**Recomendações registradas (a decisão final é do dono):**
1. **Guardar sem prazo conflita com o princípio de minimização.** Sugestão: política de privacidade clara dizendo isso e, quando a pizzaria quiser, ativar um prazo (ex.: anonimizar pedidos com mais de 12 ou 24 meses). A estrutura já permite.
2. **Direitos do titular:** o dono precisa conseguir confirmar, corrigir, **apagar/anonimizar** e entregar uma cópia dos dados de um cliente. O ADM tem anonimização; a entrega de cópia é manual (consulta ao pedido). Documentar o procedimento e o canal de contato na política.
3. **Consentimento único:** a caixa junta aceite de dados e atualizações por WhatsApp. Uma caixa separada seria prova mais forte; fica como melhoria futura.
4. **Terceiros que veem dados:** o endereço digitado vai ao serviço de geocodificação (OpenStreetMap) e o CEP ao serviço de CEP; o navegador carrega o Turnstile (Cloudflare); o PIX passa pelo Mercado Pago; o bot do cliente recebe nome e telefone. Tudo isso **deve constar na política de privacidade**.
5. **Transferência internacional:** os provedores podem processar dados fora do Brasil; mencionar na política.
6. **Política de privacidade** é um texto-modelo editável no ADM, com versão guardada; **revisão jurídica obrigatória** antes de uso real.
7. **Cookies:** apenas o necessário (sessão do ADM). O carrinho fica no armazenamento do aparelho. **Sem banner**. Verificar na implementação se o widget do Turnstile grava algo no aparelho; se gravar, descrever na política e reavaliar o texto de "somente o necessário".
8. **Incidentes:** procedimento básico na entrega ao cliente (quem avisar, o que registrar, prazos da LGPD).

## 6. Pagamentos e integrações

- Sem dados de cartão, nunca. Cartão só na maquininha do entregador.
- Mercado Pago: chave de acesso só no servidor; webhook com assinatura; **sempre consultar o pagamento no gateway**; chave de idempotência por pedido; estados reconciliados no job de expiração.
- Valores e quantidades inteiras; comparação do valor pago com o total do pedido antes de marcar como pago.
- Reembolso: só para PIX pago, valor máximo igual ao pago menos o já reembolsado, registro de quem fez.
- Webhook de saída: HMAC-SHA256 do corpo com data, cabeçalhos `X-Signature` e `X-Timestamp`, segredo próprio por cliente, tolerância curta de tempo, `event_id` único para o bot descartar repetidos.

## 7. Cabeçalhos e transporte

HTTPS sempre (HSTS); `Content-Security-Policy` restritiva (scripts do próprio site e do Turnstile, imagens do próprio Storage); `X-Content-Type-Options: nosniff`; `Referrer-Policy: strict-origin-when-cross-origin`; `Permissions-Policy` desligando recursos não usados (câmera, microfone, geolocalização); `X-Frame-Options: DENY` (ou `frame-ancestors 'none'`); CORS fechado (mesma origem). Fontes locais, sem pedir a servidores de terceiros.

## 8. Limites de uso (valores iniciais, ajustáveis)

| Alvo | Limite |
|---|---|
| Login por e-mail | 5 falhas por 15 min, depois bloqueio crescente |
| Login por IP | 20 tentativas por 15 min |
| Criar pedido por telefone | 3 por hora |
| Criar pedido por IP | 10 por hora |
| Consulta de endereço por IP | 30 por 10 min (protege a cota do geocodificador) |
| Consulta do link de acompanhamento | 120 por minuto por IP |

## 9. Logs, backup e segredos

- Logs de erro **sem dados pessoais** e sem dados de pagamento; sem registrar corpos de requisição de pedido.
- Backup automático do banco por projeto; **teste de restauração** na checklist.
- Rotação de segredos: documentada (trocar chave do Mercado Pago, segredo do webhook, `APP_SECRET_KEY` com reencriptação). Segredos nunca em chat, e-mail ou repositório.
- Dependências: atualização regular e verificação automática de vulnerabilidades.

## 10. Checklist antes de publicar para um cliente

- [ ] Senha do dono definida, 2 passos ligado.
- [ ] `IS_DEMO=false` e botão de restaurar desligado.
- [ ] Mercado Pago em produção com credenciais do cliente, webhook configurado e testado com valor baixo.
- [ ] Política de privacidade revista por advogado e publicada; contato do titular informado.
- [ ] Domínio próprio com HTTPS; cabeçalhos conferidos.
- [ ] Backup ativo e restauração testada.
- [ ] Limites de abuso revisados; Turnstile com chaves do cliente.
- [ ] URL e segredo do webhook do bot configurados e testados.
- [ ] Teste de invasão básico concluído (ver `TEST_PLAN.md`).
