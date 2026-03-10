.PHONY: dev dev-backend dev-frontend install test test-backend test-frontend

dev-backend:
	cd backend && uv run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

dev-frontend:
	cd frontend && npx expo start --web --port 8081

dev:
	$(MAKE) dev-backend & $(MAKE) dev-frontend & wait

install:
	cd backend && uv sync
	cd frontend && npm install

test: test-backend test-frontend

test-backend:
	cd backend && uv run pytest -v

test-frontend:
	cd frontend && npx jest --verbose
