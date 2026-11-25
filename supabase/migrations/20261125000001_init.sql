-- Forno Bella Pizzeria · migração 0001 · estrutura inicial (DATABASE.md)
-- Regras gerais:
--   * dinheiro em centavos (integer);
--   * RLS ligada em todas as tabelas e NENHUMA política: só a função `api` (dona das tabelas) acessa;
--   * anon e authenticated sem nenhum privilégio no schema public.

-- ---------------------------------------------------------------------------
-- Tipos
-- ---------------------------------------------------------------------------
create type category_kind as enum ('pizza_salgada', 'pizza_doce', 'drink', 'other');
create type promo_kind as enum ('percent', 'manual');
create type order_status as enum (
  'awaiting_payment', 'received', 'confirmed', 'preparing',
  'out_for_delivery', 'ready_for_pickup', 'delivered', 'cancelled', 'expired'
);
create type fulfillment_type as enum ('delivery', 'pickup');
create type payment_method as enum ('pix', 'cash', 'card_on_delivery');
create type payment_status as enum (
  'pending', 'paid', 'expired', 'due_on_delivery', 'refunded', 'partially_refunded'
);
create type actor_kind as enum ('owner', 'system', 'gateway', 'customer');
create type order_item_kind as enum ('pizza', 'product');
create type bot_delivery_state as enum ('pending', 'sent', 'failed');

create function set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end
$$;

-- ---------------------------------------------------------------------------
-- Acesso do dono (login próprio, ETAPA 10)
-- ---------------------------------------------------------------------------
create table owner (
  id uuid primary key default gen_random_uuid(),
  singleton boolean not null default true unique check (singleton),
  email text not null unique check (email = lower(email) and position('@' in email) > 1),
  password_hash text not null,
  totp_secret_enc text,
  totp_enabled boolean not null default false,
  recovery_codes_hash text[],
  password_changed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on table owner is 'Único usuário do ADM. Só o hash da senha; TOTP criptografado com APP_SECRET_KEY.';

create table sessions (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references owner (id) on delete cascade,
  token_hash text not null unique check (length(token_hash) = 64),
  csrf_token_hash text not null check (length(csrf_token_hash) = 64),
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  idle_expires_at timestamptz not null,
  absolute_expires_at timestamptz not null,
  user_agent text check (length(user_agent) <= 200),
  check (idle_expires_at <= absolute_expires_at)
);
comment on table sessions is 'Sessões do ADM. O ID puro só existe no cookie; aqui fica o SHA-256 dele.';
create index sessions_absolute_expiry_idx on sessions (absolute_expires_at);

create table rate_limits (
  key text not null check (length(key) <= 200),
  window_start timestamptz not null,
  count integer not null default 0 check (count >= 0),
  primary key (key, window_start)
);
comment on table rate_limits is 'Contadores de limite de uso. A chave usa hash, nunca e-mail, telefone ou IP puros.';
create index rate_limits_window_idx on rate_limits (window_start);

-- ---------------------------------------------------------------------------
-- Loja
-- ---------------------------------------------------------------------------
create table store_settings (
  id boolean primary key default true check (id),
  name text not null check (length(name) between 1 and 80),
  logo_url text,
  story_text text not null default '' check (length(story_text) <= 4000),
  phone text check (length(phone) <= 20),
  whatsapp text check (whatsapp ~ '^[0-9]{12,13}$'),
  social jsonb not null default '{}'::jsonb,
  address_text text not null default '' check (length(address_text) <= 200),
  lat numeric(9, 6) check (lat between -90 and 90),
  lng numeric(9, 6) check (lng between -180 and 180),
  delivery_radius_km numeric(5, 2) not null default 5 check (delivery_radius_km > 0 and delivery_radius_km <= 50),
  min_order_cents integer check (min_order_cents > 0),
  free_shipping_above_cents integer check (free_shipping_above_cents > 0),
  est_delivery_min smallint not null default 40,
  est_delivery_max smallint not null default 60,
  est_pickup_min smallint not null default 20,
  est_pickup_max smallint not null default 30,
  pix_expiry_minutes smallint not null default 15 check (pix_expiry_minutes between 5 and 60),
  bot_webhook_url text check (bot_webhook_url like 'https://%' and length(bot_webhook_url) <= 500),
  bot_webhook_secret_enc text,
  theme jsonb not null default '{"preset": "forno-a-lenha"}'::jsonb,
  privacy_policy_text text not null default '',
  privacy_policy_version integer not null default 1 check (privacy_policy_version > 0),
  consent_text text not null default '',
  consent_text_version integer not null default 1 check (consent_text_version > 0),
  is_demo boolean not null default false,
  timezone text not null default 'America/Sao_Paulo',
  updated_at timestamptz not null default now(),
  check (est_delivery_min > 0 and est_delivery_min <= est_delivery_max),
  check (est_pickup_min > 0 and est_pickup_min <= est_pickup_max)
);
comment on table store_settings is 'Configuração da loja (uma linha só).';
insert into store_settings (name) values ('Minha Pizzaria');

create table opening_hours (
  weekday smallint primary key check (weekday between 0 and 6),
  opens time not null default '18:00',
  closes time not null default '23:00',
  closed boolean not null default true
);
comment on column opening_hours.weekday is '0 = domingo … 6 = sábado. Se closes <= opens, o período passa da meia-noite.';
insert into opening_hours (weekday) select d from generate_series(0, 6) as d;

create table delivery_fee_bands (
  id uuid primary key default gen_random_uuid(),
  from_km numeric(5, 2) not null check (from_km >= 0),
  to_km numeric(5, 2) not null,
  fee_cents integer not null check (fee_cents >= 0),
  check (from_km < to_km)
);

-- ---------------------------------------------------------------------------
-- Cardápio
-- ---------------------------------------------------------------------------
create table categories (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(name) between 1 and 60),
  kind category_kind not null,
  sort integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table sizes (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(name) between 1 and 30),
  slices smallint not null check (slices between 1 and 24),
  max_flavors smallint not null check (max_flavors between 1 and 4),
  sort integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table flavors (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references categories (id),
  name text not null check (length(name) between 1 and 60),
  description text not null default '' check (length(description) <= 300),
  ingredients text[] not null default '{}' check (cardinality(ingredients) <= 20),
  photo_url text,
  paused boolean not null default false,
  active boolean not null default true,
  sort integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index flavors_category_idx on flavors (category_id, sort);

create table flavor_prices (
  flavor_id uuid not null references flavors (id) on delete cascade,
  size_id uuid not null references sizes (id) on delete cascade,
  price_cents integer not null check (price_cents > 0),
  primary key (flavor_id, size_id)
);

create table promotions (
  id uuid primary key default gen_random_uuid(),
  flavor_id uuid not null references flavors (id) on delete cascade,
  size_id uuid not null references sizes (id) on delete cascade,
  kind promo_kind not null,
  percent numeric(5, 2),
  price_cents integer,
  active boolean not null default true,
  sort integer not null default 0,
  created_at timestamptz not null default now(),
  check (
    (kind = 'percent' and percent > 0 and percent < 100 and price_cents is null)
    or (kind = 'manual' and price_cents > 0 and percent is null)
  )
);
create unique index promotions_one_active_idx on promotions (flavor_id, size_id) where active;

create table crusts (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(name) between 1 and 60),
  price_cents integer not null check (price_cents >= 0),
  paused boolean not null default false,
  active boolean not null default true,
  sort integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table addons (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(name) between 1 and 60),
  price_cents integer not null check (price_cents >= 0),
  paused boolean not null default false,
  active boolean not null default true,
  sort integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table products (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references categories (id),
  name text not null check (length(name) between 1 and 60),
  description text not null default '' check (length(description) <= 300),
  price_cents integer not null check (price_cents > 0),
  photo_url text,
  paused boolean not null default false,
  active boolean not null default true,
  sort integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index products_category_idx on products (category_id, sort);

-- ---------------------------------------------------------------------------
-- Pedidos
-- ---------------------------------------------------------------------------
create table orders (
  id uuid primary key default gen_random_uuid(),
  number integer generated always as identity unique,
  tracking_token_hash text not null unique check (length(tracking_token_hash) = 64),
  idempotency_key uuid not null unique,
  status order_status not null,
  fulfillment fulfillment_type not null,
  customer_name text not null check (length(customer_name) between 1 and 80),
  customer_phone text not null check (customer_phone ~ '^[0-9]{10,11}$' or customer_phone = ''),
  address jsonb,
  lat numeric(9, 6),
  lng numeric(9, 6),
  distance_km numeric(6, 2) check (distance_km >= 0),
  subtotal_cents integer not null check (subtotal_cents >= 0),
  delivery_fee_cents integer not null default 0 check (delivery_fee_cents >= 0),
  total_cents integer not null,
  notes text not null default '' check (length(notes) <= 500),
  payment_method payment_method not null,
  cash_change_for_cents integer,
  payment_status payment_status not null,
  consent_at timestamptz not null,
  consent_text_version integer not null,
  consent_whatsapp boolean not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  confirmed_at timestamptz,
  delivered_at timestamptz,
  cancelled_at timestamptz,
  cancel_reason text check (length(cancel_reason) <= 300),
  anonymized_at timestamptz,
  check (total_cents = subtotal_cents + delivery_fee_cents),
  check (fulfillment = 'delivery' or delivery_fee_cents = 0),
  check (fulfillment = 'pickup' or address is not null or anonymized_at is not null),
  check (cash_change_for_cents is null or (payment_method = 'cash' and cash_change_for_cents >= total_cents))
);
comment on column orders.tracking_token_hash is 'SHA-256 do token do link de acompanhamento. O token puro só existe no link do cliente.';
comment on column orders.idempotency_key is 'Gerada pelo navegador a cada tentativa de finalizar: evita pedido duplicado.';
create index orders_status_created_idx on orders (status, created_at desc);
create index orders_created_idx on orders (created_at desc);
create index orders_phone_idx on orders (customer_phone);

create table order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders (id) on delete cascade,
  position smallint not null check (position >= 0),
  kind order_item_kind not null,
  size_name text,
  slices smallint,
  flavors jsonb not null default '[]'::jsonb,
  crust jsonb,
  addons jsonb not null default '[]'::jsonb,
  product_name text,
  removed_ingredients text[] not null default '{}',
  note text not null default '' check (length(note) <= 140),
  quantity smallint not null check (quantity between 1 and 20),
  list_unit_price_cents integer not null check (list_unit_price_cents >= 0),
  unit_price_cents integer not null check (unit_price_cents >= 0),
  total_cents integer not null,
  promotion_applied boolean not null default false,
  photo_url_snapshot text,
  unique (order_id, position),
  check (total_cents = unit_price_cents * quantity),
  check (
    (kind = 'pizza' and size_name is not null and jsonb_array_length(flavors) >= 1)
    or (kind = 'product' and product_name is not null)
  )
);
comment on table order_items is 'Cópia dos dados do item no momento do pedido: mudar o cardápio não altera pedidos antigos.';

create table order_status_events (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders (id) on delete cascade,
  from_status order_status,
  to_status order_status not null,
  at timestamptz not null default now(),
  actor actor_kind not null,
  reason text check (length(reason) <= 300)
);
create index order_status_events_order_idx on order_status_events (order_id, at);

-- ---------------------------------------------------------------------------
-- Pagamentos (nunca dados de cartão)
-- ---------------------------------------------------------------------------
create table payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders (id) on delete cascade,
  provider text not null default 'mercadopago',
  provider_payment_id text unique,
  status text not null,
  amount_cents integer not null check (amount_cents > 0),
  refunded_cents integer not null default 0,
  qr_code text,
  qr_code_base64 text,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  paid_at timestamptz,
  check (refunded_cents >= 0 and refunded_cents <= amount_cents)
);
create index payments_order_idx on payments (order_id);

create table refunds (
  id uuid primary key default gen_random_uuid(),
  payment_id uuid not null references payments (id) on delete cascade,
  amount_cents integer not null check (amount_cents > 0),
  provider_refund_id text,
  created_by uuid references owner (id) on delete set null,
  created_at timestamptz not null default now(),
  reason text check (length(reason) <= 300)
);

create table webhook_events_in (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  event_id text not null,
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  result text check (length(result) <= 300),
  unique (provider, event_id)
);
comment on table webhook_events_in is 'Idempotência dos webhooks recebidos: o mesmo evento só tem efeito uma vez.';

-- ---------------------------------------------------------------------------
-- Bot de WhatsApp (webhook de saída)
-- ---------------------------------------------------------------------------
create table bot_deliveries (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders (id) on delete cascade,
  status_event_id uuid not null unique references order_status_events (id) on delete cascade,
  event_type text not null,
  payload jsonb not null,
  attempts smallint not null default 0 check (attempts >= 0),
  next_attempt_at timestamptz not null default now(),
  state bot_delivery_state not null default 'pending',
  last_error text check (length(last_error) <= 300),
  sent_at timestamptz,
  created_at timestamptz not null default now()
);
create index bot_deliveries_due_idx on bot_deliveries (next_attempt_at) where state = 'pending';

-- ---------------------------------------------------------------------------
-- Apoio
-- ---------------------------------------------------------------------------
create table audit_log (
  id bigint generated always as identity primary key,
  at timestamptz not null default now(),
  action text not null check (length(action) <= 80),
  entity text check (length(entity) <= 60),
  entity_id text check (length(entity_id) <= 80),
  details jsonb not null default '{}'::jsonb
);
comment on table audit_log is 'Ações do dono e do sistema. Nunca guardar dados pessoais em details.';
create index audit_log_at_idx on audit_log (at desc);

create table geocode_cache (
  query_hash text primary key check (length(query_hash) = 64),
  lat numeric(9, 6) not null,
  lng numeric(9, 6) not null,
  provider text not null,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- updated_at automático
-- ---------------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array[
    'owner', 'store_settings', 'categories', 'sizes', 'flavors', 'crusts', 'addons',
    'products', 'orders', 'payments'
  ] loop
    execute format(
      'create trigger %I before update on public.%I for each row execute function set_updated_at()',
      t || '_updated_at', t
    );
  end loop;
end
$$;

-- ---------------------------------------------------------------------------
-- Segurança: RLS em tudo, sem políticas, sem privilégios para anon/authenticated
-- ---------------------------------------------------------------------------
do $$
declare r record;
begin
  for r in select tablename from pg_tables where schemaname = 'public' loop
    execute format('alter table public.%I enable row level security', r.tablename);
  end loop;
end
$$;

revoke all on all tables in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;
revoke all on all functions in schema public from anon, authenticated, public;
alter default privileges in schema public revoke all on tables from anon, authenticated;
alter default privileges in schema public revoke all on sequences from anon, authenticated;
alter default privileges in schema public revoke all on functions from anon, authenticated, public;
