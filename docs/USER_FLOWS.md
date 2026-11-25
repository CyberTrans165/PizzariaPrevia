# USER_FLOWS — Forno Bella Pizzeria

Status: **rascunho para aprovação** · Gerado em 25/11/2026 · Base: ETAPAS 3 a 9.

Legenda: ➜ passo; ◆ decisão; ✖ erro ou saída; (S) conferido no servidor.

## 1. Visitante: pedir uma pizza inteira

1. Abre o site ➜ vê barra do topo (Aberto agora ou Fechado) e hero.
2. ◆ Loja fechada? ➜ botões de pedir bloqueados com o horário de abertura; o visitante ainda vê o cardápio. **Fim.**
3. Entra por uma de 3 portas: promoção (Galeria 1), "Pizza inteira" (Galeria 2) ou um sabor do cardápio (Galeria 3).
4. Escolhe o sabor ➜ abre **Detalhes do produto**: tamanho (Broto ou Grande, com preço), remove ingredientes, borda, adicionais, observação, quantidade.
5. ◆ Sabor pausado? ➜ aparece "Indisponível" e o botão fica desligado.
6. Toca **Adicionar** ➜ item no carrinho (salvo neste aparelho) ➜ aviso de adicionado com atalho para o carrinho.

## 2. Visitante: pizza meio a meio (até 3 sabores)

1. Escolhe "Pizza meio a meio" (ou doce meio a meio) ➜ tamanho **Grande** (o Broto aceita só 1 sabor).
2. Escolhe 2 ou 3 sabores ➜ a tela mostra "Preço do sabor mais caro: R$ X".
3. ◆ Tenta passar de 3 sabores? ➜ o 4º é bloqueado com explicação.
4. Personaliza (borda, adicionais, observação) ➜ Adicionar.

## 3. Carrinho

1. Abre o carrinho ➜ vê itens, quantidades, observação por item, subtotal.
2. Edita quantidade, edita item (volta aos detalhes) ou remove. Escreve a **observação do pedido**.
3. ◆ Abaixo do pedido mínimo? ➜ botão desligado com "faltam R$ X".
4. ◆ Carrinho vazio? ➜ estado vazio com botão para ver o cardápio.
5. **Seguir para entrega e pagamento.**

## 4. Entrega e pagamento (checkout)

1. Escolhe **Entrega** ou **Retirada**.
2. Preenche nome e telefone (máscara e validação).
3. Se **Entrega**: informa CEP ➜ rua e bairro preenchidos pela consulta de CEP ➜ número e complemento.
4. (S) O sistema valida o endereço: converte em coordenadas, calcula a distância e acha a faixa de taxa.
   - ◆ Dentro da área ➜ mostra taxa e tempo estimado; se houver frete grátis, mostra "faltam R$ X" ou "frete grátis".
   - ◆ **Fora da área** ➜ aviso "não entregamos neste endereço" com **Escolher outro endereço** ou **Retirar na loja**; o botão de finalizar fica desligado para entrega.
   - ◆ Endereço não encontrado ou serviço fora do ar ➜ mensagem clara, pode tentar de novo ou escolher retirada.
5. Se **Retirada**: mostra endereço da loja e tempo estimado; sem taxa.
6. Escolhe o pagamento: **PIX online**, **dinheiro na entrega** (informa troco, opcional) ou **cartão na maquininha**.
7. Marca a caixa única de **aceite de dados e atualizações por WhatsApp** (link para a política).
8. Vê o resumo (itens, taxa, total) e toca **Finalizar pedido**.
9. (S) Valida: Turnstile, limites, loja aberta, itens disponíveis, preços, taxa, área, total.
   - ✖ Algum item ficou indisponível ou o preço mudou ➜ aviso com o que mudou e o total novo; o cliente confirma de novo.
   - ✖ Loja fechou nesse meio tempo ➜ aviso e pedido não é criado.
   - ✖ Limite de pedidos ou Turnstile falhou ➜ mensagem simples para tentar de novo em instantes.

## 5. Pagamento por PIX

1. Pedido criado como **aguardando pagamento**; tela do PIX: QR code, **copia e cola** com botão copiar, valor, contagem regressiva do prazo (padrão 15 min).
2. Cliente paga no app do banco.
3. A tela consulta o status a cada poucos segundos.
   - ◆ Pago ➜ tela de sucesso "Recebemos o seu pedido #0128" com o link de acompanhamento.
   - ◆ Prazo acabou ➜ estado **expirado** com **Gerar novo PIX** (mesmo carrinho) ou voltar ao cardápio.
   - ◆ Fechou a página ➜ pode voltar pelo **link de acompanhamento** (também mostra o PIX enquanto estiver válido).
4. O pedido só aparece na cozinha (ADM) depois de pago.

## 6. Pagamento na entrega

1. Pedido criado como **recebido** direto; tela de sucesso com link de acompanhamento e, se for dinheiro, o troco informado.

## 7. Acompanhamento por link

1. Cliente abre o link ➜ vê número do pedido, linha do tempo (pedido criado → aguardando confirmação → em preparo → saiu para entrega ou pronto para retirada → entregue), tempo estimado, itens e total.
2. A página consulta o servidor a cada poucos segundos.
3. ◆ Cancelado ➜ mostra "Pedido cancelado" e o motivo, se houver; se foi PIX pago, informa que o reembolso é feito pela pizzaria.
4. ✖ Link inválido ➜ mensagem genérica "pedido não encontrado" (não revela se o número existe).
5. Botão **Voltar ao cardápio**; sem botão de WhatsApp na demonstração.

## 8. Dono: entrar e preparar

1. Abre `/admin` ➜ tela de login (e-mail e senha).
2. ◆ Senha errada ➜ mensagem única "e-mail ou senha incorretos"; ◆ muitas falhas ➜ "tente novamente mais tarde".
3. ◆ 2 passos ligado ➜ pede o código do autenticador (ou código de recuperação).
4. Entra no **Início** com o resumo de hoje e do mês; no primeiro uso, o ADM pede para **ativar o som** (um toque, exigido pelos navegadores).

## 9. Dono: atender um pedido

1. Chega pedido novo ➜ som, aviso na tela e contador no menu (até ~5 s de atraso).
2. Abre o pedido ➜ vê itens, observações, endereço, telefone, pagamento, troco, histórico.
3. **Imprimir comanda** (opcional).
4. Toca o botão do próximo passo, na ordem: **Confirmar** ➜ **Iniciar preparo** ➜ **Saiu para entrega** (ou **Pronto para retirada**) ➜ **Entregue**. Não dá para pular etapas.
5. Se o pagamento era na entrega, ao entregar o sistema marca como pago.
6. Cada mudança gera evento para o bot (se a URL estiver cadastrada) e atualiza o link do cliente.

## 10. Dono: cancelar e reembolsar

1. Em qualquer pedido antes de "entregue" ➜ **Cancelar** ➜ pede motivo e confirma.
2. ◆ PIX já pago ➜ aparece **Reembolsar** (total ou parcial) ➜ confirma o valor ➜ o sistema chama o Mercado Pago e registra quem e quando.
3. ✖ Falha do gateway ➜ mensagem de erro e pedido continua cancelado com reembolso pendente, visível para tentar de novo.

## 11. Dono: cardápio

1. **Pausar item:** liga/desliga "Indisponível" em sabor, borda, adicional ou produto, na hora.
2. **Editar preço** por tamanho; **nova promoção** por percentual ou por valor manual; **ativar/desativar**.
3. **Foto:** enviar imagem ➜ pré-visualização ➜ salvar; tipos e tamanho validados.
4. Mudanças valem para pedidos novos; pedidos antigos não mudam.

## 12. Dono: loja e aparência

1. **Entrega e configurações:** endereço da loja (o sistema obtém as coordenadas e mostra para conferir), raio, faixas de taxa, frete grátis, pedido mínimo, horários por dia, tempos estimados, URL do webhook do bot, prazo do PIX.
2. **Aparência:** escolhe uma das 5 paletas ou monta a **Personalizada** com 4 cores ➜ vê prévia ➜ o sistema avisa contraste ruim e impede salvar o ilegível ➜ também edita logo, nome, história, contatos, redes sociais e política de privacidade.

## 13. Dono: privacidade

1. **Apagar dados de um cliente:** busca por telefone ou número do pedido ➜ vê quantos pedidos serão anonimizados ➜ confirma ➜ nome, telefone e endereço são removidos; valores e itens permanecem.

## 14. Dono: demonstração

1. **Restaurar dados de demonstração** (só existe se for a versão demo) ➜ confirmação com aviso do que será apagado ➜ pedidos de teste somem e cardápio e configurações voltam ao inicial.

## 15. Estados e erros transversais

| Situação | Comportamento |
|---|---|
| Sem internet | aviso discreto, carrinho preservado, botão de tentar de novo |
| Servidor lento | indicador de carregamento; botões não duplicam envio |
| Sessão do ADM expirou | volta ao login mantendo a tela anterior |
| Aba do ADM em segundo plano | pode atrasar o aviso; ver `ADMIN_PANEL.md` |
| Atualizar a página | carrinho volta; PIX em andamento volta pelo link |
