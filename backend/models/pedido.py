from __future__ import annotations

import json
from datetime import datetime
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field, validator
from sqlalchemy import Column, Integer, String, DateTime, Text
from sqlalchemy.dialects.mysql import JSON as MySQLJSON
from sqlalchemy.types import JSON as SAJSON

from backend.db.database import Base


class Pedido(Base):
    __tablename__ = "pedidos"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    nombre_cliente = Column(String(255), nullable=False)
    telefono = Column(String(50), nullable=False, index=True)
    # Use JSON when available, else Text fallback for SQLite/others
    try:
        productos = Column(SAJSON().with_variant(MySQLJSON, "mysql"), nullable=False)
    except Exception:
        productos = Column(Text, nullable=False)
    metodo_entrega = Column(String(50), nullable=False)
    estado = Column(String(50), nullable=False, default="pendiente", server_default="pendiente")
    creado_en = Column(DateTime, nullable=False, default=datetime.utcnow)


class PedidoCreate(BaseModel):
    nombre_cliente: str = Field(..., min_length=2, max_length=255)
    telefono: str = Field(..., min_length=6, max_length=50)
    productos: List[Dict[str, Any]] = Field(..., min_items=1)
    metodo_entrega: str = Field(..., min_length=3, max_length=50)
    estado: str = Field(default="pendiente", min_length=3, max_length=50)

    @validator("productos")
    def validar_productos(cls, v: List[Dict[str, Any]]):
        if not isinstance(v, list) or len(v) == 0:
            raise ValueError("productos debe ser una lista con al menos un item")
        # Validación liviana: asegurar que cada item sea dict
        for item in v:
            if not isinstance(item, dict):
                raise ValueError("Cada producto debe ser un objeto/dict")
        return v

    class Config:
        anystr_strip_whitespace = True
        schema_extra = {
            "example": {
                "nombre_cliente": "Juan Perez",
                "telefono": "+5491122334455",
                "productos": [
                    {"nombre": "Remera", "talle": "M", "color": "Negro", "cantidad": 2},
                    {"nombre": "Pantalón", "talle": "42", "color": "Azul", "cantidad": 1},
                ],
                "metodo_entrega": "envio",
                "estado": "pendiente",
            }
        }


def map_pedido_create_to_orm(dto: PedidoCreate) -> Pedido:
    data = dto.dict()
    productos_value = data["productos"]
    # If DB uses Text, store as JSON string. If JSON type, SQLAlchemy handles list/dict natively
    return Pedido(
        nombre_cliente=data["nombre_cliente"],
        telefono=data["telefono"],
        productos=productos_value,
        metodo_entrega=data["metodo_entrega"],
        estado=data.get("estado", "pendiente"),
    )

