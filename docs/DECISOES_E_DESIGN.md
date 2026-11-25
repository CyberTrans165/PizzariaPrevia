# Forno Bella Pizzeria — Decisões e Referências de Design

Documento vivo. Registra o que já foi **aprovado** na entrevista e na definição de design.
Última atualização: 25/11/2026 · Status: **ETAPA 1 aprovada · ETAPA 2 aprovada** · **ETAPA 3 aprovada (landing page, página única)** · **ETAPA 4 aprovada (cardápio e produtos)** · **ETAPA 5 aprovada (carrinho e checkout)** · **ETAPA 6 aprovada (geolocalização e entrega)** · **ETAPA 7 aprovada (WhatsApp e notificações)** · **ETAPA 8 aprovada (pagamentos)** · **ETAPA 9 aprovada (painel ADM)** · **ETAPA 10 aprovada (segurança e LGPD)** · **ETAPA 11 aprovada (arquitetura)** · **ETAPA 12 aprovada (hospedagem)** · **entrevista concluída; 10 documentos de planejamento aprovados; desenvolvimento aprovado em 25/11/2026.** Fase 1 (base do projeto) entregue para aprovação; andamento em `forno-bella/docs/PROGRESSO.md`.

> Regra do projeto: a implementação só começa quando for dito explicitamente
> "APROVADO — PODE INICIAR O DESENVOLVIMENTO."

---

## 1. Visão geral

- **Projeto:** sistema web de pedidos delivery para pizzaria.
- **Finalidade:** **site demonstrativo** para apresentar a clientes (outras pizzarias).
- **Modelo de reaproveitamento:** **uma cópia por cliente** (projeto e banco próprios por pizzaria; troca de marca feita pelo painel ADM). Não será multi-pizzaria (multi-tenant).
- **Demo:** cardápio de exemplo (dados de demonstração editáveis/removíveis pelo ADM) e **pagamentos online em modo de teste (sandbox)** do gateway.

## 2. Identidade e posicionamento (ETAPA 1 — aprovada)

| Item | Decisão |
|---|---|
| Nome | **Forno Bella Pizzeria** (definitivo) |
| Logo | Selo circular com chama + fatia de pizza, vermelho/verde/creme (definitivo) |
| Região e endereço | Não fixos no código; **cadastrados no painel ADM** |
| Público | **Todos** (plataforma de delivery) → mobile-first, acessível, pedido em poucos toques |
| Personalidade | **Tradicional italiana e artesanal** (forno a lenha, madeira, ingredientes frescos) |
| Tom de comunicação | Caloroso e próximo, português informal-educado, toques italianos pontuais ("Buon appetito", "direto do forno") |
| Concorrentes / referências de sites | Nenhum informado; referências propostas pelo design |

## 3. Direção visual escolhida (ETAPA 2 — aprovada em 25/11/2026): **A · Forno a Lenha**

**Conceito:** fundo escuro de madeira, calor de forno, tipografia serifada elegante, vermelho vivo nos botões. Impressão premium e rústica.

### Paleta (valores usados no protótipo)
| Uso | Cor |
|---|---|
| Fundo principal | `#17100c` |
| Fundo de seção / banner | `#1f1510` |
| Cards | `#231913` |
| Rodapé | `#0f0a07` |
| Bordas | `#3a2a20` (suave) · `#5a4333` (contorno de chips e banner) |
| Texto principal | `#f5ecdc` |
| Texto secundário | `#d8c9b0` · `#cdbfa8` |
| **Destaque (tema editável)** | `#c62828` (vermelho) |
| Realce em títulos | `#ff9b82` |
| Dourado (rótulos, contornos, CTA do meio a meio) | `#e9b872` |
| Verde (status "Aberto", tag Salgada) | `#7fbf6a` · `#9fcf8c` · `#b9d9a8` |
| Rosa (tag Doce) | `#f2a9b5` |

### Ícones (aprovado)
- **Linha fina** (traço de 1,5 px, cantos arredondados), na cor do texto ou dourado.

### Tipografia
- **Títulos:** Playfair Display (600/700, itálico 500 para ênfase).
- **Texto e interface:** Inter (400/500/600).
- Rótulos de seção: caixa alta, espaçamento 3px, cor dourada.

### Formas e componentes
- **Botões: arredondados (pílula, raio 999px).** Primário vermelho com texto branco; secundário com contorno dourado; CTA especial dourado com texto escuro.
- Imagens: fotos **quadradas com cantos arredondados** (estilo aprovado).
- Cards de produto: raio 20px, foto no topo (280px), etiqueta de categoria, nome, descrição, preço "a partir de" e botão Adicionar.
- Chips de categoria: Salgadas, Doces, Meio a meio, Bebidas.
- Banner "Monte meio a meio" com ícone de pizza dividida (SVG).
- Cabeçalho: logo, navegação (Cardápio, Meio a meio, Nossa história, Contato), status "Aberto agora" e botão Carrinho.
- Rodapé: endereço, horários, WhatsApp e política de privacidade, todos vindos do painel ADM.

### Animações (aprovadas)
1. **A pizza do hero entra pela esquerda** (desliza com leve rotação, cerca de 1 s).
2. **Fade nos primeiros textos** (eyebrow, título, parágrafo, botões e itens de apoio entram em sequência, subindo levemente).
3. **Animação nos botões:** ao passar o mouse sobem e brilham; ao tocar/clicar "afundam" (escala 0,96).
- Acessibilidade: todas desativadas para quem usa `prefers-reduced-motion`.

### Temas editáveis (aprovado)
- O painel ADM poderá **mudar completamente as cores do site**, além de nome, logo, contatos e fotos.
- Para o site não ficar feio, haverá **paletas padrão prontas** (o cliente escolhe uma) e a opção **Personalizada**, onde as demais cores (cartões, bordas, texto secundário, rodapé, cor do texto sobre botões) são derivadas automaticamente a partir de 4 cores: fundo, texto, destaque e secundária.
- Paletas padrão no protótipo: **Forno a Lenha** (padrão, escuro), **Trattoria Creme** (claro), **Basílico** (verde escuro), **Moderno Claro** (branco) e **Napoli** (azul-marinho).
- O hero (foto com texto sobre ela) mantém cores fixas claras sobre escurecimento, para continuar legível em qualquer paleta.
- Pendente: validar contraste (WCAG) de cada paleta e avisar no ADM quando uma cor personalizada for ilegível.

### Estrutura da página inicial: três galerias (aprovado)
1. **Pizzas na promoção** (preço "de/por", etiqueta Promoção), em carrossel com **dois botões redondos, um à esquerda e outro à direita**, para passar as opções (desktop mostra 3 por vez; no celular, 1 por vez com indicador de posição).
2. **Monte sua pizza:** Pizza inteira · Pizza meio a meio · Pizza doce (inteira) · Pizza doce meio a meio.
3. **Cardápio de pizzas padrão:** lista de sabores com ingredientes e preço por tamanho, com abas Salgadas e Doces.

### Regras de preço (aprovadas)
- **Promoções:** o preço promocional é editado **manualmente no painel ADM**, de duas formas: por **percentual** de desconto ou informando o **valor manual de cada pizza**.
- **Meio a meio:** o preço da pizza é sempre o do **sabor mais caro** entre os dois escolhidos (vale para salgada e doce, no tamanho escolhido).

### Fluxo de pedido (aprovado)
Três entradas (promoção, monte sua pizza, cardápio) levam ao mesmo caminho: 1) escolher sabor (1 sabor na inteira, 2 no meio a meio) → 2) personalizar (tamanho, borda, adicionais, remover ingredientes, observação) → 3) carrinho (observações, subtotal; backend recalcula) → 4) entrega ou retirada (endereço digitado, taxa por faixa de distância) → 5) pagamento (PIX online ou na entrega, em dinheiro ou cartão) → 6) pedido salvo (**Pedido criado**) → 7) o pedido aparece no ADM (na versão oficial, o bot avisa o cliente) → 8) proprietário confirma (**Confirmado**, em preparo, saiu para entrega ou pronto para retirada, entregue, cancelado).

### ETAPA 3 — Landing page (APROVADA em 25/11/2026)
- **Layout: página única**, nesta ordem: barra do topo, cabeçalho, hero, Galeria 1 (promoções), Galeria 2 (monte sua pizza), Galeria 3 (cardápio), nossa história, horários, endereço e contato, rodapé enxuto. A divisão em duas páginas foi testada e **não foi adotada** (removida do canvas).
- **Barra do topo:** mostra **Aberto agora** ou **Fechado** (com o horário de abertura ou fechamento do dia), calculado pelos horários do ADM. No protótipo há o ajuste "Loja" (Aberta/Fechada) para ver os dois estados.
- **Loja fechada:** botões de pedir ficam bloqueados com aviso do horário (agendamento fica para uma versão futura).
- **Hero:** fixo, não editável pelo ADM.
- **Horários:** todos os dias da semana, com "hoje" em destaque (valores de exemplo; os reais vêm do ADM).
- **Endereço:** texto do ADM e botão **Como chegar** (abre o Google Maps), sem mapa embutido.
- **Contato:** discreto. Link pequeno "Falar com a pizzaria no WhatsApp", sem botão flutuante; redes sociais editáveis no ADM.
- **Demonstração:** pedidos aparecem **somente no painel ADM**; o cliente não recebe mensagens.
- **Versão oficial (a cargo do cliente):** bot de WhatsApp com confirmação e atualização de status. O sistema guarda o telefone do cliente e cada mudança de status.
- **Status do pedido:** recebido, confirmado, em preparo, saiu para entrega ou pronto para retirada, entregue e cancelado.
- Mobile atualizado: barra do topo Aberto agora, seção de horários, endereço e contato, rodapé enxuto, WhatsApp como link discreto no menu e tela de sucesso sem "Abrir WhatsApp" (mostra acompanhamento: pedido criado → aguardando confirmação → em preparo → saiu para entrega ou pronto para retirada → entregue).

### ETAPA 4 — Cardápio e produtos (APROVADA em 25/11/2026)
- **Tamanhos:** **Broto** (4 fatias) e **Grande** (8 fatias). **Não existe tamanho Média.** Nomes e número de fatias editáveis no ADM.
- **Sabores por pizza:** **Broto: 1 sabor** (sempre inteira). **Grande: até 3 sabores** (inteira, meio a meio ou três sabores). O meio a meio só existe no Grande. Os limites podem ser alterados no ADM.
- **Preço do meio a meio:** o do **sabor mais caro** entre os escolhidos, no tamanho Grande (vale para salgada e doce).
- **Borda recheada e adicionais:** **cadastrados no ADM, cada um com preço próprio** (ativar, desativar, editar). Os valores das telas são exemplo.
- **Outros produtos** (bebidas, combos, sobremesas etc.): **editáveis no ADM**; quais categorias existem fica a critério de cada pizzaria. Na demonstração haverá bebidas de exemplo.
- **Disponibilidade:** o ADM **pausa um sabor ou produto**. Ele aparece apagado com aviso "Indisponível" e não pode ser pedido. Sem agendamento por horário e sem controle de estoque nesta versão.
- **Foto de bebida:** trocar a foto com marca visível por **imagem genérica**. Cada pizzaria sobe as próprias fotos no ADM.
- Protótipo desktop ajustado (só Broto e Grande, Galeria 2 com "até 3 sabores"). **Pendente:** telas mobile Meio a meio (3 sabores, só Grande) e Detalhes do produto (só Broto e Grande, borda e adicionais), foto de bebida genérica e itens de exemplo.

### ETAPA 5 — Carrinho e checkout (APROVADA em 25/11/2026)
- **Sem cupom de desconto.** O campo sai do carrinho. Descontos existem só nas promoções de pizza (ETAPA 2).
- **Pedido mínimo:** configurável no ADM, **sem mínimo por padrão**. Se o carrinho não alcança o mínimo, o botão avisa quanto falta.
- **Cliente como visitante, sem conta:** informa **nome, telefone e endereço** (ou escolhe retirada) e **aceita o uso dos dados (LGPD)**. O telefone fica salvo no pedido para o bot da versão oficial.
- **Acompanhamento:** ao finalizar, o cliente recebe uma **página de acompanhamento por link**, com o status em tempo real, sem login. O link usa um código difícil de adivinhar.
- **Agendamento:** **não há**. O cliente só pede para agora; com a loja fechada o pedido fica bloqueado.
- **Tempo estimado:** faixa de **entrega** e faixa de **retirada**, editáveis no ADM, mostradas no checkout e no acompanhamento.
- **Carrinho:** **lembrado neste aparelho** (volta ao atualizar a página). Há **observação por item** (ex.: sem cebola) e **observação geral do pedido**.
- O servidor recalcula preços, taxa e total antes de salvar o pedido; o valor mostrado no navegador nunca é o definitivo.
- Telas mobile Carrinho e Checkout ajustadas (sem cupom, observação do pedido, tempo estimado e aceite LGPD). **Pendente:** criar a tela de acompanhamento do pedido por link.

### ETAPA 6 — Geolocalização e entrega (APROVADA em 25/11/2026)
- **Área de entrega:** **raio em km a partir da loja**. O ADM cadastra o endereço da loja (coordenadas) e o raio máximo. O servidor calcula a distância em linha reta (Haversine) e é ele quem aceita ou recusa o endereço.
- **Taxa:** por **faixas de distância** cadastradas no ADM (ex.: até 3 km R$ 5, de 3 a 6 km R$ 8). O fim da última faixa é o raio máximo. A taxa aparece assim que o endereço é validado.
- **Entrega grátis:** **acima de um valor de pedido**, editável no ADM (pode ser desligada). A tela mostra quanto falta para ganhar o frete grátis.
- **Como o cliente informa o local:** **só endereço digitado** (CEP, rua e bairro, número). **Não há botão de GPS** nesta versão. O endereço é convertido em coordenadas por um serviço de mapas.
- **Serviço de mapas:** **gratuito na demonstração** (serviço aberto, como OpenStreetMap/Nominatim, com consulta de CEP). Cada pizzaria oficial pode trocar por um serviço pago; a decisão final entra na ETAPA 11.
- **Fora da área:** a entrega é **bloqueada**, com aviso e opção de **escolher outro endereço ou retirar na loja**. O servidor também recusa o pedido.
- **Retirada:** sem taxa; mostra o endereço da loja e o tempo estimado de retirada.
- Tela mobile Entrega e pagamento: botão de GPS removido e campo de CEP incluído. **Pendente:** mostrar a faixa de taxa e o aviso de frete grátis, e ajustar a tela de erro de área para a opção de retirada.

### ETAPA 7 — WhatsApp e notificações (APROVADA em 25/11/2026)
- **Demonstração:** **nenhuma mensagem é enviada.** Os pedidos aparecem só no ADM. O contato por `wa.me` continua como link discreto.
- **Versão oficial (bot a cargo do cliente):** o bot usa a API oficial do WhatsApp (WhatsApp Business Platform, com mensagens-modelo aprovadas pela Meta, cobradas por mensagem entregue). Não usar soluções não oficiais por QR code.
- **Como o bot é avisado:** **webhook para uma URL cadastrada no ADM.** A cada mudança de status o sistema envia os dados do pedido para o bot, com uma **assinatura de segurança** que o bot confere. Na demonstração a URL fica vazia e nada é enviado. Se o envio falhar, o sistema tenta de novo e registra a falha.
- **Eventos:** **todas as mudanças de status** viram um evento com data e hora: recebido, confirmado, em preparo, saiu para entrega ou pronto para retirada, entregue e cancelado. O bot escolhe quais mensagens enviar.
- **Consentimento:** **uma única caixa no checkout, junto do aceite de dados**, cujo texto cita o recebimento de atualizações **pelo WhatsApp**. O sistema guarda a data, o texto aceito e o telefone. **Ponto de atenção:** uma caixa separada seria prova mais forte para a Meta e a LGPD; pode ser separada depois, sem mudar o resto.
- **Aviso ao dono (ADM):** lista de pedidos atualizada **em tempo real**, com **som e aviso na tela** a cada novo pedido. Sem e-mail nem mensagem.
- **O que o pedido guarda para o bot:** código do pedido, nome, telefone, tipo (entrega ou retirada), itens, total, status atual, link de acompanhamento e histórico de status.

### ETAPA 8 — Pagamentos (APROVADA em 25/11/2026)
- **Formas de pagamento:** **PIX online**, **dinheiro na entrega (com troco)** e **cartão na maquininha, na entrega**. **Não há cartão online**; o sistema não recebe nem guarda dados de cartão.
- **Gateway:** **Mercado Pago**, em **modo de teste (sandbox)** na demonstração, sem cobrança real. Só o PIX passa por ele.
- **Fluxo do PIX:** o cliente vê o QR code e o código copia e cola; o pagamento é confirmado por **webhook** do gateway, e o servidor confere a assinatura antes de aceitar. O pedido só chega à cozinha depois de pago.
- **PIX não pago:** o pedido **expira sozinho** após um prazo editável no ADM (padrão sugerido: 15 minutos). O cliente pode tentar de novo.
- **Pagamento na entrega:** o pedido segue direto para a cozinha como "pagar na entrega". O cliente informa o troco quando for dinheiro. O ADM marca o pedido como pago ao ser entregue.
- **Cancelamento e reembolso:** **botão de reembolso no ADM** que chama o gateway, total ou parcial, só para pedidos pagos por PIX. O sistema registra quem fez e quando. Pedidos pagos na entrega apenas são cancelados.
- **Segurança:** valor, taxa e total são calculados no servidor. O sistema guarda só o identificador do pagamento, o status e o valor. Chaves do gateway ficam só no servidor.
- Tela mobile Entrega e pagamento ajustada (PIX e pagar na entrega). **Pendente:** tela do PIX (QR code, contagem do prazo, estado de pago e expirado).

### ETAPA 9 — Painel ADM (APROVADA em 25/11/2026)
- **Acesso:** **só o dono**, com **e-mail e senha**. Senha forte, limite de tentativas e sessão com expiração. Sem funcionários e sem perfis nesta versão.
- **Telas da primeira versão:**
  1. **Início (resumo):** pedidos e faturamento de **hoje e do mês**, ticket médio, sabores mais vendidos e pedidos por status. Sem exportação.
  2. **Pedidos em tempo real:** quadro por status, detalhes do pedido (itens, observações, endereço, telefone, forma de pagamento, troco, histórico de status), mudar status, cancelar e reembolsar.
  3. **Cardápio e produtos:** sabores, preços por tamanho, promoções (por percentual ou valor manual), bordas, adicionais, bebidas e outros produtos, fotos e **pausar item**.
  4. **Entrega, horários e configurações da loja:** endereço da loja, raio e faixas de taxa, frete grátis, pedido mínimo, horários por dia, tempos estimados de entrega e retirada, URL do webhook do bot e prazo de expiração do PIX.
  5. **Aparência do site:** paleta de cores (prontas ou personalizada), logo, nome, texto da história, contatos e redes sociais.
- **Celular:** o ADM é **responsivo**, com atenção especial à tela de pedidos (cartões grandes, menu enxuto, alvos de toque de 44 px ou mais).
- **Mudar status:** cada pedido mostra um **botão do próximo passo** (Confirmar, Iniciar preparo, Saiu para entrega ou Pronto para retirada, Entregue) e a opção **Cancelar**. Não é possível pular etapas. Cada mudança gera o evento do bot (ETAPA 7).
- **Comanda:** botão **Imprimir comanda**, que abre uma versão do pedido própria para impressão (impressão do navegador, papel comum ou térmico).
- **Aviso de pedido novo:** som e aviso na tela, em tempo real (ETAPA 7).
- **Demonstração:** botão **Restaurar dados de demonstração**, com confirmação, que apaga os pedidos de teste e volta o cardápio e as configurações ao estado inicial. Existe só na versão demonstrativa.
- **Fora desta versão:** funcionários e perfis, relatórios exportáveis, clientes cadastrados, controle de estoque.
- Pendente: desenhar as telas do ADM no canvas (desktop e celular) quando for pedido; o documento ADMIN_PANEL.md detalha cada tela.

### ETAPA 10 — Segurança e LGPD (APROVADA em 25/11/2026)
**Decisões suas:**
- **Retenção de dados pessoais:** **sem prazo**. Nome, telefone e endereço ficam guardados indefinidamente nos pedidos. **Ponto de atenção:** a LGPD pede guardar o mínimo pelo tempo necessário. Por isso a política de privacidade deve dizer isso claramente, e o ADM deve ter uma forma de **apagar ou anonimizar os dados de um cliente que pedir**. Um prazo automático pode ser ligado depois, sem refazer nada.
- **Anti-abuso:** **CAPTCHA discreto** no envio do pedido (serviço externo, que entra na política de privacidade), além de limite de pedidos por telefone e por aparelho.
- **Login do dono:** senha forte, limite de tentativas e **confirmação em dois passos opcional** (aplicativo autenticador). Na demonstração fica desligada.
- **Cookies e análise:** **sem análise de visitas e sem rastreamento.** Só o necessário (carrinho e sessão do ADM), portanto **sem banner de cookies**.

- **Login do dono, como funciona (decisão sua, acrescentada em 25/11/2026):** acesso **somente por e-mail e senha**, e **toda a conferência acontece no servidor**. A senha nunca é guardada: o servidor guarda só o **hash** dela (algoritmo próprio para senhas, como Argon2id ou bcrypt, com salt). Ao entrar, o servidor confere a senha digitada contra o hash e cria uma **sessão com ID aleatório**, também **guardado no servidor** (tabela de sessões, com validade e possibilidade de encerrar). O navegador recebe apenas esse ID, em cookie **HttpOnly, Secure e SameSite**, sem JavaScript conseguir ler. Sair do ADM apaga a sessão no servidor. Visitantes do site continuam sem login.
  - **Cuidados adotados:** o ID é longo e imprevisível (mínimo 128 bits); no banco guardo o **hash do ID da sessão**, e não o ID puro, para que um vazamento do banco não entregue sessões ativas; o ID é trocado a cada login; mensagem de erro igual para e-mail ou senha errados; limite de tentativas por e-mail e por IP; proteção contra requisições forjadas (CSRF) nas ações do ADM; o cookie de sessão é **necessário**, então continua **sem banner de cookies**.
  - **Impacto na arquitetura (decidir na ETAPA 11):** isto troca o login pronto do Supabase (que guarda um token no navegador) por um **login próprio nas funções de servidor**, com tabelas de usuário do dono e de sessões. É mais trabalho, mas dá o controle que você pediu. A confirmação em dois passos opcional será feita sobre esse login.

**Padrões técnicos adotados (valem se você não objetar):**
- Tráfego sempre em **HTTPS**; cabeçalhos de segurança no site.
- **Regras de acesso no banco (RLS)**: o visitante só lê o cardápio e o próprio pedido pelo código do link; só o dono lê e altera pedidos e configurações.
- Chave de serviço do banco, chave do gateway e segredo do webhook **só no servidor**, nunca no navegador nem no repositório.
- **Validação de tudo no servidor** (preços, taxa, total, área, horário, disponibilidade). O navegador nunca decide valor.
- **Webhooks** (pagamento e bot) com **assinatura conferida**; repetições do mesmo evento não duplicam efeito.
- **Envio de fotos** pelo ADM só de tipos de imagem permitidos, com tamanho máximo.
- **Registro de ações do dono** (quem mudou status, preço, reembolso e quando).
- **Logs sem dados pessoais** e sem dados de pagamento.
- **Cópias de segurança** automáticas do banco.
- Pedidos e acompanhamento por **código longo e imprevisível**, sem sequência adivinhável na URL.
- Textos e fotos enviados pelo cliente ou pelo dono são **tratados como não confiáveis** (sem HTML ou script executável).

### ETAPA 11 — Arquitetura (APROVADA em 25/11/2026)
**Decisões suas:**
- **Servidor:** **Funções do Supabase (Edge Functions)** ligadas ao banco Postgres. Rodam o login próprio (hash e sessões), o cálculo e a validação do pedido, a conferência de entrega, os webhooks do Mercado Pago e do bot, e o envio de fotos. **O Supabase Auth não é usado.** Limite conhecido: código em Deno/TypeScript e execuções curtas.
- **Tempo real do ADM:** **consulta ao servidor a cada cerca de 5 segundos**, com a sessão do dono, mostrando som e aviso na tela quando chega pedido novo. Aviso com até 5 s de atraso. **Isto ajusta o "tempo real" da ETAPA 7:** o resultado para o dono é o mesmo, mas sem o Supabase Realtime. Pode ser trocado depois por Realtime com token curto sem refazer o resto.
- **Página de acompanhamento do cliente:** usa a mesma ideia, consultando o status do pedido pelo código do link a cada poucos segundos.
- **Estrutura do código:** **um app só** (React, Vite, TypeScript, Tailwind), com as rotas do site e o **ADM em /admin**, carregado só quando o dono entra. A pasta de funções de servidor fica no mesmo repositório.
- **Mapas:** **serviço gratuito com camada trocável.** OpenStreetMap/Nominatim para converter endereço em coordenadas e consulta pública de CEP (BrasilAPI ou ViaCEP), chamados pelo servidor, com cache e respeitando o limite de uso. A pizzaria oficial pode trocar por Google Maps ou Mapbox mudando só essa camada.

**Padrões adotados (valem se você não objetar):**
- Navegador nunca fala direto com tabelas sensíveis: **todo acesso a pedidos, configurações e ADM passa pelas funções**. O visitante só lê o cardápio público.
- Camadas separadas no código de servidor para **login, pedidos, entrega, pagamento, webhooks e mapas**, para trocar uma peça sem mexer nas outras.
- Valores de dinheiro guardados em **centavos (inteiros)**.
- **CAPTCHA:** serviço de baixo atrito (como o Cloudflare Turnstile), conferido no servidor; a escolha final fica para a ETAPA 12.

### ETAPA 12 — Hospedagem e publicação (APROVADA em 25/11/2026)
**Decisões suas:**
- **Hospedagem do site:** **Vercel** (plano gratuito na demonstração, deploy automático a cada alteração enviada ao repositório).
- **Login e cookie no mesmo endereço do site:** a Vercel **encaminha `/api` para as funções do Supabase**. Assim o cookie de sessão do ADM é do próprio endereço do site (não de terceiros) e o navegador não o bloqueia. Sem isso o login do dono poderia falhar em alguns navegadores.
- **Endereço da demonstração:** **gratuito da hospedagem** (algo como `forno-bella.vercel.app`). Cada pizzaria oficial coloca depois o domínio próprio.
- **Ambientes e cópia por cliente:** **demonstração online mais um repositório modelo.** Para cada cliente, cria-se um projeto Supabase e um projeto Vercel novos, seguindo um **passo a passo (checklist) documentado no DEPLOYMENT.md**. Sem ambiente de teste separado e sem automação nesta versão.
- **CAPTCHA:** **Cloudflare Turnstile**, conferido no servidor. Entra na política de privacidade como serviço externo.

**Padrões adotados (valem se você não objetar):**
- **Segredos** (chaves do banco, do Mercado Pago, do Turnstile e do webhook) só em variáveis de ambiente do servidor, nunca no repositório. O repositório traz um arquivo de exemplo sem valores.
- **Banco versionado:** a estrutura do banco e os dados de demonstração vêm de arquivos de migração e de uma carga inicial, para recriar tudo em um cliente novo.
- **Cópia de segurança** do banco ligada em cada projeto de cliente.
- **Agendador no servidor** para expirar PIX não pago e limpar sessões vencidas.
- **Monitoramento simples:** registro de erros nas funções, sem dados pessoais (ETAPA 10).
- Mercado Pago em **sandbox** na demonstração e em produção só na cópia do cliente, com as credenciais dele.

### Versão mobile da direção A (aprovada)
Telas de 390 px no canvas: Início (hero com pizza entrando pela esquerda, galerias 1, 2 e 3), **Meio a meio interativo** (escolhe tamanho e 2 sabores; o total mostra o sabor mais caro), Carrinho (quantidade, editar, remover, subtotal; o cupom foi retirado na ETAPA 5), Entrega e pagamento (entrega ou retirada, dados, endereço digitado com CEP, PIX ou pagar na entrega, troco, observações) e Estados e mensagens (carregando, carrinho vazio, erro de área de entrega, sucesso com Pedido criado e acompanhamento do status, sem abrir o WhatsApp).
- Alvos de toque de pelo menos 44 px, campos com rótulo, animações respeitam movimento reduzido.
- **Menu mobile aberto:** gaveta lateral com Promoções, Monte sua pizza, Cardápio, Nossa história, Horários e endereço e Contato, status Aberto agora e horários do ADM, botão Meu carrinho e link discreto para o WhatsApp, e política de privacidade.
- **Detalhes do produto:** foto grande, categoria, descrição, tamanho (com preço), ingredientes que o cliente pode remover (toque), borda recheada, adicionais, observações, quantidade e botão Adicionar com total. Valores de borda e adicionais são placeholders (definir na ETAPA 4).
- Nas telas mobile as cores estão fixas na paleta Forno a Lenha; o tema editável vale para todas na implementação.

## 4. Imagens e arquivos de referência

Pasta do projeto: `Pizzaria trampo/Assets/`
- `logo-pizzaria.webp` — logo (512×512, fundo branco). Para o site foi gerada uma **cópia com fundo transparente** (PNG), sem alterar o original.
- `19499654-26e6-4a89-8f60-3dfa8f341586.png` — pizza de pepperoni em madeira escura (1672×941), usada como hero.
- `pizza-salgada.webp` — Margherita (512×512).
- `pizza-doce.webp` — chocolate com morango (512×512).
- `bebida.webp` — refrigerante (341×512). Mostra marca Coca-Cola visível: **decidido na ETAPA 4:** trocar por imagem genérica.

Protótipo visual (Design): https://claude.ai/artifact/TyXBV8yn6GReutpHrdCoT1
- Artboard **A · Forno a Lenha** (escolhido). As direções B (Trattoria, creme/xadrez) e C (Delivery artesanal) foram removidas do canvas pelo próprio cliente.

Textos e preços do protótipo são **exemplos de demonstração** (Margherita R$ 42,90 · Chocolate com Morango R$ 39,90 · Refrigerante R$ 8,00).

## 5. Regras de negócio definidas no prompt mestre (valem como ponto de partida; detalhar nas etapas seguintes)

- Cardápio: pizza inteira salgada e doce, meio a meio salgada e doce, bebidas.
- Entrega por **raio** (coordenadas, Haversine), validada no backend; faixas e taxas configuráveis no ADM.
- WhatsApp: **na demonstração, sem envio**: o pedido é salvo no banco e aparece no ADM. O bot de mensagens automáticas fica para a versão oficial, a cargo do cliente (ver ETAPA 3). Contato por `wa.me` apenas como link discreto.
- Pagamento: **PIX online** (confirmação por webhook) e **na entrega** (dinheiro ou cartão na maquininha); sem cartão online; nunca guardar dados de cartão.
- Painel administrativo: acesso exclusivo do proprietário (dashboard, pedidos, produtos, entregas, descontos, configurações).
- Cálculos financeiros sempre validados no backend.
- Stack inicialmente planejada (confirmada na ETAPA 11): React, Vite, TypeScript, Tailwind, Supabase.

## 6. Pendências da ETAPA 2 (antes de aprovar o design)

- (ETAPA 2 aprovada.) Itens que seguem adiante:
- Contraste (WCAG) de cada paleta.
- Tamanhos, preços por tamanho e regra de preço do meio a meio (ETAPA 4); os valores do protótipo (Broto/Média/Grande) são só exemplo.

## 7. Próximas etapas

ETAPA 4 (aprovada), 5 (aprovada), 6 (aprovada), 7 (aprovada), 8 (aprovada), 9 (aprovada), 10 (aprovada), 11 (aprovada), 12 (aprovada). **Entrevista concluída.** Agora: os 10 documentos de planejamento (pasta `Documentos/`), revisão e aprovação final. **Desenvolvimento aprovado em 25/11/2026.** Código em `Pizzaria trampo/forno-bella/`; andamento por fase em `forno-bella/docs/PROGRESSO.md`.
