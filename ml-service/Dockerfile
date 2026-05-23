FROM python:3.10-slim

WORKDIR /app

# Install system dependencies for build libraries
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .

RUN pip install --no-cache-dir -r requirements.txt

COPY app/ ./app/
COPY scripts/ ./scripts/

# Generate data and pre-train model on build
RUN python scripts/generate_dataset.py && python scripts/train.py

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
