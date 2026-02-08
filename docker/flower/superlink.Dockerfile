FROM python:3.13-slim-bookworm

ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update \
    && apt-get -y --no-install-recommends install \
    ca-certificates \
    libsqlite3-0 \
    git \
    && rm -rf /var/lib/apt/lists/*

RUN useradd \
    --no-create-home \
    --home-dir /app \
    -c "" \
    --uid 49999 app \
    && mkdir -p /app \
    && chown -R app:app /app

WORKDIR /app
COPY --chown=app:app framework/ /app/

RUN chown -R app:app /app && \
    mkdir -p /data && \
    chown -R app:app /data

USER app
ENV HOME=/app
RUN rm -rf .venv && pip install --user --no-cache-dir -e .

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONIOENCODING=UTF-8 \
    LANG=C.UTF-8 \
    LC_ALL=C.UTF-8 \
    HOME=/app \
    PATH="/app/.local/bin:${PATH}"

ENTRYPOINT ["flower-superlink"]
