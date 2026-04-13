#!/usr/bin/env bash
set -e

# Start backend
cd backend
uv sync --quiet
uv run uvicorn main:app --reload --port 8001 &
BACKEND_PID=$!
cd ..

# Start frontend
cd frontend
npm install --silent
npm run dev &
FRONTEND_PID=$!
cd ..

echo "Backend running on http://localhost:8001"
echo "Frontend running on http://localhost:5173"
echo ""
echo "Press Ctrl+C to stop both servers."

cleanup() {
  kill $BACKEND_PID $FRONTEND_PID 2>/dev/null
  exit 0
}
trap cleanup INT TERM

wait
