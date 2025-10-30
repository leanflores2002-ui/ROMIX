import json
import logging
import os
from datetime import datetime
from typing import Dict, List, Any, Optional

import requests
from urllib.parse import quote_plus


logger = logging.getLogger("notificacion")


def _load_env_file(path: str = ".env") -> None:
    try:
        if not os.path.exists(path):
            return
        with open(path, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if not line or line.startswith("#"):
                    continue
                if "=" not in line:
                    continue
                key, val = line.split("=", 1)
                key = key.strip()
                val = val.strip().strip('"').strip("'")
                os.environ.setdefault(key, val)
    except Exception as e:
        logger.warning("No se pudo cargar .env: %s", e)


_load_env_file()


def formatear_pedido(
    nombre_cliente: str,
    telefono: str,
    productos: List[Dict[str, Any]],
    metodo_entrega: str,
    estado: str = "pendiente",
) -> str:
    lineas = [
        "Nuevo pedido ROMIX",
        f"Cliente: {nombre_cliente}",
        f"Teléfono: {telefono}",
        f"Método de entrega: {metodo_entrega}",
        "Productos:",
    ]
    for p in productos:
        if isinstance(p, dict):
            nombre = p.get("nombre") or p.get("producto") or "Producto"
            talle = p.get("talle") or p.get("tamaño") or p.get("size") or "-"
            color = p.get("color") or "-"
            cantidad = p.get("cantidad") or p.get("qty") or 1
            lineas.append(f"- {nombre} | Talle: {talle} | Color: {color} | Cant: {cantidad}")
        else:
            lineas.append(f"- {p}")
    lineas.append(f"Estado: {estado}")
    lineas.append(f"Fecha: {datetime.now().strftime('%Y-%m-%d %H:%M')}")
    return "\n".join(lineas)


def _send_callmebot_whatsapp(texto: str) -> bool:
    api_key = os.getenv("CALLMEBOT_API_KEY") or os.getenv("API_KEY")
    phone = os.getenv("CALLMEBOT_PHONE") or os.getenv("PHONE")
    if not api_key or not phone:
        logger.error("Credenciales CallMeBot faltantes (CALLMEBOT_API_KEY/CALLMEBOT_PHONE)")
        return False
    url = f"https://api.callmebot.com/whatsapp.php?phone={quote_plus(phone)}&text={quote_plus(texto)}&apikey={quote_plus(api_key)}"
    try:
        resp = requests.get(url, timeout=20)
        if resp.status_code == 200 and "Message queued" in resp.text:
            return True
        logger.error("Falló CallMeBot: %s %s", resp.status_code, resp.text[:200])
        return False
    except Exception as e:
        logger.exception("Error enviando WhatsApp por CallMeBot: %s", e)
        return False


def _send_telegram(texto: str) -> bool:
    token = os.getenv("TELEGRAM_TOKEN")
    chat_id = os.getenv("TELEGRAM_CHAT_ID")
    if not token or not chat_id:
        logger.error("Credenciales Telegram faltantes (TELEGRAM_TOKEN/TELEGRAM_CHAT_ID)")
        return False
    url = f"https://api.telegram.org/bot{token}/sendMessage"
    payload = {"chat_id": chat_id, "text": texto}
    try:
        resp = requests.post(url, json=payload, timeout=20)
        if resp.status_code == 200 and resp.json().get("ok"):
            return True
        logger.error("Falló Telegram: %s %s", resp.status_code, resp.text[:200])
        return False
    except Exception as e:
        logger.exception("Error enviando Telegram: %s", e)
        return False


def enviar_notificacion_pedido(
    nombre_cliente: str,
    telefono: str,
    productos: List[Dict[str, Any]],
    metodo_entrega: str,
    estado: str = "pendiente",
) -> bool:
    texto = formatear_pedido(
        nombre_cliente=nombre_cliente,
        telefono=telefono,
        productos=productos,
        metodo_entrega=metodo_entrega,
        estado=estado,
    )

    preferencia = (os.getenv("NOTIFICATION_PROVIDER") or "").lower().strip()
    # Strategy: if preference set, use it; else try WhatsApp first then Telegram
    if preferencia == "whatsapp":
        return _send_callmebot_whatsapp(texto)
    if preferencia == "telegram":
        return _send_telegram(texto)

    # Auto-select
    if os.getenv("CALLMEBOT_API_KEY") and os.getenv("CALLMEBOT_PHONE"):
        ok = _send_callmebot_whatsapp(texto)
        if ok:
            return True
    if os.getenv("TELEGRAM_TOKEN") and os.getenv("TELEGRAM_CHAT_ID"):
        ok = _send_telegram(texto)
        if ok:
            return True

    logger.error("No hay proveedor de notificación configurado correctamente")
    return False

