{{ with pkiCert "pki_int/issue/platform-backend" (printf "common_name=%s" (env "CERT_DOMAIN")) (printf "alt_names=superlink,%s" (env "CERT_DOMAIN")) "ttl=720h" }}
{{ printf "%s\n%s" .Cert .CA | writeToFile "/etc/backend/certs/backend.crt" "" "" "0644" }}
{{ .Key | writeToFile "/etc/backend/certs/backend.key" "" "" "0644" }}
{{ .CA | writeToFile "/etc/backend/certs/ca.crt" "" "" "0644" }}
{{ end }}
