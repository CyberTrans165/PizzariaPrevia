-- Forno Bella Pizzeria · migração 0002 · armazenamento de imagens
-- Bucket público de LEITURA para fotos e logo. A escrita é feita só pela função `api`
-- (chave de serviço), depois de conferir tipo, tamanho e sessão do dono.
-- Em Postgres sem Supabase (testes locais), o schema storage não existe e nada é feito.
do $$
begin
  if exists (select 1 from pg_namespace where nspname = 'storage')
     and exists (select 1 from pg_tables where schemaname = 'storage' and tablename = 'buckets') then
    insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    values ('images', 'images', true, 2097152, array['image/jpeg', 'image/png', 'image/webp'])
    on conflict (id) do nothing;
  end if;
end
$$;
