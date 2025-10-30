from __future__ import annotations

from sqlalchemy import Column, Integer, String, UniqueConstraint

from backend.db.database import Base


class InventarioItem(Base):
    __tablename__ = "inventario"
    __table_args__ = (
        UniqueConstraint("nombre", "color", "talle", name="uq_inventario_nombre_color_talle"),
    )

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    nombre = Column(String(255), nullable=False, index=True)
    color = Column(String(100), nullable=True, index=True)
    talle = Column(String(50), nullable=True, index=True)
    stock = Column(Integer, nullable=False, default=0)

