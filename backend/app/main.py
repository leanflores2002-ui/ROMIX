from __future__ import annotations

import json
import os
import re
import unicodedata
from pathlib import Path

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
templates = Jinja2Templates(directory=str(PUBLIC_DIR))


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
    if not DATA_FILE.exists():
        return []
    with open(DATA_FILE, "r", encoding="utf-8") as f:
        data = json.load(f)
    return data or []


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
    products = load_products()
    return templates.TemplateResponse(
        "index.html",
        {
            "request": request,
            "products_json": json.dumps(products, ensure_ascii=False),
            "query": q or "",
        },
    )


@app.get("/catalogo", response_class=HTMLResponse)
def catalog_page(request: Request, q: str | None = None):
    products = load_products()
    return templates.TemplateResponse(
        "catalogo.html",
        {
            "request": request,
            "products_json": json.dumps(products, ensure_ascii=False),
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
            "products_json": json.dumps(products, ensure_ascii=False),
            "slug": slug,
        },
    )


# Servir estaticos desde el frontend publico
app.mount("/", StaticFiles(directory=str(PUBLIC_DIR), html=True), name="static")
