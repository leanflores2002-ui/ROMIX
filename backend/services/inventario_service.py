import logging
from typing import Any, Dict, List

from sqlalchemy import select
from sqlalchemy.orm import Session

from backend.models.inventario import InventarioItem


logger = logging.getLogger("inventario")


def _norm(value: Any) -> str:
    if value is None:
        return ""
    return str(value).strip()


def descontar_stock_por_pedido(db: Session, productos: List[Dict[str, Any]]) -> None:
    """
    Descuenta stock por cada producto del pedido.
    Productos: lista de dicts con posibles claves:
      - nombre / producto
      - color
      - talle / size
      - cantidad / qty (default 1)
    Crea el item en inventario si no existe (stock inicial 0) y evita negativos.
    """
    for p in productos or []:
        if not isinstance(p, dict):
            continue

        nombre = _norm(p.get("nombre") or p.get("producto") or p.get("name"))
        color = _norm(p.get("color"))
        talle = _norm(p.get("talle") or p.get("size"))
        try:
            cantidad = int(p.get("cantidad") or p.get("qty") or 1)
        except Exception:
            cantidad = 1
        if not nombre:
            logger.warning("Producto sin nombre, se ignora en inventario: %s", p)
            continue

        item = db.execute(
            select(InventarioItem).where(
                InventarioItem.nombre == nombre,
                InventarioItem.color == color,
                InventarioItem.talle == talle,
            )
        ).scalar_one_or_none()

        if item is None:
            item = InventarioItem(nombre=nombre, color=color, talle=talle, stock=0)
            db.add(item)
            # no flush yet; we'll update below

        nuevo_stock = max(0, (item.stock or 0) - max(0, cantidad))
        if (item.stock or 0) < cantidad:
            logger.warning(
                "Stock insuficiente para %s (color=%s, talle=%s). Actual: %s, pedido: %s",
                nombre,
                color,
                talle,
                item.stock,
                cantidad,
            )
        item.stock = nuevo_stock
    try:
        db.commit()
    except Exception:
        db.rollback()
        logger.exception("Error al actualizar inventario para el pedido")

