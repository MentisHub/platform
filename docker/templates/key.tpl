{{ with secret "pki_int/issue/platform-backend" (printf "common_name=%s" (env "CERT_DOMAIN")) (printf "alt_names=superlink,%s" (env "CERT_DOMAIN")) "ttl=720h" }}
{{ .Data.private_key }}
{{ end }}
