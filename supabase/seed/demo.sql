-- Forno Bella Pizzeria · dados de DEMONSTRAÇÃO
-- Cardápio, horários e configurações de exemplo. Não cria pedidos nem o dono.
-- Pode ser rodado de novo: é a base do botão "Restaurar dados de demonstração".
-- Preços em centavos. Endereço e coordenadas são de exemplo (centro de São Paulo).

begin;

-- Pedidos de teste e tudo que depende deles somem (pagamentos, eventos, entregas ao bot).
delete from orders;
delete from webhook_events_in;
delete from geocode_cache;

-- Cardápio volta ao estado inicial.
delete from promotions;
delete from flavor_prices;
delete from flavors;
delete from products;
delete from crusts;
delete from addons;
delete from categories;
delete from sizes;
delete from delivery_fee_bands;

update store_settings set
  name = 'Forno Bella Pizzeria',
  logo_url = '/brand/logo.png',
  story_text = 'Nascemos da paixão pela pizza napolitana feita sem pressa: massa de fermentação lenta, molho de tomate de verdade e o calor do forno a lenha. Cada pizza sai do forno do jeito que a nonna ensinou. Buon appetito!',
  phone = null,
  whatsapp = null,
  social = '{}'::jsonb,
  address_text = 'Rua de Exemplo, 123 · Centro · São Paulo/SP',
  lat = -23.550520,
  lng = -46.633308,
  delivery_radius_km = 8,
  min_order_cents = null,
  free_shipping_above_cents = 12000,
  est_delivery_min = 40, est_delivery_max = 60,
  est_pickup_min = 20, est_pickup_max = 30,
  pix_expiry_minutes = 15,
  bot_webhook_url = null,
  bot_webhook_secret_enc = null,
  theme = '{"preset": "forno-a-lenha"}'::jsonb,
  consent_text = 'Concordo com o uso dos meus dados (nome, telefone e endereço) para preparar e entregar este pedido, conforme a Política de privacidade, e aceito receber atualizações do pedido pelo WhatsApp.',
  consent_text_version = 1,
  privacy_policy_version = 1,
  privacy_policy_text = $policy$
MODELO DE POLÍTICA DE PRIVACIDADE · PRECISA DE REVISÃO JURÍDICA ANTES DE USO REAL

1. Quem somos
[Nome da pizzaria], [CNPJ], [endereço], é a responsável (controladora) pelos dados pessoais tratados neste site.

2. Quais dados coletamos e para quê
- Nome, telefone e endereço: para preparar, entregar e falar com você sobre o pedido.
- Telefone e aceite de mensagens: para enviar atualizações do pedido pelo WhatsApp.
- Dados do pagamento PIX (identificador, situação e valor): para confirmar e, se preciso, devolver o pagamento. Não recebemos nem guardamos dados de cartão.
- Dados técnicos (endereço IP e informações do navegador): para segurança e para evitar abuso, guardados de forma cifrada e por pouco tempo.

3. Com quem compartilhamos
Usamos serviços de terceiros para o site funcionar: hospedagem (Vercel e Supabase), pagamento (Mercado Pago), proteção contra robôs (Cloudflare Turnstile), conversão do endereço em localização (OpenStreetMap/Nominatim) e consulta de CEP. Se houver atendimento por WhatsApp, o seu nome e telefone também vão para esse serviço. Alguns desses serviços podem tratar dados fora do Brasil.

4. Por quanto tempo guardamos
[Defina o prazo. Hoje os dados dos pedidos ficam guardados sem prazo automático; você pode pedir a exclusão a qualquer momento.]

5. Seus direitos
Você pode pedir confirmação, acesso, correção, exclusão ou anonimização dos seus dados pelo contato: [e-mail ou telefone]. Responderemos nos prazos da LGPD.

6. Cookies e armazenamento no aparelho
Não usamos cookies de análise nem de publicidade. O carrinho fica guardado no seu próprio aparelho, e o painel do dono usa um cookie de sessão necessário para funcionar.

Última atualização: [data].
$policy$,
  is_demo = true,
  timezone = 'America/Sao_Paulo';

-- Horários de exemplo: seg–qui 18h–23h, sex e sáb 18h–00h, dom 17h–23h.
update opening_hours set opens = '17:00', closes = '23:00', closed = false where weekday = 0;
update opening_hours set opens = '18:00', closes = '23:00', closed = false where weekday between 1 and 4;
update opening_hours set opens = '18:00', closes = '00:00', closed = false where weekday in (5, 6);

-- Faixas de taxa: até 3 km R$ 5, até 6 km R$ 8, até 8 km R$ 12 (raio de 8 km).
insert into delivery_fee_bands (from_km, to_km, fee_cents) values
  (0, 3, 500),
  (3, 6, 800),
  (6, 8, 1200);

insert into sizes (id, name, slices, max_flavors, sort) values
  ('00000000-0000-4000-8000-000000000201', 'Broto', 4, 1, 1),
  ('00000000-0000-4000-8000-000000000202', 'Grande', 8, 3, 2);

insert into categories (id, name, kind, sort) values
  ('00000000-0000-4000-8000-000000000101', 'Pizzas salgadas', 'pizza_salgada', 1),
  ('00000000-0000-4000-8000-000000000102', 'Pizzas doces', 'pizza_doce', 2),
  ('00000000-0000-4000-8000-000000000103', 'Bebidas', 'drink', 3);

insert into flavors (id, category_id, name, description, ingredients, photo_url, sort) values
  ('00000000-0000-4000-8000-000000000301', '00000000-0000-4000-8000-000000000101', 'Margherita',
   'Molho de tomate, muçarela e manjericão.', array['molho de tomate', 'muçarela', 'manjericão'], '/demo/pizza-salgada.webp', 1),
  ('00000000-0000-4000-8000-000000000302', '00000000-0000-4000-8000-000000000101', 'Pepperoni',
   'Pepperoni, muçarela e orégano.', array['pepperoni', 'muçarela', 'orégano'], '/demo/pizza-pepperoni.webp', 2),
  ('00000000-0000-4000-8000-000000000303', '00000000-0000-4000-8000-000000000101', 'Calabresa',
   'Calabresa fatiada, cebola e muçarela.', array['calabresa', 'cebola', 'muçarela'], '/demo/pizza-salgada.webp', 3),
  ('00000000-0000-4000-8000-000000000304', '00000000-0000-4000-8000-000000000101', 'Quatro Queijos',
   'Muçarela, provolone, gorgonzola e parmesão.', array['muçarela', 'provolone', 'gorgonzola', 'parmesão'], '/demo/pizza-salgada.webp', 4),
  ('00000000-0000-4000-8000-000000000305', '00000000-0000-4000-8000-000000000102', 'Chocolate com Morango',
   'Creme de chocolate e morangos frescos.', array['creme de chocolate', 'morango'], '/demo/pizza-doce.webp', 1),
  ('00000000-0000-4000-8000-000000000306', '00000000-0000-4000-8000-000000000102', 'Banana com Canela',
   'Banana, canela e açúcar.', array['banana', 'canela', 'açúcar'], '/demo/pizza-doce.webp', 2);

-- Preços (Broto, Grande) iguais aos do protótipo.
insert into flavor_prices (flavor_id, size_id, price_cents)
select f.id, s.id, p.price
from (values
  ('00000000-0000-4000-8000-000000000301'::uuid, 3290, 5290),
  ('00000000-0000-4000-8000-000000000302'::uuid, 3690, 5690),
  ('00000000-0000-4000-8000-000000000303'::uuid, 3490, 5490),
  ('00000000-0000-4000-8000-000000000304'::uuid, 3890, 5890),
  ('00000000-0000-4000-8000-000000000305'::uuid, 2990, 4990),
  ('00000000-0000-4000-8000-000000000306'::uuid, 2790, 4790)
) as v (flavor, broto, grande)
join flavors f on f.id = v.flavor
cross join lateral (values
  ('00000000-0000-4000-8000-000000000201'::uuid, v.broto),
  ('00000000-0000-4000-8000-000000000202'::uuid, v.grande)
) as p (size, price)
join sizes s on s.id = p.size;

-- Promoções da Galeria 1 (pizza Grande de um sabor).
insert into promotions (flavor_id, size_id, kind, percent, price_cents, sort) values
  ('00000000-0000-4000-8000-000000000301', '00000000-0000-4000-8000-000000000202', 'manual', null, 4490, 1),
  ('00000000-0000-4000-8000-000000000302', '00000000-0000-4000-8000-000000000202', 'manual', null, 4790, 2),
  ('00000000-0000-4000-8000-000000000305', '00000000-0000-4000-8000-000000000202', 'manual', null, 4190, 3),
  ('00000000-0000-4000-8000-000000000304', '00000000-0000-4000-8000-000000000202', 'manual', null, 4990, 4),
  ('00000000-0000-4000-8000-000000000306', '00000000-0000-4000-8000-000000000202', 'percent', 20, null, 5);

insert into crusts (id, name, price_cents, sort) values
  ('00000000-0000-4000-8000-000000000401', 'Catupiry', 990, 1),
  ('00000000-0000-4000-8000-000000000402', 'Cheddar', 990, 2),
  ('00000000-0000-4000-8000-000000000403', 'Chocolate', 1190, 3);

insert into addons (id, name, price_cents, sort) values
  ('00000000-0000-4000-8000-000000000501', 'Bacon', 600, 1),
  ('00000000-0000-4000-8000-000000000502', 'Azeitonas', 400, 2),
  ('00000000-0000-4000-8000-000000000503', 'Cebola caramelizada', 500, 3),
  ('00000000-0000-4000-8000-000000000504', 'Muçarela extra', 700, 4);

insert into products (id, category_id, name, description, price_cents, photo_url, sort) values
  ('00000000-0000-4000-8000-000000000601', '00000000-0000-4000-8000-000000000103', 'Refrigerante lata 350 ml',
   'Vários sabores. Consulte na entrega.', 800, '/demo/bebida-generica.webp', 1),
  ('00000000-0000-4000-8000-000000000602', '00000000-0000-4000-8000-000000000103', 'Água mineral 500 ml',
   'Com ou sem gás.', 500, '/demo/bebida-generica.webp', 2),
  ('00000000-0000-4000-8000-000000000603', '00000000-0000-4000-8000-000000000103', 'Suco natural 500 ml',
   'Laranja ou limão, feito na hora.', 1200, '/demo/bebida-generica.webp', 3);

insert into audit_log (action, entity, details) values ('demo.seed', 'store', '{"origem": "seed/demo.sql"}');

commit;
