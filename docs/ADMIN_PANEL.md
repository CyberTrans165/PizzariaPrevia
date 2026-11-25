# ADMIN_PANEL — Forno Bella Pizzeria

Status: **rascunho para aprovação** · Gerado em 25/11/2026 · Base: ETAPA 9 e ajustes das ETAPAS 10 e 11. As telas ainda **não foram desenhadas** no Design.

## 1. Geral

- Endereço: `/admin`. Só o dono, com e-mail e senha (2 passos opcional). Sem funcionários e sem perfis.
- Responsivo: em celular, menu inferior com **Pedidos**, **Início**, **Cardápio**, **Mais**; em desktop, menu lateral.
- Aparência fixa e sóbria, independente do tema do site (ver `DESIGN_SYSTEM.md`).
- Toda ação que altera dados pede confirmação quando for destrutiva (cancelar, reembolsar, anonimizar, restaurar demonstração) e é registrada em `audit_log`.
- Sessão expira por inatividade; ao expirar, volta ao login.
- Avisos curtos (toast) para sucesso e erro, com texto claro em português.

## 2. Login e segurança da conta

- Tela: e-mail, senha, botão Entrar; passo 2 (código) quando ligado.
- Mensagens: "e-mail ou senha incorretos" (sempre a mesma) e "muitas tentativas, tente mais tarde".
- Em **Mais ▸ Segurança**: trocar senha (pede a atual), **ligar/desligar 2 passos** (QR do autenticador e códigos de recuperação mostrados uma única vez), **encerrar todas as sessões**.

## 3. Início (resumo)

- Cartões: **pedidos hoje**, **faturamento hoje**, **pedidos no mês**, **faturamento no mês**, **ticket médio** (mês).
- **Sabores mais vendidos** (top 5 do mês) e **pedidos por status** (hoje).
- "Faturamento" = soma dos pedidos válidos (não cancelados, expirados nem aguardando pagamento). *(a confirmar)*
- Sem exportação nesta versão. Estado vazio: "Ainda sem pedidos hoje".

## 4. Pedidos

**Lista**
- Colunas por status (quadro) no desktop; **cartões grandes empilhados** no celular, com abas por status.
- Status mostrados: Recebido, Confirmado, Em preparo, Saiu para entrega / Pronto para retirada; Entregue e Cancelado ficam em abas de histórico. "Aguardando pagamento" aparece à parte, discreta, **fora da fila da cozinha**.
- Cada cartão: número, hora, nome, tipo (entrega/retirada), resumo dos itens, total, forma de pagamento e tempo desde que chegou (destaque quando passa do estimado).
- Atualização: consulta ao servidor a cada ~5 s (parâmetro `since`).

**Novo pedido**
- Som (precisa ser ativado uma vez por sessão, pois o navegador bloqueia som sem toque), aviso na tela, contador no menu e título da aba piscando.

**Detalhe do pedido**
- Itens com sabores, borda, adicionais, ingredientes removidos e observação de cada item; observação geral; nome e telefone (com botão de ligar/copiar); endereço completo e distância; forma de pagamento e troco; valores (itens, taxa, total); consentimento de WhatsApp; **histórico de status** com hora e quem fez; pagamento (id, status, valor, reembolsos).
- **Botão do próximo passo** grande e único: Confirmar ➜ Iniciar preparo ➜ Saiu para entrega ou Pronto para retirada ➜ Entregue. Não permite pular.
- **Cancelar** (pede motivo).
- **Reembolsar** (só PIX pago): valor total ou parcial, confirmação.
- **Marcar como pago** (só pagamento na entrega, também feito automaticamente ao entregar).
- **Imprimir comanda**: abre visual de impressão para papel comum ou térmico de 80 mm, com número, hora, cliente, endereço, itens e observações em letra grande, forma de pagamento e troco.
- Falhas: erro de reembolso mostra o motivo e permite tentar de novo; falha do webhook do bot mostra aviso.

## 5. Cardápio e produtos

Abas: **Sabores**, **Tamanhos**, **Bordas e adicionais**, **Outros produtos**, **Promoções**.
- **Sabores:** nome, categoria (salgada ou doce), descrição, ingredientes, foto, preço por tamanho, **pausar**, ativar, ordenar, excluir (desativa se já foi pedido).
- **Tamanhos:** nome, fatias, máximo de sabores (Broto 1, Grande 3).
- **Bordas e adicionais:** nome, preço, pausar, ativar.
- **Outros produtos:** categoria livre (bebidas, combos, sobremesas…), nome, descrição, preço, foto, pausar.
- **Promoções:** escolher sabor e tamanho, tipo **percentual** ou **valor manual**, ativar; mostra o "de/por" calculado e a prévia do cartão.
- Upload de foto: JPEG, PNG ou WebP, tamanho máximo, recorte quadrado, aviso se a imagem tiver baixa resolução.
- Regras de validação: preços positivos; todo sabor ativo tem preço em todos os tamanhos ativos; avisa antes de pausar o último sabor de uma categoria.

## 6. Entrega, horários e configurações

Seções:
1. **Loja:** nome, telefone, WhatsApp, endereço (texto); botão **Localizar** que obtém as coordenadas e mostra o resultado para o dono confirmar.
2. **Área e taxas:** raio máximo (km); tabela de **faixas** (de, até, taxa) com validação de continuidade; **frete grátis acima de R$ X** (ligar/desligar); **pedido mínimo** (vazio = sem mínimo).
3. **Horários:** por dia da semana, abre e fecha, "fechado"; aceita horário que passa da meia-noite.
4. **Tempos estimados:** faixas de minutos para entrega e retirada.
5. **Pagamento:** prazo de expiração do PIX (padrão 15 min). Status da integração (sandbox ou produção), sem mostrar chaves.
6. **Bot de WhatsApp:** URL do webhook (vazia na demonstração), **segredo de assinatura** (gerar, mostrar uma vez, regenerar), botão **Enviar evento de teste**, lista das últimas entregas e falhas.
7. **Privacidade:** texto da política (editor simples com modelo), texto da caixa de consentimento, versões; **Apagar dados de um cliente** (busca por telefone ou número do pedido, prévia da quantidade, confirmação).
8. **Demonstração (só se `is_demo`):** botão **Restaurar dados de demonstração**.

## 7. Aparência do site

- **Paleta:** 5 prontas (Forno a Lenha, Trattoria Creme, Basílico, Moderno Claro, Napoli) e **Personalizada** com 4 cores (fundo, texto, destaque, secundária).
- **Prévia ao vivo** do site com as cores.
- **Verificação de contraste:** lista de pares com a razão de contraste; avisa abaixo de AA e **impede salvar** quando o texto principal ou o texto do botão ficam ilegíveis.
- **Identidade:** nome, logo (fundo transparente recomendado), texto "Nossa história", contatos, redes sociais.
- O hero é fixo e não aparece como opção.

## 8. Regras e limitações

- O aviso sonoro depende de aba aberta; **navegadores diminuem a frequência de tarefas em abas ocultas**, então recomenda-se deixar a aba do ADM **visível** (tablet ou computador da cozinha, com a tela ligada). Esta limitação vai na orientação ao cliente.
- Consulta a cada ~5 s significa aviso com pequeno atraso.
- Sem multiusuário: se mais de uma pessoa usar a mesma conta, todas têm acesso total.
- Redefinição de senha só por script de quem administra o projeto.

## 9. Pendências

Desenhar no Design: Login, Início, Pedidos (lista e detalhe, desktop e celular), Cardápio (abas), Configurações, Aparência, Privacidade, comanda impressa e estados vazios. Definir textos de ajuda de cada campo.
