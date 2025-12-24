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
path "pki_org_*/*" {
  capabilities = ["create", "read", "update", "delete", "list"]
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

  touch "$PKI_FLAG"
fi

echo "Vault ready - Token: $VAULT_TOKEN"
