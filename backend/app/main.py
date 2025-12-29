from __future__ import annotations

import json
import os
import re
import unicodedata
from pathlib import Path
from threading import RLock
import threading
from typing import Dict, List, Tuple

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates


def repo_root() -> Path:
    # backend/app/main.py -> backend/app -> backend -> repo
    return Path(__file__).resolve().parents[2]


ROOT = repo_root()
PUBLIC_DIR = ROOT / "frontend" / "public"
DATA_FILE = Path(
    os.environ.get(
        "ROMIX_PRODUCTS_FILE",
        PUBLIC_DIR / "assets" / "data" / "products.json",
    )
)
VARIANTS_FILE = ROOT / "backend" / "data" / "product_variants.json"
templates = Jinja2Templates(directory=str(PUBLIC_DIR))

# Cache en memoria para evitar leer/parsing del JSON en cada request bajo carga
_products_cache: list[dict] | None = None
_products_mtime: float | None = None
_products_json_cache: str | None = None
_products_lock = RLock()

# Variantes en memoria
_variants: Dict[Tuple[str, str, str], dict] = {}
_variants_lock = threading.RLock()


def slugify(text: str) -> str:
    if not text:
        return ""
    try:
        text = unicodedata.normalize("NFKD", text)
        text = "".join([c for c in text if not unicodedata.combining(c)])
    except Exception:
        pass
    text = text.lower()
    text = re.sub(r"[^a-z0-9]+", "-", text)
    return text.strip("-")


def load_products() -> list[dict]:
    """Carga el listado de productos, reutilizando cache si el archivo no cambia."""
    global _products_cache, _products_mtime, _products_json_cache

    with _products_lock:
        if not DATA_FILE.exists():
            _products_cache = []
            _products_mtime = None
            _products_json_cache = "[]"
            return _products_cache

        mtime = DATA_FILE.stat().st_mtime
        if (
            _products_cache is not None
            and _products_mtime == mtime
            and _products_json_cache is not None
        ):
            return _products_cache

        with open(DATA_FILE, "r", encoding="utf-8") as f:
            data = json.load(f) or []

        _products_cache = data
        _products_mtime = mtime
        _products_json_cache = json.dumps(_products_cache, ensure_ascii=False)
        return _products_cache


def products_json() -> str:
    """Devuelve la version en JSON pre-renderizada para inyectar en templates."""
    global _products_json_cache
    load_products()
    with _products_lock:
        if _products_json_cache is None:
            _products_json_cache = json.dumps(_products_cache or [], ensure_ascii=False)
        return _products_json_cache


def normalize_text(value: str) -> str:
    if value is None:
        return ""
    txt = str(value).strip()
    if not txt:
        return ""
    try:
        txt = unicodedata.normalize("NFD", txt)
        txt = "".join([c for c in txt if not unicodedata.combining(c)])
    except Exception:
        pass
    return txt.lower()


def variants_file() -> Path:
    VARIANTS_FILE.parent.mkdir(parents=True, exist_ok=True)
    return VARIANTS_FILE


def build_variants_from_products(products: list[dict]) -> list[dict]:
    variants: list[dict] = []
    for p in products:
        pid = p.get("id") or slugify(p.get("name", ""))
        colors = p.get("colors") or []
        sizes = p.get("sizes") or []
        if not colors:
            colors = [{"name": "Unico"}]
        if not sizes:
            sizes = [{"size": "U", "status": "available"}]
        for color in colors:
            color_name = color["name"] if isinstance(color, dict) else str(color)
            for size in sizes:
                size_name = size.get("size") if isinstance(size, dict) else str(size)
                status = str(size.get("status", "")).lower() if isinstance(size, dict) else ""
                if "out" in status or "unavail" in status:
                    stock = 0
                elif "low" in status:
                    stock = 2
                else:
                    stock = 5
                variants.append(
                    {
                        "id": f"{pid}-{slugify(color_name)}-{slugify(size_name)}",
                        "product_id": pid,
                        "color": color_name,
                        "size": size_name,
                        "stock": stock,
                    }
                )
    return variants


def load_variants(force: bool = False) -> dict:
    global _variants
    with _variants_lock:
        if _variants and not force:
            return _variants
        path = variants_file()
        if path.exists():
            data = json.loads(path.read_text(encoding="utf-8") or "[]")
        else:
            data = build_variants_from_products(load_products())
            path.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
        _variants = {}
        for v in data:
            key = (
                str(v.get("product_id") or "").strip(),
                normalize_text(v.get("color", "")),
                normalize_text(v.get("size", "")),
            )
            if not key[0]:
                continue
            _variants[key] = {
                "product_id": v.get("product_id"),
                "color": v.get("color"),
                "size": v.get("size"),
                "stock": int(v.get("stock") or 0),
                "id": v.get("id") or "-".join(key),
            }
        return _variants


def persist_variants() -> None:
    path = variants_file()
    payload = list(_variants.values())
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")


def get_variant(product_id: str, color: str, size: str) -> dict | None:
    key = (str(product_id).strip(), normalize_text(color), normalize_text(size))
    return load_variants().get(key)


app = FastAPI(title="ROMIX API", version="1.0.0")

# Permitir consumir desde el mismo host y uso local
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # para desarrollo; ajustar en prod
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
def health():
    return {"status": "ok"}


@app.on_event("startup")
def warm_products_cache():
    # Precalentamos cache para evitar latencia en las primeras peticiones
    load_products()
    load_variants(force=True)


@app.get("/api/products")
def get_products(section: str | None = None):
    products = load_products()
    if section:
        section = section.strip().lower()
        products = [p for p in products if str(p.get("section", "")).lower() == section]
    return products


@app.get("/api/products/{slug}")
def get_product(slug: str):
    products = load_products()
    for p in products:
        if slugify(p.get("name", "")) == slug:
            return p
    raise HTTPException(status_code=404, detail="Producto no encontrado")


@app.get("/api/search")
def search(q: str):
    qn = (q or "").strip().lower()
    if not qn:
        return []

    def score(p: dict) -> int:
        name = str(p.get("name", "")).lower()
        type_ = str(p.get("type", "")).lower()
        s = -1
        if name.startswith(qn):
            s = 100 - len(name)
        elif qn in name:
            s = 80 - name.index(qn)
        elif qn in type_:
            s = 60 - type_.index(qn)
        return s

    products = load_products()
    items = sorted(
        [p for p in products if score(p) >= 0], key=lambda p: score(p), reverse=True
    )[:12]
    return [
        {"name": p.get("name", ""), "type": p.get("type", ""), "slug": slugify(p.get("name", ""))}
        for p in items
    ]


# Vistas HTML renderizadas con Jinja (precargan productos en el cliente)
@app.get("/", response_class=HTMLResponse)
def home(request: Request, q: str | None = None):
    return templates.TemplateResponse(
        "index.html",
        {
            "request": request,
            "products_json": products_json(),
            "query": q or "",
        },
    )


@app.get("/catalogo", response_class=HTMLResponse)
def catalog_page(request: Request, q: str | None = None):
    return templates.TemplateResponse(
        "catalogo.html",
        {
            "request": request,
            "products_json": products_json(),
            "query": q or "",
        },
    )


@app.get("/product/{slug}", response_class=HTMLResponse)
def product_page(request: Request, slug: str):
    products = load_products()
    product = None
    for p in products:
        if slugify(p.get("name", "")) == slug:
            product = p
            break
    if not product:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    return templates.TemplateResponse(
        "product.html",
        {
            "request": request,
            "product_json": json.dumps(product, ensure_ascii=False),
            "products_json": products_json(),
            "slug": slug,
        },
    )


def ensure_product_exists(product_id: str) -> dict:
    products = load_products()
    for p in products:
        pid = p.get("id") or slugify(p.get("name", ""))
        if str(pid) == str(product_id):
            return p
    raise HTTPException(status_code=400, detail=f"Producto {product_id} inexistente")


def validate_and_reserve(items: List[dict]) -> Tuple[List[dict], List[dict]]:
    """Valida stock y retorna (updates, order_items) sin persistir todavía."""
    updates = []
    order_items = []
    with _variants_lock:
        variants = load_variants()
        for it in items:
            pid = str(it.get("productId") or "").strip()
            color = it.get("color") or ""
            size = it.get("size") or ""
            qty = int(it.get("qty") or 0)
            if not pid or not color or not size or qty <= 0:
                raise HTTPException(status_code=400, detail="Item invalido: productId, color, size y qty son obligatorios")
            ensure_product_exists(pid)
            key = (pid, normalize_text(color), normalize_text(size))
            variant = variants.get(key)
            if not variant:
                raise HTTPException(status_code=400, detail=f"No existe variante para productId={pid}, color={color}, talle={size}")
            if variant["stock"] < qty:
                raise HTTPException(status_code=400, detail=f"Stock insuficiente para {variant['color']} talle {variant['size']}")
        for it in items:
            pid = str(it.get("productId"))
            color = it.get("color")
            size = it.get("size")
            qty = int(it.get("qty"))
            key = (pid, normalize_text(color), normalize_text(size))
            variant = variants[key]
            variant["stock"] -= qty
            if variant["stock"] < 0:
                variant["stock"] = 0
            updates.append(
                {
                    "productId": pid,
                    "color": variant["color"],
                    "size": variant["size"],
                    "stock": variant["stock"],
                }
            )
            order_items.append({"productId": pid, "color": variant["color"], "size": variant["size"], "qty": qty})
        persist_variants()
    return updates, order_items


@app.get("/api/variants")
def list_variants():
    return list(load_variants().values())


@app.post("/api/orders")
def create_order(body: dict):
    items = body.get("items") if isinstance(body, dict) else None
    if not items or not isinstance(items, list):
        raise HTTPException(status_code=400, detail="items es requerido")
    updates, order_items = validate_and_reserve(items)
    order_id = os.urandom(8).hex()
    return {"orderId": order_id, "updatedVariants": updates, "items": order_items}


# Servir estaticos desde el frontend publico
app.mount("/", StaticFiles(directory=str(PUBLIC_DIR), html=True), name="static")
