-- Verificações do banco depois das migrações e do seed (TEST_PLAN §6 X-11 e restrições).
-- Cada falha interrompe com uma mensagem clara. Rodar com: psql -v ON_ERROR_STOP=1 -f tests/db/checks.sql
\set ON_ERROR_STOP on

do $$
declare
  r record;
  n integer;
begin
  -- 1) RLS ligada em todas as tabelas e nenhum privilégio para anon/authenticated (X-11).
  for r in
    select c.oid::regclass as tbl, c.relname, c.relrowsecurity
    from pg_class c join pg_namespace s on s.oid = c.relnamespace
    where s.nspname = 'public' and c.relkind = 'r'
  loop
    if not r.relrowsecurity then
      raise exception 'RLS desligada na tabela %', r.relname;
    end if;
    if has_table_privilege('anon', r.tbl, 'select, insert, update, delete')
       or has_table_privilege('authenticated', r.tbl, 'select, insert, update, delete') then
      raise exception 'anon/authenticated têm acesso à tabela %', r.relname;
    end if;
  end loop;

  select count(*) into n from pg_policies where schemaname = 'public';
  if n > 0 then raise exception 'Existem % políticas RLS; o desenho pede nenhuma', n; end if;

  select count(*) into n from pg_class c join pg_namespace s on s.oid = c.relnamespace
  where s.nspname = 'public' and c.relkind = 'r';
  if n <> 23 then raise exception 'Esperava 23 tabelas, encontrei %', n; end if;

  -- 2) Seed de demonstração.
  if (select count(*) from sizes where active) <> 2 then raise exception 'Seed: esperava 2 tamanhos'; end if;
  if (select count(*) from flavors where active) <> 6 then raise exception 'Seed: esperava 6 sabores'; end if;
  if (select count(*) from flavor_prices) <> 12 then raise exception 'Seed: esperava 12 preços'; end if;
  if (select count(*) from promotions where active) <> 5 then raise exception 'Seed: esperava 5 promoções'; end if;
  if (select count(*) from opening_hours where not closed) <> 7 then raise exception 'Seed: esperava 7 dias abertos'; end if;
  if (select max(to_km) from delivery_fee_bands) <> (select delivery_radius_km from store_settings) then
    raise exception 'Seed: a última faixa deve terminar no raio';
  end if;
  if not (select is_demo from store_settings) then raise exception 'Seed: is_demo deveria ser true'; end if;
  if (select count(*) from orders) <> 0 then raise exception 'Seed não deve criar pedidos'; end if;
  if (select count(*) from owner) <> 0 then raise exception 'Seed não deve criar o dono'; end if;

  -- 3) Restrições recusam dados inválidos.
  begin
    update flavor_prices set price_cents = -1 where true;
    raise exception 'Aceitou preço negativo';
  exception when check_violation then null;
  end;

  begin
    insert into store_settings (id, name) values (true, 'Outra loja');
    raise exception 'Aceitou segunda linha de configuração';
  exception when unique_violation then null;
  end;

  begin
    insert into promotions (flavor_id, size_id, kind, percent, price_cents)
    values ('00000000-0000-4000-8000-000000000303', '00000000-0000-4000-8000-000000000202', 'percent', 150, null);
    raise exception 'Aceitou promoção de 150%%';
  exception when check_violation then null;
  end;

  begin
    insert into promotions (flavor_id, size_id, kind, percent, price_cents)
    values ('00000000-0000-4000-8000-000000000301', '00000000-0000-4000-8000-000000000202', 'manual', null, 3000);
    raise exception 'Aceitou duas promoções ativas para o mesmo sabor e tamanho';
  exception when unique_violation then null;
  end;

  begin
    insert into owner (email, password_hash) values ('Dono@Exemplo.com', 'x');
    raise exception 'Aceitou e-mail com maiúsculas';
  exception when check_violation then null;
  end;

  begin
    insert into orders (tracking_token_hash, idempotency_key, status, fulfillment, customer_name, customer_phone,
      subtotal_cents, delivery_fee_cents, total_cents, payment_method, payment_status, consent_at,
      consent_text_version, consent_whatsapp, address)
    values (repeat('a', 64), gen_random_uuid(), 'received', 'delivery', 'Teste', '11987654321',
      5000, 500, 9999, 'cash', 'due_on_delivery', now(), 1, true, '{}'::jsonb);
    raise exception 'Aceitou total diferente de subtotal + taxa';
  exception when check_violation then null;
  end;

  begin
    insert into orders (tracking_token_hash, idempotency_key, status, fulfillment, customer_name, customer_phone,
      subtotal_cents, delivery_fee_cents, total_cents, payment_method, payment_status, consent_at,
      consent_text_version, consent_whatsapp)
    values (repeat('b', 64), gen_random_uuid(), 'received', 'delivery', 'Teste', '11987654321',
      5000, 500, 5500, 'cash', 'due_on_delivery', now(), 1, true);
    raise exception 'Aceitou entrega sem endereço';
  exception when check_violation then null;
  end;

  begin
    insert into orders (tracking_token_hash, idempotency_key, status, fulfillment, customer_name, customer_phone,
      subtotal_cents, delivery_fee_cents, total_cents, payment_method, payment_status, consent_at,
      consent_text_version, consent_whatsapp, cash_change_for_cents)
    values (repeat('c', 64), gen_random_uuid(), 'received', 'pickup', 'Teste', '11987654321',
      5000, 0, 5000, 'pix', 'pending', now(), 1, true, 10000);
    raise exception 'Aceitou troco em pagamento PIX';
  exception when check_violation then null;
  end;

  -- 4) Um pedido válido entra, com item e evento, e some em cascata.
  with o as (
    insert into orders (tracking_token_hash, idempotency_key, status, fulfillment, customer_name, customer_phone,
      subtotal_cents, delivery_fee_cents, total_cents, payment_method, payment_status, consent_at,
      consent_text_version, consent_whatsapp, cash_change_for_cents)
    values (repeat('d', 64), gen_random_uuid(), 'received', 'pickup', 'Teste', '11987654321',
      5490, 0, 5490, 'cash', 'due_on_delivery', now(), 1, true, 10000)
    returning id
  ), i as (
    insert into order_items (order_id, position, kind, size_name, slices, flavors, quantity,
      list_unit_price_cents, unit_price_cents, total_cents)
    select id, 0, 'pizza', 'Grande', 8, '[{"id":"x","name":"Calabresa"}]', 1, 5490, 5490, 5490 from o
    returning order_id
  )
  insert into order_status_events (order_id, from_status, to_status, actor)
  select order_id, null, 'received', 'customer' from i;

  if (select count(*) from orders) <> 1 then raise exception 'Pedido válido não entrou'; end if;
  if (select number from orders limit 1) < 1 then raise exception 'Número do pedido inválido'; end if;
  delete from orders;
  if (select count(*) from order_items) + (select count(*) from order_status_events) <> 0 then
    raise exception 'Apagar o pedido não apagou itens e eventos';
  end if;

  raise notice 'OK: % tabelas com RLS, sem acesso público, seed e restrições conferidos.', 23;
end
$$;
