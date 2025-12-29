from __future__ import annotations

import base64
import hashlib
import hmac
import json
import os
import re
import unicodedata
from datetime import datetime, timedelta, timezone
from pathlib import Path
from threading import RLock
import threading
from typing import Any, Dict, List, Tuple

from fastapi import Depends, FastAPI, HTTPException, Request, Response
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
VARIANTS_FILE = Path(
    os.environ.get(
        "ROMIX_VARIANTS_FILE",
        PUBLIC_DIR / "assets" / "data" / "product_variants.json",
    )
)
ORDERS_FILE = Path(os.environ.get("ROMIX_ORDERS_FILE", ROOT / "backend" / "data" / "orders.json"))

ADMIN_USER = os.environ.get("ROMIX_ADMIN_USER", "admin")
ADMIN_PASSWORD = os.environ.get("ROMIX_ADMIN_PASSWORD", "admin123")
ADMIN_SECRET = (
    os.environ.get("ROMIX_ADMIN_SECRET")
    or os.environ.get("ROMIX_SECRET_KEY")
    or "romix-admin-secret"
).encode("utf-8")
TOKEN_TTL_SECONDS = int(os.environ.get("ROMIX_ADMIN_TTL", 60 * 60 * 12))
TOKEN_COOKIE_NAME = "romix_admin_token"

templates = Jinja2Templates(directory=str(PUBLIC_DIR))

# Cache en memoria para evitar leer/parsing del JSON en cada request bajo carga
_products_cache: list[dict] | None = None
_products_mtime: float | None = None
_products_json_cache: str | None = None
_products_lock = RLock()

# Variantes en memoria
_variants: Dict[Tuple[str, str, str], dict] = {}
_variants_lock = threading.RLock()

# Pedidos en memoria
_orders_cache: list[dict] | None = None
_orders_mtime: float | None = None
_orders_lock = RLock()


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


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


def ensure_dir(path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)


def b64u_encode(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).decode("utf-8").rstrip("=")


def b64u_decode(data: str) -> bytes:
    padding = "=" * (-len(data) % 4)
    return base64.urlsafe_b64decode(data + padding)


def sign_token(payload: dict) -> str:
    body = json.dumps(payload, separators=(",", ":"), ensure_ascii=False).encode("utf-8")
    body_b64 = b64u_encode(body)
    sig = hmac.new(ADMIN_SECRET, body_b64.encode("utf-8"), hashlib.sha256).digest()
    return f"{body_b64}.{b64u_encode(sig)}"


def verify_token(token: str | None) -> dict | None:
    if not token or "." not in token:
        return None
    try:
        body_b64, sig_b64 = token.split(".", 1)
        expected = hmac.new(ADMIN_SECRET, body_b64.encode("utf-8"), hashlib.sha256).digest()
        provided = b64u_decode(sig_b64)
        if not hmac.compare_digest(expected, provided):
            return None
        payload = json.loads(b64u_decode(body_b64).decode("utf-8"))
        exp = payload.get("exp")
        if exp and datetime.fromtimestamp(exp, tz=timezone.utc) < datetime.now(timezone.utc):
            return None
        return payload
    except Exception:
        return None


def require_admin(request: Request) -> dict:
    token = request.cookies.get(TOKEN_COOKIE_NAME) or ""
    header = request.headers.get("Authorization", "")
    if header.lower().startswith("bearer "):
        token = header.split(" ", 1)[1]
    payload = verify_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="No autorizado")
    return payload


def safe_read_json(path: Path, default: Any) -> Any:
    if not path.exists():
        return default
    try:
        return json.loads(path.read_text(encoding="utf-8") or "[]")
    except Exception:
        return default


def safe_write_json(path: Path, payload: Any) -> None:
    ensure_dir(path)
    tmp = path.with_suffix(path.suffix + ".tmp")
    tmp.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    os.replace(tmp, path)


def product_id(product: dict) -> str:
    return str(product.get("id") or slugify(product.get("name", "")))


def load_products(force: bool = False) -> list[dict]:
    """Carga el listado de productos, reutilizando cache si el archivo no cambia."""
    global _products_cache, _products_mtime, _products_json_cache
    with _products_lock:
        mtime = DATA_FILE.stat().st_mtime if DATA_FILE.exists() else None
        if (
            not force
            and _products_cache is not None
            and _products_mtime == mtime
            and _products_json_cache is not None
        ):
            return _products_cache
        products = safe_read_json(DATA_FILE, [])
        _products_cache = products
        _products_mtime = mtime
        _products_json_cache = json.dumps(products, ensure_ascii=False)
        return _products_cache


def persist_products(products: list[dict]) -> None:
    global _products_cache, _products_mtime, _products_json_cache
    with _products_lock:
        safe_write_json(DATA_FILE, products)
        _products_cache = products
        _products_mtime = DATA_FILE.stat().st_mtime if DATA_FILE.exists() else None
        _products_json_cache = json.dumps(products, ensure_ascii=False)


def products_json() -> str:
    """Devuelve la version en JSON pre-renderizada para inyectar en templates."""
    global _products_json_cache
    load_products()
    with _products_lock:
        if _products_json_cache is None:
            _products_json_cache = json.dumps(_products_cache or [], ensure_ascii=False)
        return _products_json_cache


def variants_file() -> Path:
    ensure_dir(VARIANTS_FILE)
    return VARIANTS_FILE


def iter_product_colors(product: dict) -> List[str]:
    colors = product.get("colors") or []
    if not colors:
        return ["Unico"]
    parsed = []
    for c in colors:
        if isinstance(c, str):
            name = c.strip()
        elif isinstance(c, dict):
            name = str(c.get("name") or c.get("color") or "").strip()
        else:
            name = str(c).strip()
        if name:
            parsed.append(name)
    return parsed or ["Unico"]


def iter_product_sizes(product: dict) -> List[Tuple[str, str]]:
    sizes = product.get("sizes") or []
    if not sizes:
        return [("U", "available")]
    parsed: List[Tuple[str, str]] = []
    for s in sizes:
        if isinstance(s, str):
            parsed.append((s.strip(), "available"))
        elif isinstance(s, dict):
            size_name = str(s.get("size") or s.get("value") or s.get("name") or "").strip()
            status = str(s.get("status") or "").lower().strip()
            if size_name:
                parsed.append((size_name, status))
        else:
            parsed.append((str(s).strip(), "available"))
    return parsed or [("U", "available")]


def base_stock_for_status(status: str) -> int:
    if "out" in status or "unavail" in status:
        return 0
    if "low" in status:
        return 2
    return 5


def build_variants_from_products(products: list[dict]) -> list[dict]:
    variants: list[dict] = []
    for p in products:
        pid = product_id(p)
        for color_name in iter_product_colors(p):
            for size_name, status in iter_product_sizes(p):
                variants.append(
                    {
                        "id": f"{pid}-{slugify(color_name)}-{slugify(size_name)}",
                        "product_id": pid,
                        "color": color_name,
                        "size": size_name,
                        "stock": base_stock_for_status(status),
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
            data = safe_read_json(path, [])
        else:
            data = build_variants_from_products(load_products())
            safe_write_json(path, data)
        _variants = {}
        for v in data:
            pid = str(v.get("product_id") or v.get("productId") or "").strip()
            if not pid:
                continue
            key = (pid, normalize_text(v.get("color", "")), normalize_text(v.get("size", "")))
            _variants[key] = {
                "product_id": pid,
                "color": v.get("color"),
                "size": v.get("size"),
                "stock": int(v.get("stock") or 0),
                "id": v.get("id") or v.get("variant_id") or "-".join(key),
            }
        return _variants


def persist_variants_locked() -> None:
    path = variants_file()
    payload = list(_variants.values())
    safe_write_json(path, payload)


def get_variant(product_id_value: str, color: str, size: str) -> dict | None:
    key = (str(product_id_value).strip(), normalize_text(color), normalize_text(size))
    return load_variants().get(key)


def orders_file() -> Path:
    ensure_dir(ORDERS_FILE)
    return ORDERS_FILE


def load_orders(force: bool = False) -> list[dict]:
    global _orders_cache, _orders_mtime
    with _orders_lock:
        mtime = orders_file().stat().st_mtime if orders_file().exists() else None
        if _orders_cache is not None and _orders_mtime == mtime and not force:
            return _orders_cache
        orders = safe_read_json(orders_file(), [])
        _orders_cache = orders or []
        _orders_mtime = mtime
        return _orders_cache


def persist_orders(orders: list[dict]) -> None:
    global _orders_cache, _orders_mtime
    with _orders_lock:
        safe_write_json(orders_file(), orders)
        _orders_cache = orders
        _orders_mtime = orders_file().stat().st_mtime if orders_file().exists() else None


def serialize_variant(v: dict) -> dict:
    return {
        "id": v.get("id"),
        "product_id": v.get("product_id"),
        "productId": v.get("product_id"),
        "color": v.get("color"),
        "size": v.get("size"),
        "stock": v.get("stock"),
    }


def ensure_product_exists(product_id_value: str, active_only: bool = False) -> dict:
    products = load_products()
    for p in products:
        pid = product_id(p)
        if str(pid) == str(product_id_value):
            if active_only and p.get("active") is False:
                raise HTTPException(status_code=400, detail=f"Producto {product_id_value} inactivo")
            return p
    raise HTTPException(status_code=400, detail=f"Producto {product_id_value} inexistente")


def resolve_price(product: dict) -> float:
    if product is None:
        return 0.0
    price = product.get("price")
    if isinstance(price, (int, float)):
        return float(price)
    price_by_group = product.get("priceByGroup") or {}
    common_price = price_by_group.get("common")
    if isinstance(common_price, (int, float)):
        return float(common_price)
    return 0.0


def sync_variants_for_product(product: dict) -> None:
    """Crea/ajusta variantes para un producto y elimina combinaciones obsoletas."""
    pid = product_id(product)
    combos = set()
    with _variants_lock:
        variants = load_variants()
        for color_name in iter_product_colors(product):
            for size_name, status in iter_product_sizes(product):
                key = (pid, normalize_text(color_name), normalize_text(size_name))
                combos.add(key)
                variant = variants.get(key) or {
                    "id": f"{pid}-{slugify(color_name)}-{slugify(size_name)}",
                    "product_id": pid,
                    "stock": base_stock_for_status(status),
                }
                variant.update({"product_id": pid, "color": color_name, "size": size_name})
                variants[key] = variant
        for key in list(variants.keys()):
            if key[0] == pid and key not in combos:
                variants.pop(key, None)
        persist_variants_locked()


def validate_and_reserve(items: List[dict]) -> Tuple[List[dict], List[dict]]:
    """Valida stock y retorna (updates, order_items) ya descontando stock."""
    updates = []
    order_items = []
    with _variants_lock:
        variants = load_variants()
        products = {product_id(p): p for p in load_products()}
        # Validaciones previas
        for it in items:
            pid = str(it.get("productId") or "").strip()
            color = it.get("color") or ""
            size = it.get("size") or ""
            qty = int(it.get("qty") or 0)
            if not pid or not color or not size or qty <= 0:
                raise HTTPException(status_code=400, detail="Item invalido: productId, color, size y qty son obligatorios")
            product = products.get(pid)
            if not product:
                raise HTTPException(status_code=400, detail=f"Producto {pid} inexistente")
            if product.get("active") is False:
                raise HTTPException(status_code=400, detail=f"Producto {pid} inactivo")
            key = (pid, normalize_text(color), normalize_text(size))
            variant = variants.get(key)
            if not variant:
                raise HTTPException(status_code=400, detail=f"No existe variante para productId={pid}, color={color}, talle={size}")
            if variant["stock"] < qty:
                raise HTTPException(status_code=409, detail=f"Stock insuficiente para {variant['color']} talle {variant['size']}")
        # Aplicar descuentos
        for it in items:
            pid = str(it.get("productId"))
            color = it.get("color")
            size = it.get("size")
            qty = int(it.get("qty"))
            key = (pid, normalize_text(color), normalize_text(size))
            variant = variants[key]
            variant["stock"] = max(0, int(variant["stock"]) - qty)
            updates.append(
                {
                    "productId": pid,
                    "color": variant["color"],
                    "size": variant["size"],
                    "stock": variant["stock"],
                }
            )
            order_items.append(
                {
                    "product_id": pid,
                    "color": variant["color"],
                    "size": variant["size"],
                    "qty": qty,
                    "price_snapshot": resolve_price(products.get(pid)),
                }
            )
        persist_variants_locked()
    return updates, order_items


def restore_stock(order: dict) -> None:
    if not order or not isinstance(order, dict):
        return
    items = order.get("items") or []
    with _variants_lock:
        variants = load_variants()
        for it in items:
            pid = str(it.get("product_id") or it.get("productId") or "").strip()
            color = it.get("color") or ""
            size = it.get("size") or ""
            qty = int(it.get("qty") or 0)
            if not pid or not color or not size or qty <= 0:
                continue
            key = (pid, normalize_text(color), normalize_text(size))
            variant = variants.get(key)
            if not variant:
                variant = {
                    "id": f"{pid}-{slugify(color)}-{slugify(size)}",
                    "product_id": pid,
                    "color": color,
                    "size": size,
                    "stock": 0,
                }
            variant["stock"] = max(0, int(variant.get("stock") or 0)) + qty
            variants[key] = variant
        persist_variants_locked()


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
    load_orders()


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


@app.get("/admin", response_class=HTMLResponse)
def admin_page(request: Request):
    # La UI maneja el estado de login via cookie HttpOnly
    return templates.TemplateResponse("admin/admin.html", {"request": request})


def sanitize_product_payload(body: dict, existing: dict | None = None) -> dict:
    if not isinstance(body, dict):
        raise HTTPException(status_code=400, detail="Payload invalido")
    base = existing.copy() if existing else {}
    updates = {k: v for k, v in body.items() if v is not None}
    allowed_fields = {
        "section",
        "type",
        "name",
        "description",
        "badge",
        "price",
        "priceByGroup",
        "colors",
        "sizes",
        "image",
        "images",
        "active",
    }
    for key, value in updates.items():
        if key in allowed_fields:
            base[key] = value
    if not base.get("name"):
        raise HTTPException(status_code=400, detail="name es requerido")
    if not base.get("section"):
        raise HTTPException(status_code=400, detail="section es requerido")
    base["id"] = str(body.get("id") or base.get("id") or slugify(base.get("name", "")))
    base["active"] = bool(base.get("active", True))
    return base


def save_product_and_sync(product: dict, products: list[dict], replace_index: int | None = None) -> dict:
    if replace_index is None:
        products.append(product)
    else:
        products[replace_index] = product
    persist_products(products)
    sync_variants_for_product(product)
    return product


def find_product_index(pid: str) -> Tuple[int, dict] | Tuple[None, None]:
    products = load_products()
    for idx, p in enumerate(products):
        if product_id(p) == str(pid):
            return idx, p
    return None, None


@app.post("/api/admin/login")
def admin_login(body: dict, response: Response):
    username = (body or {}).get("username")
    password = (body or {}).get("password")
    if not username or not password:
        raise HTTPException(status_code=400, detail="Credenciales incompletas")
    if str(username) != str(ADMIN_USER) or str(password) != str(ADMIN_PASSWORD):
        raise HTTPException(status_code=401, detail="Usuario o contraseña incorrectos")
    exp = datetime.now(timezone.utc) + timedelta(seconds=TOKEN_TTL_SECONDS)
    token = sign_token({"sub": "admin", "exp": int(exp.timestamp())})
    response.set_cookie(
        TOKEN_COOKIE_NAME,
        token,
        httponly=True,
        secure=False,
        samesite="lax",
        path="/",
        max_age=TOKEN_TTL_SECONDS,
    ) 
    return {"ok": True, "exp": exp.isoformat()}


@app.post("/api/admin/logout")
def admin_logout(response: Response):
    response.delete_cookie(TOKEN_COOKIE_NAME, path="/")
    return {"ok": True}


@app.get("/api/admin/dashboard")
def admin_dashboard(_: dict = Depends(require_admin)):
    orders = load_orders()
    variants = load_variants()
    products = load_products()
    pending = [o for o in orders if o.get("status") == "pending"]
    confirmed = [o for o in orders if o.get("status") == "confirmed"]
    cancelled = [o for o in orders if o.get("status") == "cancelled"]
    low_stock = [serialize_variant(v) for v in variants.values() if int(v.get("stock") or 0) < 3][:10]
    active_products = len([p for p in products if p.get("active") is not False])
    return {
        "pending_orders": len(pending),
        "confirmed_orders": len(confirmed),
        "cancelled_orders": len(cancelled),
        "low_stock": low_stock,
        "active_products": active_products,
    }


@app.get("/api/admin/products")
def admin_products(_: dict = Depends(require_admin)):
    products = load_products()
    enriched = []
    for p in products:
        enriched.append({**p, "id": product_id(p)})
    return enriched


@app.post("/api/admin/products")
def create_product_admin(body: dict, _: dict = Depends(require_admin)):
    products = load_products()
    product = sanitize_product_payload(body)
    pid = product_id(product)
    if any(product_id(p) == pid for p in products):
        raise HTTPException(status_code=400, detail="Ya existe un producto con ese id")
    saved = save_product_and_sync(product, products)
    return {"product": saved}


@app.put("/api/admin/products/{pid}")
def update_product_admin(pid: str, body: dict, _: dict = Depends(require_admin)):
    idx, existing = find_product_index(pid)
    if existing is None:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    updated = sanitize_product_payload(body, existing)
    updated["id"] = product_id(updated)
    products = load_products()
    saved = save_product_and_sync(updated, products, replace_index=idx)
    return {"product": saved}


@app.patch("/api/admin/products/{pid}/active")
def toggle_product_active(pid: str, body: dict, _: dict = Depends(require_admin)):
    idx, existing = find_product_index(pid)
    if existing is None:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    active = body.get("active")
    if active is None:
        raise HTTPException(status_code=400, detail="active es requerido")
    existing["active"] = bool(active)
    products = load_products()
    saved = save_product_and_sync(existing, products, replace_index=idx)
    return {"product": saved}


def find_variant_by_id(variant_id: str) -> Tuple[Tuple[str, str, str] | None, dict | None]:
    variants = load_variants()
    for key, variant in variants.items():
        if str(variant.get("id")) == str(variant_id):
            return key, variant
    return None, None


@app.get("/api/admin/variants")
def admin_list_variants(_: dict = Depends(require_admin)):
    variants = load_variants()
    return [serialize_variant(v) for v in variants.values()]


@app.post("/api/admin/variants")
def admin_create_variant(body: dict, _: dict = Depends(require_admin)):
    payload = body or {}
    pid = str(payload.get("product_id") or payload.get("productId") or "").strip()
    color = (body or {}).get("color") or ""
    size = (body or {}).get("size") or ""
    stock = int((body or {}).get("stock") or 0)
    if not pid or not color or not size:
        raise HTTPException(status_code=400, detail="product_id, color y size son obligatorios")
    ensure_product_exists(pid)
    with _variants_lock:
        variants = load_variants()
        key = (pid, normalize_text(color), normalize_text(size))
        if key in variants:
            raise HTTPException(status_code=400, detail="Ya existe esa variante")
        variant = {
            "id": f"{pid}-{slugify(color)}-{slugify(size)}",
            "product_id": pid,
            "color": color,
            "size": size,
            "stock": max(0, stock),
        }
        variants[key] = variant
        persist_variants_locked()
        return {"variant": serialize_variant(variant)}


@app.put("/api/admin/variants/{variant_id}")
def admin_update_variant(variant_id: str, body: dict, _: dict = Depends(require_admin)):
    payload = body or {}
    new_pid = str(payload.get("product_id") or payload.get("productId") or "").strip()
    color = payload.get("color")
    size = payload.get("size")
    stock = payload.get("stock")
    with _variants_lock:
        key, variant = find_variant_by_id(variant_id)
        if not variant or not key:
            raise HTTPException(status_code=404, detail="Variante no encontrada")
        pid = new_pid or variant["product_id"]
        ensure_product_exists(pid)
        new_color = color if color is not None else variant["color"]
        new_size = size if size is not None else variant["size"]
        new_stock = max(0, int(stock)) if stock is not None else int(variant.get("stock") or 0)
        variants = load_variants()
        new_key = (pid, normalize_text(new_color), normalize_text(new_size))
        if new_key != key and new_key in variants:
            raise HTTPException(status_code=400, detail="Ya existe otra variante con ese color/talle")
        variants.pop(key)
        variant.update(
            {
                "product_id": pid,
                "color": new_color,
                "size": new_size,
                "stock": new_stock,
                "id": variant.get("id") or variant_id,
            }
        )
        variants[new_key] = variant
        persist_variants_locked()
        return {"variant": serialize_variant(variant)}


@app.patch("/api/admin/variants/{variant_id}/stock")
def admin_patch_stock(variant_id: str, body: dict, _: dict = Depends(require_admin)):
    if not isinstance(body, dict):
        raise HTTPException(status_code=400, detail="Payload invalido")
    delta = body.get("delta")
    new_stock = body.get("stock")
    if delta is None and new_stock is None:
        raise HTTPException(status_code=400, detail="stock o delta requerido")
    with _variants_lock:
        key, variant = find_variant_by_id(variant_id)
        if not variant or not key:
            raise HTTPException(status_code=404, detail="Variante no encontrada")
        variants = load_variants()
        current = int(variant.get("stock") or 0)
        if delta is not None:
            current += int(delta)
        if new_stock is not None:
            current = int(new_stock)
        variant["stock"] = max(0, current)
        variants[key] = variant
        persist_variants_locked()
        return {"variant": serialize_variant(variant)}


@app.get("/api/admin/orders")
def admin_orders(_: dict = Depends(require_admin)):
    orders = sorted(load_orders(), key=lambda o: o.get("created_at", ""), reverse=True)
    return orders


@app.get("/api/admin/orders/{order_id}")
def admin_order_detail(order_id: str, _: dict = Depends(require_admin)):
    for order in load_orders():
        if str(order.get("id")) == str(order_id):
            return order
    raise HTTPException(status_code=404, detail="Pedido no encontrado")


@app.patch("/api/admin/orders/{order_id}")
def admin_update_order(order_id: str, body: dict, _: dict = Depends(require_admin)):
    status = (body or {}).get("status")
    if status not in {"pending", "confirmed", "cancelled"}:
        raise HTTPException(status_code=400, detail="status invalido")
    with _variants_lock:
        with _orders_lock:
            orders = load_orders()
            target = None
            for order in orders:
                if str(order.get("id")) == str(order_id):
                    target = order
                    break
            if not target:
                raise HTTPException(status_code=404, detail="Pedido no encontrado")
            prev_status = target.get("status")
            if status == prev_status:
                return target
            if status == "cancelled" and target.get("restocked") is not True:
                restore_stock(target)
                target["restocked"] = True
            if status != "cancelled":
                target["restocked"] = False
            target["status"] = status
            target["updated_at"] = now_iso()
            persist_orders(orders)
            return target


@app.get("/api/variants")
def list_variants():
    return [serialize_variant(v) for v in load_variants().values()]


@app.post("/api/orders")
def create_order(body: dict):
    items = body.get("items") if isinstance(body, dict) else None
    if not items or not isinstance(items, list):
        raise HTTPException(status_code=400, detail="items es requerido")
    customer_name = (body or {}).get("customer_name") or (body or {}).get("customerName") or ""
    whatsapp = (body or {}).get("whatsapp") or ""
    notes = (body or {}).get("notes") or ""
    updates, order_items = validate_and_reserve(items)
    order_id = os.urandom(8).hex()
    order = {
        "id": order_id,
        "created_at": now_iso(),
        "status": "pending",
        "customer_name": str(customer_name),
        "whatsapp": str(whatsapp),
        "notes": str(notes),
        "items": order_items,
        "restocked": False,
    }
    with _orders_lock:
        orders = load_orders()
        orders.append(order)
        persist_orders(orders)
    return {"orderId": order_id, "status": "pending", "updatedVariants": updates, "items": order_items, "order": order}


# Servir estaticos desde el frontend publico
app.mount("/", StaticFiles(directory=str(PUBLIC_DIR), html=True), name="static")
