# REQUIREMENTS — Forno Bella Pizzeria

Status: **rascunho para aprovação** · Gerado em 25/11/2026 · Base: ETAPAS 1 a 12 de `DECISOES_E_DESIGN.md` (o que estiver lá prevalece sobre este texto).

## 1. Objetivo e contexto

Sistema web de pedidos delivery para pizzaria, com site público e painel do dono (ADM). É uma **demonstração** para apresentar a outras pizzarias. **Uma cópia do sistema por cliente** (projeto e banco próprios); não é multi-pizzaria. A demonstração usa cardápio de exemplo e pagamento em modo de teste (sandbox).

## 2. Escopo

**Dentro desta versão**
- Site de página única com cardápio, promoções, monte sua pizza (inteira e até 3 sabores), carrinho e checkout como visitante.
- Entrega por raio em km com taxa por faixas, frete grátis opcional e retirada na loja.
- Pagamento por PIX online (Mercado Pago sandbox) e pagamento na entrega (dinheiro com troco ou cartão na maquininha).
- Página de acompanhamento do pedido por link.
- Webhook assinado para um bot de WhatsApp do cliente (na demonstração não envia nada).
- ADM do dono: início, pedidos, cardápio e produtos, entrega/horários/configurações, aparência.
- Temas editáveis, política de privacidade editável, apagar/anonimizar dados de cliente.

**Fora desta versão**
Cupom de desconto; contas de cliente; agendamento de pedido; botão de GPS; cartão online; estoque; funcionários e perfis no ADM; relatórios exportáveis; análise de visitas; envio de mensagens pela demonstração; multi-pizzaria.

## 3. Perfis

| Perfil | Descrição |
|---|---|
| Visitante / cliente | Não tem conta. Navega, monta o pedido, informa nome, telefone e endereço, paga e acompanha por link. |
| Dono | Único usuário do ADM. Entra com e-mail e senha (2 passos opcional). |
| Sistema externo (bot) | Recebe eventos de status por webhook assinado. Construído e mantido pelo cliente. |
| Gateway (Mercado Pago) | Gera o PIX e avisa o pagamento por webhook. |

## 4. Requisitos funcionais

### 4.1 Site público (RF-PUB)
- RF-PUB-01 Página única na ordem: barra do topo, cabeçalho, hero fixo, Galeria 1 (promoções), Galeria 2 (monte sua pizza), Galeria 3 (cardápio), nossa história, horários/endereço/contato, rodapé enxuto.
- RF-PUB-02 Barra do topo mostra **Aberto agora** ou **Fechado** (com horário de abertura ou fechamento), calculado pelos horários do ADM no fuso America/Sao_Paulo.
- RF-PUB-03 Loja fechada: botões de pedir bloqueados com aviso do horário.
- RF-PUB-04 Galeria 1: carrossel de promoções com preço "de/por", etiqueta Promoção e dois botões redondos (3 por vez no desktop, 1 por vez no celular com indicador).
- RF-PUB-05 Galeria 2: Pizza inteira, Pizza meio a meio, Pizza doce inteira e Pizza doce meio a meio (meio a meio = Grande com 2 ou 3 sabores).
- RF-PUB-06 Galeria 3: lista de sabores com ingredientes e preço por tamanho, abas Salgadas e Doces.
- RF-PUB-07 Horários de todos os dias com "hoje" em destaque; endereço do ADM com botão **Como chegar** (abre o Google Maps, sem mapa embutido).
- RF-PUB-08 Contato discreto: link pequeno de WhatsApp (`wa.me`), sem botão flutuante; redes sociais editáveis.
- RF-PUB-09 Item pausado aparece apagado com "Indisponível" e não pode ser pedido.
- RF-PUB-10 Menu mobile em gaveta lateral; política de privacidade acessível no rodapé e no checkout.

### 4.2 Montagem do pedido (RF-PED)
- RF-PED-01 Tamanhos **Broto (4 fatias, 1 sabor)** e **Grande (8 fatias, até 3 sabores)**; nomes, fatias e limites editáveis no ADM.
- RF-PED-02 Preço da pizza com mais de um sabor = preço do **sabor mais caro** no tamanho escolhido.
- RF-PED-03 Personalização: borda recheada e adicionais (cadastrados no ADM, preço próprio), remover ingredientes, observação por item, quantidade.
- RF-PED-04 Outros produtos (bebidas e demais) cadastrados no ADM, com foto genérica quando não houver foto.
- RF-PED-05 Carrinho com quantidade, editar, remover, subtotal, observação geral do pedido, **lembrado neste aparelho**.
- RF-PED-06 Pedido mínimo configurável (sem mínimo por padrão); o botão avisa quanto falta.
- RF-PED-07 Não há cupom nem agendamento: só pedido para agora.
- RF-PED-08 Cliente informa nome, telefone, endereço digitado (CEP, rua, bairro, número, complemento) ou escolhe retirada; aceita uso de dados (LGPD) e atualizações por WhatsApp em **uma única caixa**.
- RF-PED-09 O servidor recalcula preços, taxa e total; o valor do navegador nunca é o definitivo.
- RF-PED-10 Mostra tempo estimado de entrega ou retirada (faixas editáveis).
- RF-PED-11 CAPTCHA discreto (Turnstile) ao enviar o pedido, mais limites por telefone e por aparelho.

### 4.3 Entrega (RF-ENT)
- RF-ENT-01 Área por **raio em km** a partir da loja; distância em linha reta (Haversine) calculada no servidor.
- RF-ENT-02 Taxa por **faixas de distância** cadastradas no ADM; o fim da última faixa é o raio máximo.
- RF-ENT-03 Frete grátis acima de um valor (editável, pode ser desligado); a tela mostra quanto falta.
- RF-ENT-04 Fora da área: entrega bloqueada com aviso e opção de **outro endereço ou retirada**; o servidor também recusa.
- RF-ENT-05 Retirada sem taxa, mostrando endereço da loja e tempo estimado.
- RF-ENT-06 Endereço convertido em coordenadas por serviço gratuito (OpenStreetMap/Nominatim) e CEP por consulta pública, chamados pelo servidor, com cache.

### 4.4 Pagamento (RF-PAG)
- RF-PAG-01 Formas: PIX online, dinheiro na entrega (com troco) e cartão na maquininha na entrega. Sem cartão online.
- RF-PAG-02 PIX: QR code e código copia e cola; confirmação por webhook com assinatura conferida; o pedido só chega à cozinha depois de pago.
- RF-PAG-03 PIX não pago expira sozinho (padrão 15 min, editável); o cliente pode tentar de novo.
- RF-PAG-04 Pagamento na entrega: pedido segue direto para a cozinha; o dono marca como pago ao entregar.
- RF-PAG-05 Reembolso (total ou parcial) por botão no ADM, só para PIX pago; registra quem e quando.
- RF-PAG-06 Guarda só identificador, status e valor do pagamento. Nunca guarda dados de cartão.

### 4.5 Acompanhamento (RF-ACO)
- RF-ACO-01 Ao finalizar, o cliente recebe a página de acompanhamento por link com código longo e imprevisível, sem login.
- RF-ACO-02 Mostra etapas: pedido criado, aguardando confirmação, em preparo, saiu para entrega ou pronto para retirada, entregue (ou cancelado), e o tempo estimado.
- RF-ACO-03 Atualiza consultando o servidor a cada poucos segundos.

### 4.6 Bot de WhatsApp (RF-BOT)
- RF-BOT-01 Demonstração: nenhuma mensagem é enviada; URL do webhook vazia.
- RF-BOT-02 A cada mudança de status gera um evento e envia por **webhook assinado** à URL cadastrada no ADM, com novas tentativas e registro de falhas.
- RF-BOT-03 Eventos: recebido, confirmado, em preparo, saiu para entrega ou pronto para retirada, entregue e cancelado.
- RF-BOT-04 Guarda data, texto aceito e telefone do consentimento.
- RF-BOT-05 O bot oficial (API oficial do WhatsApp) é de responsabilidade do cliente.

### 4.7 Painel ADM (RF-ADM) — detalhes em `ADMIN_PANEL.md`
- RF-ADM-01 Acesso só do dono por e-mail e senha, 2 passos opcional.
- RF-ADM-02 Início com resumo de hoje e do mês.
- RF-ADM-03 Pedidos quase em tempo real (consulta a cada ~5 s), som e aviso de pedido novo, botão do próximo passo, cancelar, reembolsar e imprimir comanda.
- RF-ADM-04 Cardápio e produtos: sabores, preços por tamanho, promoções (percentual ou valor manual), bordas, adicionais, outros produtos, fotos e pausar item.
- RF-ADM-05 Entrega, horários e configurações: loja, raio, faixas, frete grátis, mínimo, horários por dia, tempos estimados, URL do webhook, expiração do PIX.
- RF-ADM-06 Aparência: 5 paletas prontas e Personalizada, logo, nome, história, contatos, redes sociais, política de privacidade.
- RF-ADM-07 ADM responsivo, com atenção à tela de pedidos no celular.
- RF-ADM-08 Apagar ou anonimizar dados de um cliente que pedir.
- RF-ADM-09 Demonstração: botão **Restaurar dados de demonstração** com confirmação.

## 5. Regras de negócio

- RN-01 Valores em centavos (inteiros), moeda BRL.
- RN-02 Preço do item = preço do sabor mais caro no tamanho + borda + adicionais, vezes a quantidade.
- RN-03 Frete = faixa da distância; zero se o subtotal atingir o valor de frete grátis (quando ligado). O pedido mínimo é checado no subtotal dos itens.
- RN-04 Uma promoção vale para um sabor em um tamanho, quando a pizza tem **só esse sabor**. (Ver pontos a confirmar.)
- RN-05 Fluxo de status sem pular etapas; cancelar é permitido até "entregue".
- RN-06 Pedido PIX nasce como "aguardando pagamento", fora da lista da cozinha; vira "recebido" ao pagar; vira "expirado" se o prazo passar.
- RN-07 Loja fechada não aceita pedido novo, também no servidor.
- RN-08 Horário que passa da meia-noite (ex.: 18:00 às 01:00) conta para o dia em que abre.
- RN-09 Item pausado nunca entra em pedido novo; pedidos já feitos mantêm os dados de quando foram criados (foto, nome e preço guardados no item).
- RN-10 Dados pessoais ficam sem prazo automático; o dono apaga ou anonimiza a pedido do titular.

## 6. Requisitos não funcionais

- RNF-01 **Mobile first**, alvos de toque ≥ 44 px, texto legível, funciona de 360 px a 1920 px.
- RNF-02 **Acessibilidade** nível AA: contraste 4,5:1, foco visível, rótulos, navegação por teclado, `prefers-reduced-motion`.
- RNF-03 **Desempenho**: página inicial carrega rápido em 4G; imagens otimizadas e com carregamento tardio; ADM carregado só quando o dono entra.
- RNF-04 **Segurança e LGPD**: conforme `SECURITY.md`.
- RNF-05 **Disponibilidade** compatível com planos gratuitos (demonstração); sem garantia de SLA.
- RNF-06 **Manutenção**: TypeScript estrito, camadas separadas, migrações versionadas, testes automatizados nas regras de preço, entrega e status.
- RNF-07 **Idioma** português do Brasil; fuso America/Sao_Paulo.
- RNF-08 **Navegadores**: versões atuais de Chrome, Edge, Firefox e Safari (inclui iOS Safari e Chrome Android).
- RNF-09 **Reaproveitamento**: trocar marca, cores, textos e cardápio só pelo ADM; criar nova cópia por checklist.

## 7. Estados do pedido

`aguardando pagamento` (só PIX) → `recebido` → `confirmado` → `em preparo` → `saiu para entrega` ou `pronto para retirada` → `entregue`.
Saídas: `cancelado` (de qualquer estado antes de entregue) e `expirado` (PIX não pago).

## 8. Suposições e pontos a confirmar

1. **Promoção em pizza com mais de um sabor:** assumido que a promoção só vale para a pizza de um sabor só. Confirmar.
2. **Preço da borda e adicionais:** assumido um preço único por item, igual para Broto e Grande. Confirmar se precisa de preço por tamanho.
3. **Faturamento no resumo:** assumido como soma dos pedidos válidos (não cancelados nem expirados nem aguardando pagamento). Confirmar.
4. **Tempos estimados e pedido mínimo:** valores padrão de exemplo, editáveis.
5. **Visual do ADM:** ainda não desenhado; proposta no `DESIGN_SYSTEM.md`, a validar nas telas.
6. **Texto da política de privacidade:** será um modelo editável; **precisa de revisão jurídica** por cada pizzaria (não sou advogado).
7. **Guardar dados sem prazo** foi decisão do dono; fica registrada a recomendação de prazo (ver `SECURITY.md`).

## 9. Critérios de aceite gerais

- Um visitante consegue pedir uma pizza inteira, uma meio a meio e uma bebida, pagar por PIX (sandbox) e por dinheiro, e acompanhar o pedido, no celular e no desktop.
- O dono recebe o pedido com som, avança todos os status, cancela e reembolsa um PIX.
- Nenhum valor, taxa ou área é decidido pelo navegador.
- Nenhum dado sensível é acessível sem sessão do dono ou sem o código do link.
- Trocar cores, nome, logo e cardápio pelo ADM muda o site sem alterar código.
- O botão de restaurar demonstração devolve o sistema ao estado inicial.
