FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PORT=8000

WORKDIR /app

# Instalación de dependencias del backend
COPY backend/requirements.txt ./backend/requirements.txt
RUN pip install --no-cache-dir -r backend/requirements.txt

# Copiamos todo el proyecto (frontend + backend)
COPY . .

# Garantizar carpetas de datos
RUN mkdir -p backend/data frontend/public/assets/data

EXPOSE 8000

# Ejecutar FastAPI con la variable PORT que provee Railway
CMD ["sh", "-c", "uvicorn backend.app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
