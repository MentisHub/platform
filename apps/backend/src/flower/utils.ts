export function buildPyProject(fedName: string, superlinkAddr: string) {
  const workDir = `/tmp/flwr_${fedName}`;

  const pyProjectContent = `[project]
name = "${fedName}"
version = "0.1.0"

[tool.flwr.app]
publisher = "MentisHub"

[tool.flwr.app.components]
serverapp = "app:app"
clientapp = "app:app"

[tool.flwr.federations.${fedName}]
address = "${superlinkAddr}"
root-certificates = "/vault/creds/root-ca.crt"
`;

  return `
    mkdir -p ${workDir} && \
        cat <<'EOF' > ${workDir}/pyproject.toml
${pyProjectContent}
EOF
  `;
}
