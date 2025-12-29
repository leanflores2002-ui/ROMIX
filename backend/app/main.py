
from __future__ import annotations

import base64
import hashlib
import hmac
import json
import os
import re
import secrets
import tempfile
import time
import unicodedata
from pathlib import Path
from threading import RLock
import threading
from typing import Dict, List, Tuple

from fastapi import FastAPI, HTTPException, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse, JSONResponse
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
ORDERS_FILE = ROOT / "backend" / "data" / "orders.json"
templates = Jinja2Templates(directory=str(PUBLIC_DIR))

ADMIN_USER = os.environ.get("ADMIN_USER", "admin")
ADMIN_PASS = os.environ.get("ADMIN_PASS", "romix123")
ADMIN_SECRET = os.environ.get("ADMIN_SECRET") or os.environ.get("SECRET_KEY") or "romix-secret-key"
ADMIN_TOKEN_TTL = int(os.environ.get("ADMIN_TOKEN_TTL", "28800"))
ADMIN_COOKIE_NAME = "romix_admin_token"
LOW_STOCK_THRESHOLD = int(os.environ.get("ROMIX_LOW_STOCK_THRESHOLD", "3"))

# Cache en memoria para evitar leer/parsing del JSON en cada request bajo carga
_products_cache: list[dict] | None = None
_products_mtime: float | None = None
_products_json_cache: str | None = None
_products_lock = RLock()

# Variantes en memoria
_variants: Dict[Tuple[str, str, str], dict] = {}
_variants_lock = threading.RLock()

_orders_lock = threading.RLock()
_file_locks: Dict[Path, threading.RLock] = {}


def file_lock(path: Path) -> threading.RLock:
    key = path.resolve()
    if key not in _file_locks:
        _file_locks[key] = threading.RLock()
    return _file_locks[key]


def atomic_write_json(path: Path, payload) -> None:
    """Escritura segura en disco (tmp + replace) // ROMIX ADMIN"""
    path.parent.mkdir(parents=True, exist_ok=True)
    lock = file_lock(path)
    with lock:
        fd, tmp_path = tempfile.mkstemp(prefix=path.name, dir=str(path.parent))
        try:
            with os.fdopen(fd, "w", encoding="utf-8") as tmp:
                json.dump(payload, tmp, ensure_ascii=False, indent=2)
                tmp.flush()
                os.fsync(tmp.fileno())
            os.replace(tmp_path, path)
        finally:
            if os.path.exists(tmp_path):
                try:
                    os.remove(tmp_path)
                except OSError:
                    pass


def read_json_file(path: Path, default):
    lock = file_lock(path)
    with lock:
        if not path.exists():
            return default
        try:
            with open(path, "r", encoding="utf-8") as f:
                return json.load(f)
        except json.JSONDecodeError:
            raise HTTPException(status_code=500, detail=f"Datos corruptos en {path.name}")


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


def cache_products(products: list[dict]) -> None:
    global _products_cache, _products_mtime, _products_json_cache
    _products_cache = products
    _products_mtime = DATA_FILE.stat().st_mtime if DATA_FILE.exists() else None
    _products_json_cache = json.dumps(_products_cache or [], ensure_ascii=False)


def load_products() -> list[dict]:
    """Carga el listado de productos, reutilizando cache si el archivo no cambia."""
    global _products_cache, _products_mtime, _products_json_cache
    with _products_lock:
        if DATA_FILE.exists():
            mtime = DATA_FILE.stat().st_mtime
            if (
                _products_cache is not None
                and _products_mtime == mtime
                and _products_json_cache is not None
            ):
                return _products_cache
            data = read_json_file(DATA_FILE, []) or []
            cache_products(data)
            return _products_cache
        _products_cache = []
        _products_mtime = None
        _products_json_cache = "[]"
        return _products_cache


def save_products(products: list[dict]) -> list[dict]:
    with _products_lock:
        atomic_write_json(DATA_FILE, products)
        cache_products(products)
        return _products_cache or []


def products_json() -> str:
    """Devuelve la version en JSON pre-renderizada para inyectar en templates."""
    global _products_json_cache
    load_products()
    with _products_lock:
        if _products_json_cache is None:
            _products_json_cache = json.dumps(_products_cache or [], ensure_ascii=False)
        return _products_json_cache


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
                        "variant_id": f"{pid}-{slugify(color_name)}-{slugify(size_name)}",
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
            data = read_json_file(path, []) or []
        else:
            data = build_variants_from_products(load_products())
            atomic_write_json(path, data)
        _variants = {}
        for v in data:
            key = (
                str(v.get("product_id") or "").strip(),
                normalize_text(v.get("color", "")),
                normalize_text(v.get("size", "")),
            )
            if not key[0]:
                continue
            vid = v.get("id") or v.get("variant_id") or "-".join(key)
            _variants[key] = {
                "product_id": v.get("product_id"),
                "color": v.get("color"),
                "size": v.get("size"),
                "stock": int(v.get("stock") or 0),
                "id": vid,
                "variant_id": vid,
                "image": v.get("image") or "",
            }
        return _variants


def persist_variants_locked() -> None:
    payload = list(_variants.values())
    atomic_write_json(variants_file(), payload)


def get_variant(product_id: str, color: str, size: str) -> dict | None:
    key = (str(product_id).strip(), normalize_text(color), normalize_text(size))
    return load_variants().get(key)


def variants_by_product() -> Dict[str, list[dict]]:
    grouped: Dict[str, list[dict]] = {}
    for variant in load_variants().values():
        grouped.setdefault(variant["product_id"], []).append(variant)
    return grouped


def ensure_product_exists(product_id: str) -> dict:
    products = load_products()
    for p in products:
        pid = p.get("id") or slugify(p.get("name", ""))
        if str(pid) == str(product_id):
            return p
    raise HTTPException(status_code=400, detail=f"Producto {product_id} inexistente")


def save_product_variants(product_id: str, variants_payload: list[dict]) -> list[dict]:
    """Reemplaza las variantes de un producto con una nueva lista normalizada."""
    normalized = []
    for entry in variants_payload or []:
        color = entry.get("color") or ""
        size = entry.get("size") or ""
        stock = int(entry.get("stock") or 0)
        image = entry.get("image") or ""
        vid = entry.get("id") or entry.get("variant_id")
        if not color or not size:
            continue
        vid = vid or f"{product_id}-{slugify(color)}-{slugify(size)}"
        normalized.append(
            {
                "product_id": product_id,
                "color": color,
                "size": size,
                "stock": max(0, stock),
                "id": vid,
                "variant_id": vid,
                "image": image,
            }
        )
    with _variants_lock:
        load_variants()
        to_delete = [key for key, val in _variants.items() if val["product_id"] == product_id]
        for key in to_delete:
            _variants.pop(key, None)
        for v in normalized:
            key = (v["product_id"], normalize_text(v["color"]), normalize_text(v["size"]))
            _variants[key] = v
        persist_variants_locked()
    return normalized


def find_variant_by_id(variant_id: str) -> Tuple[Tuple[str, str, str], dict] | tuple[None, None]:
    variants = load_variants()
    for key, variant in variants.items():
        if str(variant.get("id")) == str(variant_id) or str(variant.get("variant_id")) == str(variant_id):
            return key, variant
    return None, None


def orders_file() -> Path:
    ORDERS_FILE.parent.mkdir(parents=True, exist_ok=True)
    return ORDERS_FILE


def load_orders() -> list[dict]:
    with _orders_lock:
        data = read_json_file(orders_file(), [])
        if not isinstance(data, list):
            return []
        return data


def persist_orders(orders: list[dict]) -> list[dict]:
    with _orders_lock:
        atomic_write_json(orders_file(), orders)
    return orders


def add_order_record(order: dict) -> dict:
    with _orders_lock:
        orders = load_orders()
        orders.append(order)
        persist_orders(orders)
        return order


def update_order_status(order_id: str, status: str) -> dict:
    status = status.lower()
    if status not in {"pending", "confirmed", "cancelled"}:
        raise HTTPException(status_code=400, detail="Estado invalido")
    with _orders_lock:
        orders = load_orders()
        target = None
        for order in orders:
            if str(order.get("id")) == str(order_id):
                target = order
                break
        if not target:
            raise HTTPException(status_code=404, detail="Pedido no encontrado")
        previous = target.get("status", "pending").lower()
        if previous == status:
            return target
        target["status"] = status
        persist_orders(orders)
        return target


def restore_stock(order: dict) -> None:
    """Devuelve stock si el pedido se cancela // ROMIX ADMIN"""
    if not order:
        return
    items = order.get("items") or []
    with _variants_lock:
        variants = load_variants()
        for item in items:
            pid = str(item.get("product_id") or item.get("productId") or "").strip()
            color = item.get("color") or ""
            size = item.get("size") or ""
            qty = max(0, int(item.get("qty") or 0))
            if not pid or not color or not size or qty <= 0:
                continue
            key = (pid, normalize_text(color), normalize_text(size))
            existing = variants.get(key)
            if existing:
                existing["stock"] = max(0, int(existing.get("stock", 0))) + qty
            else:
                vid = f"{pid}-{slugify(color)}-{slugify(size)}"
                variants[key] = {
                    "product_id": pid,
                    "color": color,
                    "size": size,
                    "stock": qty,
                    "id": vid,
                    "variant_id": vid,
                    "image": "",
                }
        persist_variants_locked()


def price_snapshot(product: dict) -> float:
    if not product:
        return 0.0
    if isinstance(product.get("price"), (int, float)):
        return float(product.get("price"))
    if isinstance(product.get("priceByGroup"), dict):
        values = list(product["priceByGroup"].values())
        if values:
            try:
                return float(values[0])
            except Exception:
                return 0.0
    return 0.0


def normalize_order_items(items: List[dict]) -> List[dict]:
    normalized = []
    products_map = {(p.get("id") or slugify(p.get("name", ""))): p for p in load_products()}
    for it in items:
        pid = str(it.get("productId") or it.get("product_id") or "").strip()
        color = it.get("color") or ""
        size = it.get("size") or ""
        qty = int(it.get("qty") or 0)
        product = products_map.get(pid)
        normalized.append(
            {
                "product_id": pid,
                "color": color,
                "size": size,
                "qty": qty,
                "price_snapshot": price_snapshot(product),
                "name_snapshot": (product or {}).get("name", ""),
            }
        )
    return normalized

def validate_and_reserve(items: List[dict]) -> Tuple[List[dict], List[dict]]:
    """Valida stock y retorna (updates, order_items) sin persistir todavía."""
    if not items or not isinstance(items, list):
        raise HTTPException(status_code=400, detail="items es requerido")
    structure_errors = []
    for it in items:
        pid = str(it.get("productId") or it.get("product_id") or "").strip()
        color = it.get("color") or ""
        size = it.get("size") or ""
        qty = int(it.get("qty") or 0)
        if not pid or not color or not size or qty <= 0:
            structure_errors.append({"productId": pid, "reason": "productId, color, size y qty son obligatorios"})
    if structure_errors:
        raise HTTPException(status_code=400, detail={"message": "Items invalidos", "items": structure_errors})

    updates: list[dict] = []
    order_items: list[dict] = []
    insufficient: list[dict] = []

    with _variants_lock:
        variants = load_variants()
        for it in items:
            pid = str(it.get("productId") or it.get("product_id") or "").strip()
            color = it.get("color") or ""
            size = it.get("size") or ""
            qty = int(it.get("qty") or 0)
            ensure_product_exists(pid)
            key = (pid, normalize_text(color), normalize_text(size))
            variant = variants.get(key)
            if not variant:
                raise HTTPException(
                    status_code=400,
                    detail=f"No existe variante para productId={pid}, color={color}, talle={size}",
                )
            if variant["stock"] < qty:
                insufficient.append(
                    {
                        "productId": pid,
                        "color": variant["color"],
                        "size": variant["size"],
                        "requested": qty,
                        "available": variant["stock"],
                    }
                )
        if insufficient:
            raise HTTPException(status_code=409, detail={"message": "Stock insuficiente", "items": insufficient})

        for it in items:
            pid = str(it.get("productId") or it.get("product_id") or "").strip()
            color = it.get("color") or ""
            size = it.get("size") or ""
            qty = int(it.get("qty") or 0)
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
                    "price_snapshot": None,
                }
            )
        persist_variants_locked()
    return updates, order_items


def sign_token(username: str) -> str:
    payload = {"u": username, "exp": int(time.time()) + ADMIN_TOKEN_TTL}
    raw = json.dumps(payload, separators=(",", ":"))
    sig = hmac.new(ADMIN_SECRET.encode("utf-8"), raw.encode("utf-8"), hashlib.sha256).hexdigest()
    token = base64.urlsafe_b64encode(raw.encode("utf-8")).decode("utf-8").rstrip("=")
    return f"{token}.{sig}"


def verify_token(token: str) -> str | None:
    if not token or "." not in token:
        return None
    unsigned, sig = token.rsplit(".", 1)
    try:
        raw = base64.urlsafe_b64decode(unsigned + "==").decode("utf-8")
        expected_sig = hmac.new(ADMIN_SECRET.encode("utf-8"), raw.encode("utf-8"), hashlib.sha256).hexdigest()
        if not hmac.compare_digest(expected_sig, sig):
            return None
        payload = json.loads(raw)
        if payload.get("exp", 0) < int(time.time()):
            return None
        return payload.get("u")
    except Exception:
        return None


def require_admin(request: Request) -> str:
    auth_header = request.headers.get("Authorization", "")
    token = None
    if auth_header.lower().startswith("bearer "):
        token = auth_header.split(" ", 1)[1].strip()
    if not token:
        token = request.cookies.get(ADMIN_COOKIE_NAME, "")
    user = verify_token(token)
    if not user:
        raise HTTPException(status_code=401, detail="No autorizado")
    return user


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
    orders_file()


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


@app.get("/api/variants")
def list_variants():
    return list(load_variants().values())


@app.post("/api/orders")
def create_order(body: dict):
    items = body.get("items") if isinstance(body, dict) else None
    customer_name = (body.get("customerName") if isinstance(body, dict) else "") or ""
    whatsapp = (body.get("whatsapp") if isinstance(body, dict) else "") or ""
    notes = (body.get("notes") if isinstance(body, dict) else "") or ""
    updates, order_items = validate_and_reserve(items)
    normalized_items = normalize_order_items(order_items)
    for idx, item in enumerate(order_items):
        if idx < len(normalized_items):
            item.update(normalized_items[idx])
    order_id = secrets.token_hex(8)
    order_record = {
        "id": order_id,
        "created_at": int(time.time()),
        "status": "pending",
        "customer_name": customer_name,
        "whatsapp": whatsapp,
        "notes": notes,
        "items": normalized_items,
    }
    add_order_record(order_record)
    return {"orderId": order_id, "updatedVariants": updates, "items": normalized_items}

@app.post("/api/admin/login")
def admin_login(body: dict, response: Response):
    username = (body or {}).get("username") or (body or {}).get("user") or ""
    password = (body or {}).get("password") or ""
    if username != ADMIN_USER or password != ADMIN_PASS:
        raise HTTPException(status_code=401, detail="Credenciales invalidas")
    token = sign_token(username)
    response = JSONResponse({"token": token, "user": username})
    response.set_cookie(
        ADMIN_COOKIE_NAME,
        token,
        httponly=True,
        secure=False,
        samesite="lax",
        max_age=ADMIN_TOKEN_TTL,
        path="/",
    )
    return response


@app.get("/admin", response_class=HTMLResponse)
def admin_page(request: Request):
    # Protegemos la vista pero seguimos entregando el HTML de login/dashboard
    status = 200
    try:
        require_admin(request)
    except HTTPException:
        status = 401
    admin_path = PUBLIC_DIR / "admin" / "admin.html"
    if not admin_path.exists():
        raise HTTPException(status_code=404, detail="Panel no disponible")
    content = admin_path.read_text(encoding="utf-8")
    return HTMLResponse(content, status_code=status)


@app.get("/api/admin/dashboard")
def admin_dashboard(request: Request):
    require_admin(request)
    orders = load_orders()
    variants = load_variants()
    products = load_products()
    pending = len([o for o in orders if o.get("status") == "pending"])
    confirmed = len([o for o in orders if o.get("status") == "confirmed"])
    active_products = len([p for p in products if str(p.get("active", True)).lower() != "false"])
    low_stock = len([v for v in variants.values() if int(v.get("stock", 0)) <= LOW_STOCK_THRESHOLD])
    return {
        "pending_orders": pending,
        "confirmed_orders": confirmed,
        "active_products": active_products,
        "low_stock_variants": low_stock,
    }


@app.get("/api/admin/products")
def admin_products(request: Request):
    require_admin(request)
    grouped_variants = variants_by_product()
    data = []
    for p in load_products():
        pid = p.get("id") or slugify(p.get("name", ""))
        copy = dict(p)
        copy["id"] = pid
        copy["variants"] = grouped_variants.get(pid, [])
        data.append(copy)
    return data


@app.post("/api/admin/products")
def admin_create_product(request: Request, body: dict):
    require_admin(request)
    if not isinstance(body, dict):
        raise HTTPException(status_code=400, detail="Body invalido")
    products = load_products()
    product = dict(body)
    product_id = product.get("id") or slugify(product.get("name", ""))
    product["id"] = product_id
    for existing in products:
        existing_id = existing.get("id") or slugify(existing.get("name", ""))
        if existing_id == product_id:
            raise HTTPException(status_code=400, detail="Ya existe un producto con ese id")
    products.append(product)
    save_products(products)
    variants_payload = product.get("variants")
    if variants_payload:
        save_product_variants(product_id, variants_payload if isinstance(variants_payload, list) else [])
    return product


@app.put("/api/admin/products/{product_id}")
def admin_update_product(request: Request, product_id: str, body: dict):
    require_admin(request)
    if not isinstance(body, dict):
        raise HTTPException(status_code=400, detail="Body invalido")
    products = load_products()
    updated = None
    for idx, prod in enumerate(products):
        pid = prod.get("id") or slugify(prod.get("name", ""))
        if str(pid) == str(product_id):
            merged = dict(prod)
            merged.update(body)
            merged["id"] = pid
            products[idx] = merged
            updated = merged
            break
    if not updated:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    save_products(products)
    if "variants" in body and isinstance(body.get("variants"), list):
        save_product_variants(product_id, body.get("variants") or [])
    return updated


@app.patch("/api/admin/products/{product_id}/active")
def admin_toggle_product(request: Request, product_id: str, body: dict):
    require_admin(request)
    desired = body.get("active") if isinstance(body, dict) else None
    products = load_products()
    updated = None
    for idx, prod in enumerate(products):
        pid = prod.get("id") or slugify(prod.get("name", ""))
        if str(pid) == str(product_id):
            prod_copy = dict(prod)
            prod_copy["active"] = bool(desired) if desired is not None else not bool(prod.get("active", True))
            products[idx] = prod_copy
            updated = prod_copy
            break
    if not updated:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    save_products(products)
    return updated


@app.get("/api/admin/variants")
def admin_variants(request: Request):
    require_admin(request)
    return list(load_variants().values())


@app.post("/api/admin/variants")
def admin_create_variant(request: Request, body: dict):
    require_admin(request)
    if not isinstance(body, dict):
        raise HTTPException(status_code=400, detail="Body invalido")
    pid = body.get("product_id") or body.get("productId")
    color = body.get("color") or ""
    size = body.get("size") or ""
    stock = int(body.get("stock") or 0)
    image = body.get("image") or ""
    if not pid or not color or not size:
        raise HTTPException(status_code=400, detail="product_id, color y size son obligatorios")
    ensure_product_exists(pid)
    vid = body.get("id") or body.get("variant_id") or f"{pid}-{slugify(color)}-{slugify(size)}"
    variant = {
        "product_id": str(pid),
        "color": color,
        "size": size,
        "stock": max(0, stock),
        "id": vid,
        "variant_id": vid,
        "image": image,
    }
    with _variants_lock:
        load_variants()
        key = (variant["product_id"], normalize_text(color), normalize_text(size))
        _variants[key] = variant
        persist_variants_locked()
    return variant


@app.put("/api/admin/variants/{variant_id}")
def admin_update_variant(request: Request, variant_id: str, body: dict):
    require_admin(request)
    if not isinstance(body, dict):
        raise HTTPException(status_code=400, detail="Body invalido")
    key, existing = find_variant_by_id(variant_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Variante no encontrada")
    pid = body.get("product_id") or body.get("productId") or existing["product_id"]
    color = body.get("color") or existing["color"]
    size = body.get("size") or existing["size"]
    stock = int(body.get("stock") if "stock" in body else existing.get("stock", 0))
    image = body.get("image") if "image" in body else existing.get("image", "")
    ensure_product_exists(pid)
    vid = body.get("id") or body.get("variant_id") or existing.get("id") or variant_id
    new_key = (str(pid), normalize_text(color), normalize_text(size))
    with _variants_lock:
        load_variants()
        if key and key in _variants and key != new_key:
            _variants.pop(key, None)
        _variants[new_key] = {
            "product_id": str(pid),
            "color": color,
            "size": size,
            "stock": max(0, stock),
            "id": vid,
            "variant_id": vid,
            "image": image or "",
        }
        persist_variants_locked()
        return _variants[new_key]


@app.patch("/api/admin/variants/{variant_id}/stock")
def admin_patch_variant_stock(request: Request, variant_id: str, body: dict):
    require_admin(request)
    if not isinstance(body, dict):
        raise HTTPException(status_code=400, detail="Body invalido")
    key, variant = find_variant_by_id(variant_id)
    if not variant:
        raise HTTPException(status_code=404, detail="Variante no encontrada")
    new_stock = body.get("stock")
    if new_stock is None:
        raise HTTPException(status_code=400, detail="stock requerido")
    with _variants_lock:
        load_variants()
        if key and key in _variants:
            _variants[key]["stock"] = max(0, int(new_stock))
            persist_variants_locked()
            return _variants[key]
    raise HTTPException(status_code=404, detail="Variante no encontrada")


@app.get("/api/admin/orders")
def admin_orders(request: Request, status: str | None = None, q: str | None = None):
    require_admin(request)
    data = load_orders()
    if status:
        status = status.lower()
        data = [o for o in data if str(o.get("status", "")).lower() == status]
    if q:
        qn = q.lower().strip()
        data = [
            o
            for o in data
            if qn in str(o.get("customer_name", "")).lower()
            or qn in str(o.get("whatsapp", "")).lower()
            or qn in str(o.get("id", "")).lower()
        ]
    data.sort(key=lambda o: o.get("created_at", 0), reverse=True)
    return data


@app.get("/api/admin/orders/{order_id}")
def admin_order_detail(request: Request, order_id: str):
    require_admin(request)
    for order in load_orders():
        if str(order.get("id")) == str(order_id):
            return order
    raise HTTPException(status_code=404, detail="Pedido no encontrado")


@app.patch("/api/admin/orders/{order_id}")
def admin_order_status(request: Request, order_id: str, body: dict):
    require_admin(request)
    status = (body or {}).get("status") if isinstance(body, dict) else None
    if not status:
        raise HTTPException(status_code=400, detail="status requerido")
    status = str(status).lower()
    with _orders_lock:
        orders = load_orders()
        target = None
        for order in orders:
            if str(order.get("id")) == str(order_id):
                target = order
                break
        if not target:
            raise HTTPException(status_code=404, detail="Pedido no encontrado")
        prev = target.get("status", "pending").lower()
        if status == "cancelled" and prev != "cancelled":
            restore_stock(target)
        target["status"] = status
        persist_orders(orders)
        return target


# Servir estaticos desde el frontend publico
app.mount("/", StaticFiles(directory=str(PUBLIC_DIR), html=True), name="static")
