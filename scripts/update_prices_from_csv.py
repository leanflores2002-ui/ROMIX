#!/usr/bin/env python3
"""
Actualiza los precios en `frontend/products.json` a partir de un CSV.

Uso:
  python scripts/update_prices_from_csv.py ruta/al/archivo.csv

CSV esperado (con encabezado). Acepta estas columnas:
  - nombre | producto | name    (nombre del producto)
  - precio | price              (precio nuevo)
  - precio_original | originalPrice (opcional)

Notas:
  - La coincidencia se hace por nombre normalizado (sin acentos, minúsculas).
  - Se escribe backup en `frontend/products.json.bak` antes de guardar cambios.
  - Soporta números con formato "es-AR" (puntos como miles, coma como decimal).
"""
import csv
import json
import os
import re
import shutil
import sys
from unicodedata import normalize as _uni_normalize


ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PRODUCTS_PATH = os.path.join(ROOT, 'frontend', 'products.json')
BACKUP_PATH = PRODUCTS_PATH + '.bak'


def norm(s: str) -> str:
    if s is None:
        return ''
    try:
        return _uni_normalize('NFD', str(s)).encode('ascii', 'ignore').decode('ascii').lower().strip()
    except Exception:
        return str(s).lower().strip()


def parse_money(v: str) -> int:
    """Convierte una cadena de precio a entero en pesos.
    - Elimina símbolos y espacios.
    - Interpreta coma como decimal, punto como miles.
    - Redondea al entero más cercano.
    """
    if v is None:
        return 0
    s = str(v)
    # Quitar símbolo de moneda y espacios
    s = re.sub(r'[^0-9,\.]', '', s)
    # Si hay ambas coma y punto, asumir formato miles con punto y decimal con coma
    if ',' in s and '.' in s:
        s = s.replace('.', '')
        s = s.replace(',', '.')
    # Si solo hay coma, usarla como decimal
    elif ',' in s and '.' not in s:
        s = s.replace(',', '.')
    # Si solo hay punto, ya es decimal o miles; quitar separadores extra
    # Intentar convertir
    try:
        val = float(s)
    except Exception:
        # Quitar todo menos dígitos
        s2 = re.sub(r'[^0-9]', '', s)
        val = float(int(s2 or '0'))
    return int(round(val))


def load_csv_map(csv_path: str):
    with open(csv_path, 'r', encoding='utf-8-sig', newline='') as f:
        reader = csv.DictReader(f)
        rows = list(reader)
    name_keys = ['nombre', 'producto', 'name']
    price_keys = ['precio', 'price', 'precio_nuevo', 'nuevo_precio']
    orig_keys = ['precio_original', 'originalprice', 'precio anterior', 'precio_anterior']
    mapping = {}
    for row in rows:
        # Tomar nombre
        raw_name = None
        for k in name_keys:
            if k in row and row[k]:
                raw_name = row[k]
                break
        if not raw_name:
            continue
        # Tomar precio
        raw_price = None
        for k in price_keys:
            if k in row and row[k]:
                raw_price = row[k]
                break
        if raw_price is None:
            continue
        # Tomar precio original (opcional)
        raw_orig = None
        for k in orig_keys:
            if k in row and row[k]:
                raw_orig = row[k]
                break
        name_n = norm(raw_name)
        mapping[name_n] = {
            'price': parse_money(raw_price),
            'originalPrice': (parse_money(raw_orig) if raw_orig is not None else None),
            'raw': row,
        }
    return mapping


def main(argv):
    if len(argv) < 2:
        print('Uso: python scripts/update_prices_from_csv.py ruta/al/archivo.csv')
        return 2
    csv_path = argv[1]
    if not os.path.isfile(PRODUCTS_PATH):
        print(f'No se encontró {PRODUCTS_PATH}')
        return 2
    if not os.path.isfile(csv_path):
        print(f'No se encontró CSV: {csv_path}')
        return 2

    with open(PRODUCTS_PATH, 'r', encoding='utf-8') as f:
        products = json.load(f)
    if not isinstance(products, list):
        print('products.json no es una lista JSON')
        return 2

    price_map = load_csv_map(csv_path)
    if not price_map:
        print('El CSV no contiene filas válidas (nombre + precio)')
        return 2

    print(f'Entradas en CSV: {len(price_map)}')
    updated = 0
    missing = []
    for p in products:
        name_n = norm(p.get('name'))
        if name_n in price_map:
            entry = price_map[name_n]
            old_price = p.get('price')
            p['price'] = int(entry['price'])
            if entry['originalPrice'] is not None:
                p['originalPrice'] = int(entry['originalPrice'])
            print(f"- {p.get('name')}: {old_price} -> {p['price']}")
            updated += 1
        else:
            missing.append(p.get('name'))

    if not os.path.exists(BACKUP_PATH):
        shutil.copyfile(PRODUCTS_PATH, BACKUP_PATH)
        print(f'Backup creado: {BACKUP_PATH}')
    else:
        print(f'Backup ya existía: {BACKUP_PATH}')

    with open(PRODUCTS_PATH, 'w', encoding='utf-8') as f:
        json.dump(products, f, ensure_ascii=False, indent=2)

    print(f'Actualizados: {updated} productos')
    if missing:
        print(f'No coinciden en CSV (ejemplos): {", ".join(missing[:10])} ... total {len(missing)}')
    return 0


if __name__ == '__main__':
    raise SystemExit(main(sys.argv))

