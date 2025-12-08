FROM python:3.11-slim

WORKDIR /app

# Instala dependencias del backend
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copia el resto del proyecto
COPY . /app

# Puerto expuesto por uvicorn / FastAPI
ENV PORT=8080

CMD ["uvicorn", "backend.app.main:app", "--host", "0.0.0.0", "--port", "8080"]
