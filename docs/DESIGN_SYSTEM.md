# DESIGN_SYSTEM — Forno Bella Pizzeria

Status: **rascunho para aprovação** · Gerado em 25/11/2026 · Base: ETAPAS 1 a 5 (direção **A · Forno a Lenha**) e protótipo no Design (https://claude.ai/artifact/TyXBV8yn6GReutpHrdCoT1).

## 1. Princípios

Tradicional italiana e artesanal; caloroso e próximo; mobile first; acessível; pedido em poucos toques; tudo que a pizzaria muda (cores, nome, logo, fotos, textos) vem do ADM, nunca fixo no código. O **hero é fixo** e mantém cores claras sobre escurecimento.

## 2. Tokens de cor

Os componentes usam **variáveis CSS** (ex.: `--bg`, `--text`), nunca cores fixas. O tema ativo é gravado no ADM e aplicado no `:root`.

### Paleta padrão "Forno a Lenha" (escura)
| Token | Valor | Uso |
|---|---|---|
| `--bg` | `#17100c` | fundo principal |
| `--bg-section` | `#1f1510` | seções e banner |
| `--card` | `#231913` | cards |
| `--footer` | `#0f0a07` | rodapé |
| `--border` | `#3a2a20` | bordas suaves |
| `--border-strong` | `#5a4333` | chips e banner |
| `--text` | `#f5ecdc` | texto principal |
| `--text-muted` | `#d8c9b0` / `#cdbfa8` | texto secundário |
| `--accent` | `#c62828` | botões primários (destaque editável) |
| `--accent-text` | `#ffffff` | texto sobre o destaque |
| `--highlight` | `#ff9b82` | realce em títulos |
| `--secondary` | `#e9b872` | dourado: rótulos, contornos, CTA do meio a meio |
| `--ok` | `#7fbf6a` / `#9fcf8c` / `#b9d9a8` | "Aberto", tag Salgada |
| `--sweet` | `#f2a9b5` | tag Doce |

### Paletas prontas
Forno a Lenha (padrão, escuro), **Trattoria Creme** (claro), **Basílico** (verde escuro), **Moderno Claro** (branco) e **Napoli** (azul-marinho). Os valores finais de cada uma vêm do protótipo e entram no banco como dados de demonstração.

### Paleta Personalizada
O dono escolhe 4 cores: **fundo, texto, destaque e secundária**. O sistema deriva as demais (card, bordas, texto secundário, rodapé, texto sobre o botão) por regra fixa:
- `--card` e `--bg-section`: fundo clareado ou escurecido em passos pequenos (direção conforme o tema ser claro ou escuro).
- `--border`: mistura de texto com fundo (cerca de 15%); `--border-strong`: cerca de 30%.
- `--text-muted`: mistura de texto com fundo (cerca de 75% texto).
- `--accent-text`: branco ou quase preto, o que der maior contraste com o destaque.
- `--footer`: fundo ligeiramente mais profundo.
**Validação de contraste (WCAG AA):** o ADM calcula e avisa quando um par fica abaixo de 4,5:1 (texto normal) ou 3:1 (texto grande e contornos de componentes) e **bloqueia o salvamento** se o texto principal sobre o fundo ou o texto do botão ficar ilegível. As 5 paletas prontas precisam passar nesta checagem antes da entrega (pendência aberta na ETAPA 2).

## 3. Tipografia

| Uso | Fonte | Peso |
|---|---|---|
| Títulos | Playfair Display | 600/700, itálico 500 para ênfase |
| Texto e interface | Inter | 400/500/600 |
| Rótulos de seção | Inter, caixa alta, espaçamento 3 px, cor secundária | 600 |

Escala (mobile / desktop): título hero 36 / 64 px; título de seção 28 / 40; título de card 20 / 22; corpo 16; legenda 13–14. Altura de linha 1,5 no corpo. As fontes são servidas pelo próprio site (arquivos locais), sem pedir a servidores de terceiros, o que combina com a regra de não rastrear visitantes.

## 4. Espaçamento, grade e formas

- Escala de espaço em múltiplos de 4 px (4, 8, 12, 16, 24, 32, 48, 64, 96).
- Contêiner máximo 1200 px; protótipo desktop em 1280 px; protótipo mobile em 390 px.
- Raios: botões **pílula (999 px)**, cards **20 px**, imagens quadradas com cantos arredondados, campos 12 px.
- Sombras suaves e quentes; bordas finas em vez de sombra pesada em fundos escuros.
- Alvos de toque **≥ 44 × 44 px**.

## 5. Ícones

Linha fina (traço 1,5 px, pontas arredondadas), na cor do texto ou secundária. Um conjunto único e consistente (SVG próprio ou biblioteca de linha fina), servido junto com o app.

## 6. Componentes

| Componente | Descrição |
|---|---|
| Botão primário | pílula, fundo destaque, texto `--accent-text` |
| Botão secundário | pílula com contorno secundário (dourado) |
| Botão CTA especial | pílula dourada com texto escuro (meio a meio) |
| Botão redondo do carrossel | círculo com seta, 44 px, dois lados |
| Chip de categoria | Salgadas, Doces, Meio a meio, Bebidas |
| Etiquetas | Salgada (verde), Doce (rosa), Promoção, Indisponível |
| Card de produto | foto 280 px no topo, etiqueta, nome, descrição, "a partir de", botão Adicionar |
| Card de promoção | igual ao de produto com preço "de/por" |
| Banner "Monte meio a meio" | ícone de pizza dividida em SVG |
| Barra do topo | Aberto agora (verde) ou Fechado (com horário) |
| Cabeçalho | logo, navegação, status, botão Carrinho com contagem |
| Gaveta mobile | menu lateral com links, status, horários, carrinho, WhatsApp discreto |
| Seletor de tamanho | Broto/Grande com fatias e preço |
| Seletor de sabores | 1 sabor no Broto; até 3 no Grande, mostrando o preço do mais caro |
| Linha de item do carrinho | foto pequena, nome, sabores, extras, observação, quantidade, remover |
| Campos de formulário | rótulo sempre visível, ajuda, erro textual, máscara de telefone e CEP |
| Aviso de frete | faixa da taxa, "faltam R$ X para frete grátis" |
| Tela PIX | QR code, copia e cola, contagem do prazo, estados pago e expirado |
| Linha do tempo de status | 5 etapas com a atual destacada |
| Estados vazios e de erro | carregando, carrinho vazio, fora da área, loja fechada, sem conexão |

## 7. Movimento (aprovado)

1. Pizza do hero entra pela esquerda (cerca de 1 s, leve rotação).
2. Textos iniciais entram em sequência subindo levemente (fade).
3. Botões sobem e brilham no hover; "afundam" (escala 0,96) ao toque.
Tudo desligado com `prefers-reduced-motion`. Sem animação que atrase uma ação.

## 8. Acessibilidade

- Contraste AA em todos os temas (ver validação acima); nunca usar só cor para significar estado (acompanhar com texto e ícone).
- Foco visível em tudo, ordem de tabulação lógica, links "pular para o conteúdo".
- Rótulos e mensagens de erro ligados aos campos (`aria-describedby`); erros anunciados.
- Carrossel operável por teclado e leitor de tela; botões com nome acessível; indicador de posição textual.
- Imagens com texto alternativo vindo do cadastro (nome do sabor por padrão).
- Alerta de pedido novo no ADM com texto além de som.
- Tela PIX com o código copiável por botão e por seleção.

## 9. Imagens

- Fotos de produto quadradas; envio pelo ADM com tipos permitidos e tamanho máximo; o sistema gera versões menores (WebP) para a lista e para o detalhe.
- Foto genérica de bebida (sem marca) quando não houver foto própria. A foto atual com marca visível **não entra** no site.
- Hero: foto fixa (pizza de pepperoni em madeira escura).
- Logo: selo circular; usar a **cópia com fundo transparente**.

## 10. ADM (proposta a validar)

O ADM **não usa o tema editável do site**: tem aparência sóbria e fixa (claro por padrão, contraste alto) com os mesmos componentes de campo e botão, para o dono nunca perder legibilidade por causa de uma cor escolhida no site. Cartões de pedido grandes no celular, menu enxuto, tabelas viram listas em tela estreita. Esta proposta será desenhada no Design quando você pedir as telas.

## 11. Tom de voz

Português informal-educado, caloroso, com toques italianos pontuais ("Buon appetito", "direto do forno"). Mensagens de erro dizem o que aconteceu e o que fazer, sem culpar o cliente.

## 12. Pendências de design

Telas mobile Meio a meio (até 3 sabores) e Detalhes do produto no novo modelo; foto genérica de bebida; tela do PIX; tela de acompanhamento; tela de entrega com faixa de taxa e frete grátis; tela fora da área com retirada; telas do ADM; checagem de contraste das 5 paletas.
