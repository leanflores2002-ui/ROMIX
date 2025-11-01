from __future__ import annotations

import json
import os
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Query


router = APIRouter(prefix="/api", tags=["products"])


def _project_root() -> str:
    return os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))


def _frontend_products_path() -> str:
    return os.path.join(_project_root(), "frontend", "products.json")


def _norm(s: str) -> str:
    try:
        import unicodedata

        return (
            unicodedata.normalize("NFD", str(s or ""))
            .encode("ascii", "ignore")
            .decode("ascii")
            .lower()
        )
    except Exception:
        return str(s or "").lower()


def _normalize_section(s: str) -> str:
    v = str(s or "").lower().strip()
    if not v:
        return ""
    if v in ("mujer", "hombre", "ninos"):
        return v
    if "niños" in v or "niÃ±os" in v or "ni��os" in v:
        return "ninos"
    return v


@router.get("/products")
def get_products(
    section: Optional[str] = Query(None),
    q: Optional[str] = Query(None),
    sort: str = Query("relevance"),
    page: int = Query(1, ge=1),
    pageSize: int = Query(24, ge=1, le=200),
) -> Dict[str, Any]:
    path = _frontend_products_path()
    try:
        with open(path, "r", encoding="utf-8", errors="ignore") as f:
            data = json.load(f)
        items: List[Dict[str, Any]] = list(data) if isinstance(data, list) else []
    except Exception:
        return {"items": [], "total": 0}

    # Filter
    if section:
        sec = _normalize_section(section)
        items = [p for p in items if _normalize_section(p.get("section")) == sec]
    if q:
        qn = _norm(q)
        items = [p for p in items if qn in _norm(p.get("name")) or qn in _norm(p.get("type"))]

    # Sort
    if sort == "price-asc":
        items.sort(key=lambda p: float(p.get("price") or 0))
    elif sort == "price-desc":
        items.sort(key=lambda p: float(p.get("price") or 0), reverse=True)
    elif sort == "newest":
        def ts(p: Dict[str, Any]) -> int:
            for k in ("created_at", "createdAt"):
                v = p.get(k)
                if v:
                    try:
                        import datetime as _dt

                        return int(_dt.datetime.fromisoformat(str(v)).timestamp())
                    except Exception:
                        pass
            return 0

        items.sort(key=ts, reverse=True)

    total = len(items)
    start = (max(1, page) - 1) * pageSize
    end = start + pageSize
    page_items = items[start:end]
    return {"items": page_items, "total": total}

