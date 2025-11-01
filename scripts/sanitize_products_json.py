import json
from pathlib import Path
from typing import Any

SRC = Path(__file__).resolve().parent.parent / 'frontend' / 'products.json'
BACKUP = SRC.with_suffix('.pre-sanitize.bak')


WEIRD_CHARS = 'ÃÂ�Ǹǧ��'


def weird_score(s: str) -> int:
    return sum(s.count(ch) for ch in WEIRD_CHARS)


COMMON_REPLACEMENTS = {
    # Spanish common words
    'pantalÃ³n': 'pantalón', 'pantalÃ³nes': 'pantalones',
    'tÃ©rmica': 'térmica', 'tÃ©rmico': 'térmico', 'tÃ©rmicas': 'térmicas', 'tÃ©rmicos': 'térmicos',
    'algodÃ³n': 'algodón',
    'marrÃ³n': 'marrón',
    'niÃ±o': 'niño', 'niÃ±a': 'niña', 'niÃ±os': 'niños', 'niÃ±as': 'niñas',
    'rÃºstico': 'rústico', 'rÃºstica': 'rústica',
    # Double replacement artifacts
    'Ni��o': 'Niño', 'Ni��a': 'Niña', 'Ni��os': 'Niños', 'Ni��as': 'Niñas',
    'Pantal��n': 'Pantalón', 'pantal��n': 'pantalón', 'pantal��nes': 'pantalones',
    'Algod��n': 'Algodón', 'Marr��n': 'Marrón',
    'T��rmica': 'Térmica', 'T��rmico': 'Térmico',
    'R��stico': 'Rústico', 'r��stico': 'rústico',
    # Rare glyphs from previous scripts
    'TǸrmica': 'Térmica', 'TǸrmico': 'Térmico', 'rǧstico': 'rústico',
}


def fix_string(s: str) -> str:
    if not isinstance(s, str) or not s:
        return s

    # Try latin1->utf8 roundtrip if mojibake is detected
    if any(ch in s for ch in WEIRD_CHARS) or 'ni��' in s.lower():
        try:
            candidate = s.encode('latin-1', errors='ignore').decode('utf-8', errors='ignore')
            if weird_score(candidate) < weird_score(s):
                s = candidate
        except Exception:
            pass

    # Apply targeted replacements
    for a, b in COMMON_REPLACEMENTS.items():
        if a in s:
            s = s.replace(a, b)

    # Fallback cleanups
    s = s.replace('\uFFFD', '')  # replacement char if present
    s = s.replace('Â', '')  # stray cp1252 artifact
    s = s.replace('�', '')  # unknown placeholder

    return s


def sanitize_obj(obj: Any) -> Any:
    if isinstance(obj, dict):
        # Special case: rename keys in images dicts
        if 'images' in obj and isinstance(obj['images'], dict):
            new_images = {}
            for k, v in obj['images'].items():
                new_images[fix_string(k)] = sanitize_obj(v)
            obj = dict(obj)  # copy
            obj['images'] = new_images

        return { k: sanitize_obj(v) for k, v in obj.items() }
    elif isinstance(obj, list):
        return [sanitize_obj(x) for x in obj]
    elif isinstance(obj, str):
        return fix_string(obj)
    else:
        return obj


def main():
    if not SRC.exists():
        raise SystemExit(f"No existe {SRC}")

    raw = SRC.read_text(encoding='utf-8', errors='ignore')
    data = json.loads(raw)
    clean = sanitize_obj(data)

    if not BACKUP.exists():
        BACKUP.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding='utf-8')

    SRC.write_text(json.dumps(clean, ensure_ascii=False, indent=2), encoding='utf-8')
    print('Sanitización aplicada sobre products.json')


if __name__ == '__main__':
    main()

