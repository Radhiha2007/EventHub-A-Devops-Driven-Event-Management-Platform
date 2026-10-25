FROM python:3.12-slim

WORKDIR /app

ENV PYTHONPATH=/app

COPY requirements.txt .

RUN pip install --no-cache-dir -r requirements.txt

COPY app ./app
COPY tests ./tests
COPY migrations ./migrations
COPY start.sh ./start.sh

RUN chmod +x ./start.sh

EXPOSE 8000

CMD ["./start.sh"]
