#!/usr/bin/env bash
# Aplica as migrações e o seed num Postgres vazio e roda as verificações do banco.
# Uso: DATABASE_URL=postgres://usuario:senha@localhost:5432/banco_de_teste bash scripts/db/check.sh
# ATENÇÃO: use um banco de TESTE vazio. O seed apaga pedidos e cardápio.
set -euo pipefail

: "${DATABASE_URL:?Defina DATABASE_URL apontando para um banco de teste vazio}"
cd "$(dirname "$0")/../.."

run() { psql "$DATABASE_URL" -X -q -v ON_ERROR_STOP=1 "$@"; }

echo "→ papéis do Supabase (só em Postgres puro)"
run -f scripts/db/supabase-roles-stub.sql

echo "→ migrações"
for f in supabase/migrations/*.sql; do
  echo "   $f"
  run -f "$f"
done

echo "→ seed de demonstração (duas vezes, para provar que pode repetir)"
run -f supabase/seed/demo.sql
run -f supabase/seed/demo.sql

echo "→ verificações"
run -f tests/db/checks.sql

echo "→ seed de novo (as verificações apagam o pedido de teste)"
run -f supabase/seed/demo.sql
echo "✓ banco conferido"
