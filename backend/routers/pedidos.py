from fastapi import APIRouter, Depends, status
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
import logging

from backend.db.database import get_db
from backend.models.pedido import PedidoCreate, Pedido, map_pedido_create_to_orm
from backend.services.notificacion_service import enviar_notificacion_pedido


router = APIRouter(prefix="/api", tags=["pedidos"])
logger = logging.getLogger("pedidos")


@router.post("/pedido")
def crear_pedido(pedido: PedidoCreate, db: Session = Depends(get_db)):
    try:
        registro = map_pedido_create_to_orm(pedido)
        db.add(registro)
        db.commit()
        db.refresh(registro)
    except Exception as e:
        db.rollback()
        logger.exception("Error guardando pedido en DB: %s", e)
        return JSONResponse(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                            content={"error": "No se pudo guardar el pedido"})

    try:
        ok = enviar_notificacion_pedido(
            nombre_cliente=pedido.nombre_cliente,
            telefono=pedido.telefono,
            productos=pedido.productos,
            metodo_entrega=pedido.metodo_entrega,
            estado=pedido.estado,
        )
        if not ok:
            # Pedido quedó guardado, pero falló notificación
            return {"error": "Pedido guardado, pero no se pudo enviar la notificación"}
        return {"mensaje": "Pedido recibido y enviado correctamente"}
    except Exception as e:
        logger.exception("Error durante el envío de notificación: %s", e)
        # Aún así el pedido está guardado
        return {"error": "Pedido guardado, pero ocurrió un error al enviar la notificación"}
