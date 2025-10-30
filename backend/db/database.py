import os
import logging
from typing import Generator, Optional

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base


logger = logging.getLogger("db")


def _load_env_file(path: str = ".env") -> None:
    """
    Lightweight .env loader without extra deps. Only sets variables
    not already present in the environment.
    """
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


def _build_database_url() -> Optional[str]:
    # Prefer a full DATABASE_URL if provided
    url = os.getenv("DATABASE_URL")
    if url:
        return url

    # Otherwise, attempt to build from parts
    user = os.getenv("DB_USER")
    password = os.getenv("DB_PASSWORD")
    host = os.getenv("DB_HOST", "localhost")
    port = os.getenv("DB_PORT", "3306")
    name = os.getenv("DB_NAME")
    if user and password and name:
        # Default to PyMySQL driver
        return f"mysql+pymysql://{user}:{password}@{host}:{port}/{name}?charset=utf8mb4"
    return None


DATABASE_URL = _build_database_url()
if not DATABASE_URL:
    # Keep a safe default that still lets the app start for development
    # Users should provide a proper MySQL URL in production
    logger.warning(
        "DATABASE_URL/DB_* no configurado. Usando SQLite local para desarrollo.")
    DATABASE_URL = "sqlite:///./romix_dev.db"


connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}

engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,
    future=True,
    connect_args=connect_args,
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine, future=True)
Base = declarative_base()


def get_db() -> Generator:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db() -> None:
    """Create tables if they don't exist."""
    try:
        from backend.models import pedido  # ensure models are imported
        from backend.models import inventario  # ensure inventario table
        Base.metadata.create_all(bind=engine)
    except Exception as e:
        logger.exception("Error al inicializar la base de datos: %s", e)
