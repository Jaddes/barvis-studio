# BARVIS leads API: samo standardna Python biblioteka, bez pip paketa.
FROM python:3.13-slim

ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 DB_PATH=/data/leads.sqlite3 PORT=8000
RUN useradd --system --uid 10001 --home /nonexistent --shell /usr/sbin/nologin leads \
 && mkdir /data && chown leads /data
WORKDIR /app
COPY leads_api.py .
USER leads
EXPOSE 8000
HEALTHCHECK --interval=60s --timeout=5s CMD python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8000/healthz', timeout=4)"
CMD ["python", "leads_api.py"]
