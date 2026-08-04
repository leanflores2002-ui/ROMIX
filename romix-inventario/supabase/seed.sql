insert into public.products (id, name, category, description, active)
values
  ('11111111-1111-4111-8111-111111111111', 'Pantalón jogger rústico', 'Mujer', 'Pantalón jogger rústico ROMIX', true),
  ('22222222-2222-4222-8222-222222222222', 'Campera de lycra', 'Mujer', 'Campera de lycra ROMIX', true),
  ('33333333-3333-4333-8333-333333333333', 'Pantalón recto', 'Hombre', 'Pantalón recto ROMIX', true)
on conflict (id) do update set
  name = excluded.name,
  category = excluded.category,
  description = excluded.description,
  active = excluded.active;

insert into public.product_variants (
  id,
  product_id,
  barcode,
  sku,
  color,
  size,
  stock,
  minimum_stock,
  active
)
values
  (
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    '11111111-1111-4111-8111-111111111111',
    'ROM-JOG-NEG-T3',
    'JOG-NEG-T3',
    'Negro',
    '3',
    10,
    3,
    true
  ),
  (
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    '22222222-2222-4222-8222-222222222222',
    'ROM-CAM-AZU-T2',
    'CAM-AZU-T2',
    'Azul',
    '2',
    8,
    2,
    true
  ),
  (
    'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
    '33333333-3333-4333-8333-333333333333',
    'ROM-REC-GRI-T4',
    'REC-GRI-T4',
    'Gris',
    '4',
    6,
    2,
    true
  )
on conflict (id) do update set
  barcode = excluded.barcode,
  sku = excluded.sku,
  color = excluded.color,
  size = excluded.size,
  stock = excluded.stock,
  minimum_stock = excluded.minimum_stock,
  active = excluded.active;
