# IMPLEMENTATION_PLAN — Forno Bella Pizzeria

Status: **rascunho para aprovação** · Gerado em 25/11/2026. **Nada disso começa antes da frase exata "APROVADO — PODE INICIAR O DESENVOLVIMENTO."**

Tamanhos são relativos (P = pequeno, M = médio, G = grande), sem estimativa de prazo. Cada fase termina com **entrega testável e aprovação** antes da próxima.

## Fase 0 — Preparação e provas de conceito (P/M)

Objetivo: tirar do caminho os riscos técnicos antes de construir.
- Criar contas e projetos: repositório, Supabase, Vercel, Mercado Pago (sandbox), Cloudflare Turnstile. Registrar quem é dono de cada conta.
- **Prova 1:** função Supabase com hash de senha (medir Argon2id em WebAssembly; se passar do limite de CPU, escolher alternativa e fixar parâmetros).
- **Prova 2:** Vercel com rewrite `/api` ➜ função, cookie `HttpOnly; Secure; SameSite=Strict` indo e voltando; funciona em Chrome, Safari iOS, Firefox.
- **Prova 3:** PIX no sandbox do Mercado Pago ponta a ponta (criar cobrança, QR, webhook com assinatura, consulta do pagamento, reembolso).
- **Prova 4:** Nominatim + consulta de CEP com cache; qualidade em endereços reais e limite de uso.
- **Prova 5:** Turnstile no formulário e conferência no servidor; verificar o que o widget grava no aparelho.
- **Prova 6:** agendador (expirar PIX, reenviar webhook) no plano gratuito.
- Saída: relatório curto com resultados e ajustes de decisão (qualquer mudança volta para sua aprovação).

## Fase 1 — Base do projeto (M)

- Estrutura do repositório, TypeScript estrito, Tailwind com tokens de tema, lint, formatação, testes, integração contínua.
- Migrações do banco (`DATABASE.md`), RLS ligada, script de seed de demonstração.
- Roteador da função `api`, tratamento de erro padrão, ID de correlação, logs sem dados pessoais.
- Pacote `shared` (tipos, esquemas Zod, regras de preço, horário e status) com testes.
- Aceite: build e testes passam; banco sobe do zero com seed; função responde a `/api/store`.

## Fase 2 — Site público e cardápio (G)

- Layout de página única (barra do topo, cabeçalho, hero, 3 galerias, história, horários, rodapé), responsivo, com as animações aprovadas.
- Leitura do cardápio, promoções, abas Salgadas/Doces, itens pausados.
- Aberto/Fechado calculado, inclusive horário que passa da meia-noite.
- Tema por variáveis CSS com as 5 paletas.
- Aceite: confere com o protótipo no celular e no desktop; acessibilidade básica (teclado, foco, contraste das 5 paletas).

## Fase 3 — Montagem do pedido e carrinho (M/G)

- Detalhes do produto, Broto/Grande, até 3 sabores, preço do mais caro, borda, adicionais, remover ingredientes, observações.
- Carrinho salvo no aparelho, mínimo e avisos.
- Cálculo de preços no servidor (`pricing`) e prévia idêntica no navegador.
- Aceite: testes de preço cobrem todos os casos de `TEST_PLAN.md`.

## Fase 4 — Entrega (M)

- Consulta de CEP, geocodificação com cache, Haversine, faixas, frete grátis, fora da área, retirada.
- Aceite: endereços dentro, na borda e fora do raio se comportam como esperado; falha do serviço de mapas tem mensagem amigável.

## Fase 5 — Login e ADM base (G)

- Login próprio, sessões, CSRF, limites, 2 passos, trocar senha, encerrar sessões.
- Casca do ADM, Início, Configurações da loja, horários, faixas.
- Aceite: testes de segurança de autenticação (`TEST_PLAN.md` §6) passam.

## Fase 6 — Pedidos (G)

- Criação do pedido (checkout completo), Turnstile, limites, consentimento.
- Máquina de estados, histórico de eventos, lista do ADM com consulta a cada ~5 s, som, detalhe, próximo passo, cancelar, comanda impressa.
- Página de acompanhamento por link.
- Aceite: pedido de ponta a ponta com pagamento na entrega.

## Fase 7 — Pagamentos PIX (M/G)

- Criar cobrança, tela do PIX, webhook com assinatura e idempotência, expiração por agendador, novo PIX, reembolso total e parcial.
- Aceite: todos os casos de PIX do plano de teste passam no sandbox.

## Fase 8 — Bot de WhatsApp (webhook) (M)

- Fila `bot_deliveries`, assinatura HMAC, novas tentativas, painel de entregas e falhas, evento de teste, proteção contra SSRF.
- Aceite: um receptor de teste confere a assinatura e descarta repetidos.

## Fase 9 — ADM de cardápio, aparência e privacidade (G)

- CRUD de sabores, tamanhos, bordas, adicionais, produtos, promoções; envio de fotos.
- Aparência com prévia, verificação de contraste e bloqueio de salvamento ilegível.
- Política de privacidade e consentimento editáveis; anonimizar dados; reset da demonstração.
- Aceite: trocar cores, nome, logo e cardápio pelo ADM muda o site sem código.

## Fase 10 — Qualidade (M/G)

- Rodada completa do plano de testes: unitários, integração, ponta a ponta, acessibilidade, desempenho, segurança, responsividade.
- Revisão de segurança (`SECURITY.md` §10), cabeçalhos, CSP, dependências.
- Correções e polimento visual com você.

## Fase 11 — Publicação da demonstração e entrega do modelo (M)

- Deploy da demonstração (Vercel + Supabase) pela checklist do `DEPLOYMENT.md`.
- Repositório modelo, `.env.example`, documentação para criar cópia de cliente.
- Dados de demonstração finais e fotos genéricas.
- Aceite: criar uma segunda cópia do zero seguindo só a checklist.

## Dependências entre fases

`0 ➜ 1 ➜ (2, 5) ➜ 3 ➜ 4 ➜ 6 ➜ 7 ➜ 8`; `9` depende de 2 e 5; `10` depende de todas; `11` depende de 10.
As telas de design pendentes (ADM, PIX, acompanhamento, entrega com faixa e fora da área, meio a meio e detalhes do produto) devem estar prontas **antes** das fases que as usam.

## Riscos e mitigação

| Risco | Impacto | Mitigação |
|---|---|---|
| Hash de senha não cabe na função | login inviável | Fase 0 mede; alternativa pronta |
| Cookie não atravessa o rewrite | login quebrado | Fase 0 prova; plano B: domínio próprio com subdomínio da API |
| Nominatim impreciso ou limitado | taxa errada ou bloqueio | cache, mensagem para tentar retirada, camada trocável |
| Aba do ADM em segundo plano | pedido sem aviso | orientação, título piscando, aviso visível; reavaliar Realtime depois |
| Limites do plano gratuito | demonstração instável | acompanhar uso; documentar custos reais por cliente |
| Mudança de regra do Mercado Pago | PIX falha | testes de contrato no sandbox e leitura da documentação na Fase 0 |
| Texto jurídico inadequado | risco para o cliente | revisão de advogado obrigatória antes de produção |
| Escopo crescendo | atraso | qualquer item novo volta para sua aprovação e entra em versão futura |

## Definição de pronto (para cada entrega)

Código revisado, testes novos e antigos passando, sem segredo no repositório, acessível por teclado, funciona no celular, documentação do que mudou, aprovado por você.

## Pós-entrega (fora do plano)

Realtime opcional, caixa de consentimento separada, prazo de retenção automático, painel de relatórios, múltiplos usuários, domínio próprio e outras trocas de serviço de mapas.
