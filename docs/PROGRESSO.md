# Progresso do desenvolvimento

Desenvolvimento aprovado em 25/11/2026. Cada fase termina com entrega testável e aprovação antes da próxima (IMPLEMENTATION_PLAN.md).

| Fase | Situação |
|---|---|
| 0 · Preparação e provas | **Parcial.** Feito o que não depende de contas externas. O resto espera as contas (abaixo). |
| 1 · Base do projeto | **Entregue para aprovação** (25/11/2026). |
| 2 a 11 | Não iniciadas. |

## Fase 0 · resultados

| Prova | Resultado |
|---|---|
| 1 · Hash de senha | **Feito localmente.** PBKDF2-HMAC-SHA256 nativo do WebCrypto, 600.000 iterações, salt de 16 bytes: cerca de 90 ms por hash e 86 ms por verificação. Fica bem abaixo do limite de CPU das funções. O valor guardado descreve o algoritmo, então dá para trocar por Argon2id depois sem perder senhas (o login refaz o hash). **Falta:** repetir a medição dentro da função no Supabase (`scripts/bench-password.ts`). |
| 2 · Cookie pelo encaminhamento da Vercel | Depende das contas Vercel e Supabase. |
| 3 · PIX no sandbox do Mercado Pago | Depende da conta Mercado Pago. |
| 4 · Nominatim e CEP | Depende de rede liberada ou da função publicada. |
| 5 · Turnstile | Depende da conta Cloudflare. |
| 6 · Agendador no plano gratuito | Depende do projeto Supabase. |

### Contas que o dono do projeto precisa criar

Crie e guarde as credenciais você mesmo. **Não envie chaves por chat ou e-mail**: elas vão direto para as variáveis de ambiente (`supabase secrets set` e painel da Vercel).

1. **GitHub:** repositório privado para este código.
2. **Supabase:** um projeto para a demonstração (região São Paulo, se disponível). Anote o *Project ref*.
3. **Vercel:** projeto ligado ao repositório. Troque `PROJECT_REF` no `vercel.json`.
4. **Mercado Pago (desenvolvedores):** uma aplicação e as **credenciais de teste**.
5. **Cloudflare:** um widget do **Turnstile** para o endereço da demonstração.

## Fase 1 · o que foi entregue

- **Repositório:** estrutura do ARCHITECTURE.md, TypeScript estrito, Vite, Vitest, Tailwind 4 com as cores ligadas ao tema, ESLint (bloqueia `dangerouslySetInnerHTML` e `console` direto no servidor), Prettier, CI no GitHub Actions, `vercel.json` com encaminhamento `/api` e cabeçalhos de segurança (CSP inicial), `supabase/config.toml` com o Supabase Auth desligado.
- **Regras do domínio** (`supabase/functions/_shared/domain`), usadas pelo site e pelo servidor: dinheiro em centavos, preço da pizza (Broto 1 sabor, Grande até 3, sabor mais caro, promoção só em pizza de um sabor, borda e adicionais), entrega (Haversine, faixas, frete grátis, mínimo, validação das faixas), horários (aberto/fechado no fuso de São Paulo, horário que passa da meia-noite), status do pedido (transições, quem pode cada mudança, próximo passo do ADM, linha do tempo do cliente), tema (5 paletas, Personalizada com a mesma regra do protótipo, contraste WCAG) e esquemas de entrada (zod).
- **Banco** (`supabase/migrations`): as 23 tabelas do DATABASE.md, RLS ligada em todas, nenhuma política, nenhum privilégio para `anon` e `authenticated` (inclusive em tabelas criadas no futuro), restrições de valores e o bucket de imagens. Seed de demonstração com o cardápio, os preços, os horários e as paletas do protótipo; pode ser rodado de novo (é a base do "Restaurar dados de demonstração").
- **Função `api`:** roteador sem dependências, erro padrão `{ error: { code, message, requestId } }`, ID de correlação em toda resposta, cabeçalhos de segurança, log sem dados pessoais (registra o padrão da rota e não o caminho; não registra a mensagem do erro, que pode repetir o valor enviado), leitura de corpo com limite de tamanho. Rotas: `GET /api/health`, `/api/store`, `/api/menu`, `/api/privacy-policy`.
- **Login (parte da Fase 0):** hash de senha, política de senha, tokens aleatórios de 256 bits e SHA-256 para guardar só o hash da sessão.
- **Site:** entrada React com React Query e rotas; `/admin` em pacote separado; página provisória que lê `/api/store` e aplica o tema. A página única aprovada entra na Fase 2.

### Verificação feita (25/11/2026)

| Verificação | Resultado |
|---|---|
| Testes unitários e de integração (Bun, compatível com Vitest) | **100 de 100 passando** |
| Banco do zero: migrações, seed duas vezes, verificações (`scripts/db/check.sh`) em Postgres 16 | **OK** |
| Papel público (`anon`) tentando ler, gravar e acessar tabela nova | **negado** |
| TypeScript estrito: domínio, servidor, testes e a entrada Deno | **sem erros** |
| Empacotamento do site (esbuild) e compilação do CSS (Tailwind 4) | **OK** |
| Contraste AA das 5 paletas prontas (pendência da ETAPA 2) | **todas passam**, sem avisos |

**Limitações desta verificação:** o ambiente onde o código foi escrito não tem acesso à internet, então não foi possível rodar `npm install`, o Vite, o Vitest no Node, o Deno nem o Supabase CLI. Os testes rodaram no Bun (que executa os mesmos arquivos de teste) e no Postgres 16 local. O CI do GitHub roda tudo isso no caminho oficial assim que o repositório for criado.

### Ajustes de implementação (não mudam decisões aprovadas)

- As regras compartilhadas ficam em `supabase/functions/_shared/` (e não em `src/shared/`), porque é a pasta que o Supabase empacota ao publicar a função. O site importa pelo atalho `@shared`.
- A função acessa o banco por conexão direta (`SUPABASE_DB_URL`, cliente postgres.js), o que permite transações de verdade. A chave de serviço fica só para o Storage.
- Sessões com dois prazos (`idle_expires_at` e `absolute_expires_at`) e pedidos com `idempotency_key` contra pedido duplicado.
- Hash de senha: PBKDF2-SHA256 (alternativa já prevista no SECURITY.md), com troca para Argon2id possível depois.

### Pontos a confirmar

1. **Pizza com sabores salgado e doce juntos** (ex.: metade calabresa, metade chocolate): hoje o servidor aceita e cobra o mais caro; o site vai separar os fluxos (meio a meio salgado e meio a meio doce). Bloquear a mistura também no servidor?
2. Os 4 pontos assumidos nos documentos (promoção só em pizza de um sabor, borda e adicionais com preço único, faturamento só de pedidos válidos, ADM com aparência fixa) foram implementados assim.

## Modo vitrine (25/11/2026)

Pedido do dono: mostrar o sistema funcionando para clientes **antes** de criar as contas externas.

- **O que é:** o site e o painel completos rodando no próprio navegador, com os dados de demonstração. Publicado como página privada no Claude (o dono compartilha quando quiser).
- **Como funciona:** as telas falam com um "servidor" por uma interface única (`src/lib/backend.ts`). Na vitrine, quem responde é `src/demo/localBackend.ts`, que usa **as mesmas regras do servidor real** (`_shared/domain`: preço, entrega, horário, status, tema) e guarda os dados só naquele navegador. Quando as contas existirem, entra a implementação que fala com a função `api`, sem mudar as telas.
- **Simulado na vitrine:** distância pelo CEP (CEP terminado em 9 fica fora da área), consulta de CEP, PIX (QR sem valor e botão "Simular pagamento aprovado"), login do dono (já preenchido), impressão da comanda (o visualizador do Claude bloqueia a impressão), envio ao bot.
- **Funciona de verdade:** cardápio, promoções, montagem com até 3 sabores (preço do mais caro), borda, adicionais, retirar ingredientes, carrinho lembrado, checkout com taxa por faixa e frete grátis, pedido mínimo, acompanhamento que se atualiza sozinho, painel com pedidos a cada 5 s, som e aviso, próximo passo, cancelar, reembolso, marcar como pago, comanda, início com resumo, preços, pausar, promoções, horários, faixas, tempos, apagar dados de cliente, paletas com checagem de contraste aplicadas ao site na hora, e "Restaurar dados de demonstração".
- **Como apresentar:** abra a página em duas abas do mesmo navegador: uma no site e outra no painel (`#admin`, ou "Área do dono" no rodapé). Faça um pedido numa e avance o status na outra. Na loja, "Funcionamento na demonstração" fica em "Sempre aberta" para apresentar a qualquer hora.
- **Limites:** cada navegador tem os próprios dados (um pedido feito no celular não aparece no computador). Se o navegador bloquear o armazenamento, a vitrine funciona, mas recomeça ao recarregar.
- **Testado** no Chrome (celular 390 px e desktop 1366 px): pedido completo com PIX simulado, painel avançando o status em outra aba, cliente vendo a mudança, troca de paleta, pausa de sabor, endereço fora da área. Nenhum erro no console.
- **Gerar de novo:** `npm run build:vitrine` (pasta `dist-vitrine/`).

**Ajustes pedidos pelo dono (25/11/2026, 20h):**
1. Fotos nos quatro cartões de "Monte sua pizza".
2. Painel com barra lateral (Operação: Pedidos e Início; Configurações: Cardápio, Promoções, Loja e Aparência). No celular continua a barra de baixo.
3. Cardápio no painel: cadastrar, editar e remover sabores (com foto, ingredientes, preço Broto e Grande, disponível ou pausado), bordas, adicionais e bebidas (com foto). A foto enviada é recortada quadrada e reduzida no navegador (na versão instalada, vai para o Storage pelo servidor).
4. Aba Promoções: criar, editar, ativar e remover promoções com um sabor já cadastrado ou cadastrando um sabor novo na hora, com foto própria da promoção (sem foto, usa a do sabor).
5. Caixa de aceite dos termos ao abrir o site, com resumo e a política completa. Fica lembrada no aparelho e volta a aparecer se a versão da política mudar. **Isto ajusta a ETAPA 10**, que previa "sem banner". A caixa de aceite do checkout continua.

**Mudança técnica para aprovar:** as bibliotecas React Router, TanStack Query e React Hook Form saíram das dependências. No lugar delas há um roteador por `#nome`, um carregador de dados com atualização periódica e formulários controlados com zod, todos pequenos e no próprio código. O motivo é que neste ambiente não é possível instalar pacotes, e essas versões cobrem o que o sistema precisa. Dá para voltar às bibliotecas depois sem mudar as telas.

## Próximo passo

Com a Fase 1 aprovada: **Fase 2 (site público e cardápio)**, que segue o protótipo do Design. A Fase 0 termina quando as contas acima existirem.
