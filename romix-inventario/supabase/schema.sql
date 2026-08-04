create extension if not exists pgcrypto;

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text,
  description text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  barcode text not null unique,
  sku text not null unique,
  color text not null,
  size text not null,
  stock integer not null default 0,
  minimum_stock integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint product_variants_stock_non_negative check (stock >= 0),
  constraint product_variants_minimum_stock_non_negative check (minimum_stock >= 0)
);

create table if not exists public.inventory_movements (
  id bigint generated always as identity primary key,
  variant_id uuid not null references public.product_variants(id) on delete restrict,
  movement_type text not null,
  quantity integer not null,
  previous_stock integer not null,
  new_stock integer not null,
  note text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint inventory_movements_type_check check (movement_type in ('in', 'out', 'adjustment')),
  constraint inventory_movements_quantity_valid check (
    (movement_type in ('in', 'out') and quantity > 0)
    or (movement_type = 'adjustment' and quantity >= 0)
  ),
  constraint inventory_movements_stock_non_negative check (previous_stock >= 0 and new_stock >= 0)
);

alter table public.inventory_movements
  drop constraint if exists inventory_movements_quantity_positive;
alter table public.inventory_movements
  drop constraint if exists inventory_movements_quantity_valid;
alter table public.inventory_movements
  add constraint inventory_movements_quantity_valid check (
    (movement_type in ('in', 'out') and quantity > 0)
    or (movement_type = 'adjustment' and quantity >= 0)
  );

create index if not exists idx_product_variants_barcode on public.product_variants(barcode);
create index if not exists idx_product_variants_sku on public.product_variants(sku);
create index if not exists idx_product_variants_product_id on public.product_variants(product_id);
create index if not exists idx_inventory_movements_created_at on public.inventory_movements(created_at desc);
create index if not exists idx_inventory_movements_variant_id on public.inventory_movements(variant_id);
create index if not exists idx_inventory_movements_type on public.inventory_movements(movement_type);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_products_updated_at on public.products;
create trigger set_products_updated_at
before update on public.products
for each row execute function public.set_updated_at();

drop trigger if exists set_product_variants_updated_at on public.product_variants;
create trigger set_product_variants_updated_at
before update on public.product_variants
for each row execute function public.set_updated_at();

create or replace function public.adjust_inventory(
  p_barcode text,
  p_movement_type text,
  p_quantity integer,
  p_note text,
  p_user_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_variant public.product_variants%rowtype;
  v_product public.products%rowtype;
  v_previous_stock integer;
  v_new_stock integer;
begin
  if p_barcode is null or btrim(p_barcode) = '' then
    raise exception 'barcode_required' using errcode = '22023';
  end if;

  if p_movement_type not in ('in', 'out', 'adjustment') then
    raise exception 'invalid_movement_type' using errcode = '22023';
  end if;

  if p_quantity is null
     or (p_movement_type in ('in', 'out') and p_quantity <= 0)
     or (p_movement_type = 'adjustment' and p_quantity < 0) then
    raise exception 'invalid_quantity' using errcode = '22023';
  end if;

  if p_user_id is null then
    raise exception 'user_required' using errcode = '28000';
  end if;

  select *
    into v_variant
    from public.product_variants
   where barcode = btrim(p_barcode)
   for update;

  if not found then
    raise exception 'barcode_not_found' using errcode = 'P0002';
  end if;

  select *
    into v_product
    from public.products
   where id = v_variant.product_id;

  if not found then
    raise exception 'product_not_found' using errcode = 'P0002';
  end if;

  if v_product.active is not true then
    raise exception 'product_inactive' using errcode = '22023';
  end if;

  if v_variant.active is not true then
    raise exception 'variant_inactive' using errcode = '22023';
  end if;

  v_previous_stock := v_variant.stock;

  if p_movement_type = 'in' then
    v_new_stock := v_previous_stock + p_quantity;
  elsif p_movement_type = 'out' then
    v_new_stock := v_previous_stock - p_quantity;
  else
    v_new_stock := p_quantity;
  end if;

  if v_new_stock < 0 then
    raise exception 'insufficient_stock' using errcode = '23514';
  end if;

  update public.product_variants
     set stock = v_new_stock
   where id = v_variant.id;

  insert into public.inventory_movements (
    variant_id,
    movement_type,
    quantity,
    previous_stock,
    new_stock,
    note,
    created_by
  )
  values (
    v_variant.id,
    p_movement_type,
    p_quantity,
    v_previous_stock,
    v_new_stock,
    nullif(btrim(coalesce(p_note, '')), ''),
    p_user_id
  );

  return jsonb_build_object(
    'success', true,
    'product', jsonb_build_object(
      'id', v_product.id,
      'name', v_product.name,
      'category', v_product.category,
      'variantId', v_variant.id,
      'barcode', v_variant.barcode,
      'sku', v_variant.sku,
      'color', v_variant.color,
      'size', v_variant.size
    ),
    'previousStock', v_previous_stock,
    'newStock', v_new_stock
  );
end;
$$;

revoke all on function public.adjust_inventory(text, text, integer, text, uuid) from public;
revoke all on function public.adjust_inventory(text, text, integer, text, uuid) from anon;
revoke all on function public.adjust_inventory(text, text, integer, text, uuid) from authenticated;
grant execute on function public.adjust_inventory(text, text, integer, text, uuid) to service_role;

alter table public.products enable row level security;
alter table public.product_variants enable row level security;
alter table public.inventory_movements enable row level security;

drop policy if exists "Authenticated users can read products" on public.products;
create policy "Authenticated users can read products"
on public.products for select
to authenticated
using (true);

drop policy if exists "Authenticated users can read variants" on public.product_variants;
create policy "Authenticated users can read variants"
on public.product_variants for select
to authenticated
using (true);

drop policy if exists "Authenticated users can read movements" on public.inventory_movements;
create policy "Authenticated users can read movements"
on public.inventory_movements for select
to authenticated
using (true);

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') and
     not exists (
       select 1
         from pg_publication_tables
        where pubname = 'supabase_realtime'
          and schemaname = 'public'
          and tablename = 'product_variants'
     ) then
    alter publication supabase_realtime add table public.product_variants;
  end if;
end;
$$;
