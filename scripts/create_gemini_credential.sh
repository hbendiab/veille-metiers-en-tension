#!/usr/bin/env bash
# Creates the "Google Gemini API Key" credential in n8n through the public REST API
# (POST /api/v1/credentials), reading secrets from .env. Prints only the credential id.
set -euo pipefail
cd "$(dirname "$0")/.."

set -a; source .env; set +a
: "${GEMINI_API_KEY:?GEMINI_API_KEY manquant dans .env}"
: "${N8N_API_KEY:?N8N_API_KEY manquant dans .env}"
: "${N8N_URL:?N8N_URL manquant dans .env}"

payload=$(python3 -c 'import json, os; print(json.dumps({
  "name": "Google Gemini API Key",
  "type": "googlePalmApi",
  "data": {"host": "https://generativelanguage.googleapis.com", "apiKey": os.environ["GEMINI_API_KEY"]}
}))')

response=$(curl -sS -X POST "${N8N_URL%/}/api/v1/credentials" \
  -H "X-N8N-API-KEY: ${N8N_API_KEY}" -H "Content-Type: application/json" \
  --data-binary @- <<<"$payload")

python3 -c 'import json, sys
r = json.loads(sys.argv[1])
if "id" not in r:
    sys.exit("Erreur n8n : " + str(r.get("message", r)))
print(r["id"])' "$response"
