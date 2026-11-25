# TEST_PLAN — Forno Bella Pizzeria

Status: **rascunho para aprovação** · Gerado em 25/11/2026 · Cobre as regras de `REQUIREMENTS.md`, `SECURITY.md` e `ADMIN_PANEL.md`.

## 1. Estratégia

| Nível | Ferramenta | O que cobre |
|---|---|---|
| Unitário | Vitest (front e `shared`), Deno test (servidor) | preço, frete, horário, status, assinatura, hash, anonimização |
| Integração | funções contra um banco local de teste | rotas da API, RLS, transações, idempotência |
| Ponta a ponta | Playwright (Chrome, Firefox, WebKit; celular e desktop) | fluxos de cliente e do dono |
| Contrato | sandbox do Mercado Pago; receptor de teste do bot | PIX, webhook, reembolso, assinatura de saída |
| Segurança | testes automatizados e roteiro manual | login, sessão, CSRF, IDOR, limites, upload |
| Acessibilidade | axe automatizado + teclado + leitor de tela | AA nas 5 paletas e no ADM |
| Desempenho | Lighthouse e perfil de rede 4G | tempo de carga e tamanho dos pacotes |
| Manual exploratório | roteiro por você | aparência, textos, fluxo real em celular |

Regra: **correção de bug vem com teste que falhava antes**. O servidor é a fonte da verdade, então regras financeiras são testadas **principalmente no servidor**.

## 2. Ambiente e dados

- Banco de teste recriado do zero a cada rodada (migrações + seed).
- Relógio controlável para testar horários e expiração.
- Mercado Pago **sandbox**; geocodificador **simulado** nos testes automáticos e real em poucos testes manuais; Turnstile com **chaves de teste** do provedor.
- Nenhum teste usa dados reais de cliente.

## 3. Regras de preço (unitários e integração)

| ID | Caso | Esperado |
|---|---|---|
| P-01 | Broto, 1 sabor | preço do sabor no Broto |
| P-02 | Grande, 1 sabor | preço do sabor no Grande |
| P-03 | Grande, 2 sabores de preços diferentes | preço do mais caro |
| P-04 | Grande, 3 sabores | preço do mais caro dos 3 |
| P-05 | Broto com 2 sabores | recusado |
| P-06 | Grande com 4 sabores | recusado |
| P-07 | Borda e adicionais | somam ao preço, por unidade |
| P-08 | Quantidade 3 | total = unitário × 3 |
| P-09 | Promoção percentual em pizza de 1 sabor | desconto aplicado e arredondado em centavos de forma definida |
| P-10 | Promoção de valor manual | usa o valor informado |
| P-11 | Promoção em pizza de vários sabores | não se aplica *(regra a confirmar)* |
| P-12 | Sabor pausado | recusado no servidor mesmo se o navegador enviar |
| P-13 | Preço enviado pelo navegador diferente do real | ignora o enviado e usa o do servidor |
| P-14 | Preço mudou entre carrinho e envio | resposta com aviso e o total novo |
| P-15 | Remoção de ingrediente | não altera preço, aparece no item |

## 4. Entrega e checkout

| ID | Caso | Esperado |
|---|---|---|
| E-01 | Distância 0 km, dentro da primeira faixa | taxa da faixa 1 |
| E-02 | Distância exatamente no limite entre faixas | regra de borda definida e testada (ex.: "até X km" inclui X) |
| E-03 | Distância igual ao raio | aceita |
| E-04 | Distância acima do raio | recusa, mensagem e opção de retirada |
| E-05 | Subtotal igual ao valor de frete grátis | taxa zero |
| E-06 | Frete grátis desligado | sempre cobra a faixa |
| E-07 | Abaixo do pedido mínimo | recusa e informa quanto falta |
| E-08 | Sem pedido mínimo configurado | aceita qualquer valor |
| E-09 | Retirada | sem taxa e sem exigir endereço |
| E-10 | Endereço não encontrado / serviço fora do ar | mensagem amigável, nada é gravado |
| E-11 | Haversine contra pares de coordenadas conhecidos | erro menor que a tolerância |
| E-12 | Mesmo endereço duas vezes | segunda consulta vem do cache |
| E-13 | Telefone e CEP inválidos | erro de campo claro |
| E-14 | Sem marcar a caixa de aceite | não finaliza |
| E-15 | Loja fechada no momento do envio | recusa no servidor |
| E-16 | Horário que passa da meia-noite | aberto às 00:30 de quem abre às 18:00 e fecha às 01:00 |
| E-17 | Fuso e horário de verão | usa America/Sao_Paulo |

## 5. Pedido, status e acompanhamento

| ID | Caso | Esperado |
|---|---|---|
| S-01 | Caminho completo de entrega | recebido ➜ confirmado ➜ em preparo ➜ saiu ➜ entregue |
| S-02 | Caminho completo de retirada | termina em pronto para retirada ➜ entregue |
| S-03 | Pular etapa | recusado no servidor |
| S-04 | Cancelar em cada etapa antes de entregue | permitido; depois de entregue, recusado |
| S-05 | Cada mudança | grava evento, histórico e item para o bot na mesma transação |
| S-06 | Duas mudanças simultâneas | só uma vence, sem estado inconsistente |
| S-07 | Link com token correto | mostra o pedido |
| S-08 | Token errado ou pedido inexistente | **mesma resposta** genérica |
| S-09 | Consulta periódica | reflete a mudança em poucos segundos |
| S-10 | Número do pedido | sequencial, sem expor outros pedidos |

## 6. Segurança

| ID | Caso | Esperado |
|---|---|---|
| X-01 | Login correto | sessão criada, cookie com HttpOnly, Secure e SameSite=Strict |
| X-02 | E-mail inexistente x senha errada | mesma mensagem e tempo de resposta parecido |
| X-03 | 6 falhas seguidas | bloqueio temporário |
| X-04 | Sessão no banco | só o hash do ID existe; ID puro não aparece em tabela nem em log |
| X-05 | Cookie adulterado ou vencido | 401 |
| X-06 | Logout | sessão some do banco; cookie antigo não funciona |
| X-07 | Login novo | ID diferente do anterior |
| X-08 | Ação do ADM sem cabeçalho anti-CSRF | recusada |
| X-09 | Ação do ADM com `Origin` de outro site | recusada |
| X-10 | Rota `/api/admin/*` sem sessão | 401 |
| X-11 | Acessar tabelas direto pelo cliente do Supabase com a chave pública | **negado** (RLS sem política) |
| X-12 | Injeção SQL em campos de texto | tratada como texto |
| X-13 | Texto com HTML e script em nome, observação e endereço | exibido como texto, não executa (site, ADM e comanda) |
| X-14 | Upload com tipo ou tamanho inválido, ou arquivo disfarçado | recusado |
| X-15 | Webhook do Mercado Pago sem assinatura ou assinatura errada | recusado e registrado |
| X-16 | Webhook repetido | efeito único |
| X-17 | Webhook dizendo "pago" mas gateway diz outro estado | prevalece o gateway |
| X-18 | Valor pago diferente do total | não marca como pago |
| X-19 | URL do webhook do bot apontando para rede privada ou `http` | recusada |
| X-20 | Limite de pedidos por telefone e IP | bloqueia acima do limite com mensagem simples |
| X-21 | Turnstile ausente ou inválido | pedido recusado |
| X-22 | 2 passos: código errado, certo e de recuperação | comportamento esperado; código de recuperação usado uma vez |
| X-23 | Cabeçalhos de segurança e CSP | presentes e sem violações no console |
| X-24 | Segredos no bundle do navegador e no repositório | nenhum encontrado |
| X-25 | Logs | sem senha, token, telefone, endereço ou dados de pagamento |

## 7. Pagamentos

| ID | Caso | Esperado |
|---|---|---|
| M-01 | PIX criado | pedido em "aguardando pagamento", fora da fila da cozinha |
| M-02 | PIX pago no sandbox | vira "recebido", aparece no ADM com som |
| M-03 | PIX não pago passa do prazo | vira "expirado"; tela oferece novo PIX |
| M-04 | Pagamento chega depois de expirado | tratado de forma definida (devolver ou reativar) e testado |
| M-05 | Novo PIX para o mesmo carrinho | nova cobrança, a anterior fica sem efeito |
| M-06 | Dinheiro com troco; cartão na maquininha | pedido vai direto para a cozinha; "marcar como pago" ao entregar |
| M-07 | Reembolso total | status do pagamento e do pedido atualizados, registro de quem fez |
| M-08 | Reembolso parcial e soma dos reembolsos | não passa do valor pago |
| M-09 | Reembolso em pedido pago na entrega | botão não existe |
| M-10 | Falha do gateway | erro claro, nada fica incoerente, dá para tentar de novo |
| M-11 | Nenhum dado de cartão nas tabelas | confirmado |

## 8. Bot de WhatsApp (webhook de saída)

| ID | Caso | Esperado |
|---|---|---|
| B-01 | URL vazia (demonstração) | nenhum envio, nenhuma fila |
| B-02 | Mudança de status com URL válida | POST com corpo, `X-Timestamp` e `X-Signature` corretos |
| B-03 | Receptor de teste confere HMAC | confere; troca de 1 byte invalida |
| B-04 | Receptor responde erro | novas tentativas com espera crescente e registro |
| B-05 | Mesmo evento reenviado | mesmo `event_id` para o bot descartar |
| B-06 | Evento de teste pelo ADM | chega e aparece na lista |
| B-07 | Todos os 6 eventos de status | enviados com os campos combinados |

## 9. ADM

| ID | Caso | Esperado |
|---|---|---|
| A-01 | Pedido novo | som (após ativar), aviso, contador e título em até ~5 s |
| A-02 | Cartões no celular | alvos de toque ≥ 44 px, uso com uma mão |
| A-03 | Pausar sabor | some dos pedidos novos na hora e aparece "Indisponível" no site |
| A-04 | Trocar preço | vale para pedidos novos; antigos mantêm o preço |
| A-05 | Criar promoção percentual e manual | cálculo e prévia corretos |
| A-06 | Faixas de taxa descontínuas | validação impede salvar |
| A-07 | Cores personalizadas ilegíveis | aviso e bloqueio de salvar |
| A-08 | Anonimizar por telefone | dados pessoais removidos em todos os pedidos do telefone; valores preservados; registro sem dados pessoais |
| A-09 | Comanda | cabe em 80 mm, legível, sem cortes |
| A-10 | Restaurar demonstração | apaga pedidos de teste e volta cardápio e configurações; **botão não existe** quando `is_demo=false` |
| A-11 | Resumo do dia e do mês | bate com a soma dos pedidos válidos do teste |
| A-12 | Sessão expira durante o uso | volta ao login sem perder o que dá |

## 10. Acessibilidade, responsividade e desempenho

- **Acessibilidade:** axe sem erros graves; navegação completa só por teclado (carrossel, gaveta, formulários, carrinho, ADM); leitor de tela nos fluxos principais; contraste AA nas **5 paletas** e na Personalizada; `prefers-reduced-motion` desliga as animações; erros anunciados.
- **Responsividade:** 360, 390, 768, 1024, 1280 e 1920 px; iOS Safari, Chrome Android, Chrome, Edge, Firefox, Safari desktop; orientação retrato e paisagem; zoom de 200%.
- **Desempenho (metas iniciais):** Lighthouse mobile ≥ 90 em desempenho, acessibilidade e boas práticas na página inicial; LCP até 2,5 s em 4G simulada; pacote inicial pequeno com ADM em divisão separada; imagens em WebP e com carregamento tardio.
- **Resiliência:** sem internet, servidor lento, resposta de erro 500 e tempo esgotado têm mensagens e não duplicam pedido (envio com chave de idempotência).

## 11. Testes de aceite com você (roteiro)

1. No celular: pedir pizza inteira, meio a meio com 3 sabores e bebida; pagar por PIX (sandbox) e por dinheiro.
2. Acompanhar pelo link e ver as mudanças feitas pelo ADM.
3. No ADM: receber, avançar todos os status, cancelar um, reembolsar um PIX.
4. Pausar um sabor, mudar um preço, criar uma promoção.
5. Trocar a paleta e o logo; tentar uma combinação ilegível.
6. Anonimizar um cliente; restaurar a demonstração.
7. Tentar acessar `/admin` sem login e com senha errada.

## 12. Critérios para liberar

Todos os testes críticos (preço, entrega, status, pagamento, segurança) passando; nenhum erro grave de acessibilidade; nenhum segredo exposto; fluxo ponta a ponta aprovado por você no celular; checklist do `SECURITY.md` §10 completa; segunda cópia criada do zero só pela checklist do `DEPLOYMENT.md`.
