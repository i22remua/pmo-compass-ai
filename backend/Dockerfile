FROM python:3.13-slim
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 PORT=8000
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt && useradd --create-home app
COPY app ./app
USER app
EXPOSE 8000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s CMD python -c "import os, urllib.request; urllib.request.urlopen('http://127.0.0.1:' + os.environ.get('PORT', '8000') + '/api/v1/health', timeout=4)"
CMD ["sh", "-c", "exec python -m uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000} --workers 1"]
