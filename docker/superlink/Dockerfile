FROM flwr/superlink:1.25.0

WORKDIR /app
COPY pyproject.toml /app/pyproject.toml

RUN ln -s /vault/creds/root-ca.crt /app/ca.crt
