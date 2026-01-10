{{ with secret "pki_int/issue/platform-backend" "common_name=platform-backend.mentishub.local" "ttl=720h" }}
{{ .Data.certificate }}
{{ end }}
