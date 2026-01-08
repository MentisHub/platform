#!/bin/sh
set -e

KEYS_FILE="/vault/file/init-keys.json"
PKI_FLAG="/vault/file/.pki_initialized"

vault status 2>&1 | grep -q "Initialized.*true" || \
  vault operator init -key-shares=1 -key-threshold=1 -format=json > "$KEYS_FILE"

if vault status 2>&1 | grep -q "Sealed.*true"; then
  UNSEAL_KEY=$(awk -F'"' '/"unseal_keys_b64"/{getline; print $2}' "$KEYS_FILE")
  vault operator unseal "$UNSEAL_KEY"
fi

export VAULT_TOKEN=$(awk -F'"' '/"root_token"/{print $4}' "$KEYS_FILE")

if [ ! -f "$PKI_FLAG" ]; then
  vault secrets enable -path=pki pki
  vault secrets tune -max-lease-ttl=87600h pki

  vault write pki/root/generate/internal \
    common_name="MentisHub Root CA" \
    issuer_name="root-ca" \
    ttl=87600h \
    key_bits=4096 \
    > /dev/null

  vault write pki/config/urls \
    issuing_certificates="${VAULT_ADDR}/v1/pki/ca" \
    crl_distribution_points="${VAULT_ADDR}/v1/pki/crl"

  vault write pki/roles/otel-collector-cert \
    allowed_domains="otel-collector" \
    allow_bare_domains=true \
    allow_subdomains=false \
    max_ttl=8760h \
    key_bits=2048 \
    key_type=rsa \
    require_cn=true

  vault write pki/roles/platform-backend-cert \
    allowed_domains="platform-backend.mentishub.local" \
    allow_bare_domains=true \
    allow_subdomains=false \
    max_ttl=8760h \
    key_bits=2048 \
    key_type=rsa \
    require_cn=true

  vault policy write pki-backend - <<EOF
path "pki/cert/ca" {
  capabilities = ["read"]
}
path "pki/root/sign-intermediate" {
  capabilities = ["create", "update"]
}
path "sys/mounts/pki_org_*" {
  capabilities = ["create", "read", "update", "delete"]
}
path "pki_org_*" {
  capabilities = ["create", "read", "update", "delete", "list", "sudo"]
}
path "pki_org_*/*" {
  capabilities = ["create", "read", "update", "delete", "list", "sudo"]
}
EOF

  vault auth enable approle 2>/dev/null || true

  vault write auth/approle/role/platform-backend \
    role_id="${VAULT_ROLE_ID}" \
    token_policies="pki-backend" \
    token_ttl=1h \
    token_max_ttl=4h \
    secret_id_ttl=0 \
    secret_id_num_uses=0

  vault write auth/approle/role/platform-backend/custom-secret-id \
    secret_id="${VAULT_SECRET_ID}"

  CERTS_DIR="/vault/certs"
  mkdir -p "$CERTS_DIR"

  vault write -format=json pki/issue/otel-collector-cert \
    common_name="otel-collector" \
    ttl=8760h > /tmp/otel-cert.json

  sed -n 's/.*"certificate": "\([^"]*\)".*/\1/p' /tmp/otel-cert.json | sed 's/\\n/\n/g' > "$CERTS_DIR/otel-server.crt"
  sed -n 's/.*"private_key": "\([^"]*\)".*/\1/p' /tmp/otel-cert.json | sed 's/\\n/\n/g' > "$CERTS_DIR/otel-server.key"
  sed -n 's/.*"issuing_ca": "\([^"]*\)".*/\1/p' /tmp/otel-cert.json | sed 's/\\n/\n/g' > "$CERTS_DIR/ca.crt"

  rm /tmp/otel-cert.json

  vault write -format=json pki/issue/platform-backend-cert \
    common_name="platform-backend.mentishub.local" \
    ttl=8760h > /tmp/backend-cert.json

  sed -n 's/.*"certificate": "\([^"]*\)".*/\1/p' /tmp/backend-cert.json | sed 's/\\n/\n/g' > "$CERTS_DIR/backend.crt"
  sed -n 's/.*"private_key": "\([^"]*\)".*/\1/p' /tmp/backend-cert.json | sed 's/\\n/\n/g' > "$CERTS_DIR/backend.key"

  chmod 644 "$CERTS_DIR/otel-server.crt" "$CERTS_DIR/ca.crt" "$CERTS_DIR/backend.crt"
  chmod 644 "$CERTS_DIR/otel-server.key" "$CERTS_DIR/backend.key"

  rm /tmp/backend-cert.json

  touch "$PKI_FLAG"
fi

echo "Vault ready - Token: $VAULT_TOKEN"
