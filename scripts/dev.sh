python -m venv .venv
source .venv/bin/activate
python -m pip install --only-binary=:all: -r backend/requirements.txt
uvicorn backend.app.main:app --reload --port 8000
