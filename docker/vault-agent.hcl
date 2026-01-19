pid_file = "/tmp/pidfile"

vault {
  address = "http://vault:8200"
}

auto_auth {
  method {
    type = "approle"
    
    config = {
      role_id_file_path = "/etc/backend/creds/platform-role-id"
      secret_id_file_path = "/etc/backend/creds/platform-secret-id"
      remove_secret_id_file_after_reading = false
    }
  }

  sink {
    type = "file"
    config = {
      path = "/tmp/vault-token"
    }
  }
}

template {
  source = "/vault/templates/backend-certs.tpl"
  destination = "/etc/backend/certs/.rendered"
}
