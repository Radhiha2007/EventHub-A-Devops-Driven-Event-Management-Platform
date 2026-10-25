#!/bin/bash

# Start the Celery worker in the background.
celery -A app.celery_app:celery_app worker --loglevel=info &
CELERY_PID=$!

# Start the FastAPI application in the background.
uvicorn app.main:app --host 0.0.0.0 --port "${PORT:-8000}" &
UVICORN_PID=$!

# Stop both processes when the container shuts down.
cleanup() {
    trap - EXIT INT TERM
    kill "$CELERY_PID" "$UVICORN_PID" 2>/dev/null || true
    wait "$CELERY_PID" "$UVICORN_PID" 2>/dev/null || true
}

trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM

# Keep the container alive while both processes run.
# If either process exits, the container will stop and can be restarted.
wait -n "$CELERY_PID" "$UVICORN_PID"
STATUS=$?

# Treat an unexpected clean exit as a failure too.
if [ "$STATUS" -eq 0 ]; then
    STATUS=1
fi

exit "$STATUS"
