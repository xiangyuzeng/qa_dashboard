#!/usr/bin/env bash
# check-deepl-key.sh — verify a DeepL API key without leaking it.
# Usage:
#   ./check-deepl-key.sh YOUR_KEY:fx      # pass as argument
#   DEEPL_KEY=YOUR_KEY:fx ./check-deepl-key.sh   # or via env
#   ./check-deepl-key.sh                  # or run with no args → prompts hidden input
set -euo pipefail

# --- get the key (arg > env > hidden prompt); never printed back ---
KEY="${1:-${DEEPL_KEY:-}}"
if [ -z "$KEY" ]; then
  read -rsp "Paste your DeepL key (ends in :fx for Free), input hidden: " KEY
  echo
fi
if [ -z "$KEY" ]; then echo "No key given. Aborting."; exit 2; fi

# --- pick endpoint from the :fx suffix (Free) vs Pro ---
if [[ "$KEY" == *:fx ]]; then
  BASE="https://api-free.deepl.com"; PLAN="Free (:fx)"
else
  BASE="https://api.deepl.com"; PLAN="Pro (no :fx suffix)"
fi
echo "Detected plan: $PLAN  → endpoint $BASE"
echo

# --- 1) usage check (0 characters consumed) ---
echo "[1/2] Checking auth via /v2/usage (consumes 0 characters)..."
BODY=$(curl -s -w $'\n%{http_code}' "$BASE/v2/usage" \
  -H "Authorization: DeepL-Auth-Key $KEY")
CODE=$(printf '%s' "$BODY" | tail -n1)
JSON=$(printf '%s' "$BODY" | sed '$d')

diagnose() {
  case "$1" in
    401|403) echo "   → 403/401 = auth failed. Check: no stray spaces, and the key matches the endpoint";
             echo "     (Free key must end ':fx' → api-free; Pro key → api.deepl.com).";;
    456)     echo "   → 456 = monthly character quota exhausted.";;
    429)     echo "   → 429 = rate-limited, retry shortly.";;
    *)       echo "   → unexpected HTTP $1. Network/proxy issue or DeepL outage?";;
  esac
}

if [ "$CODE" != "200" ]; then
  echo "❌ INVALID — HTTP $CODE"
  diagnose "$CODE"
  exit 1
fi

USED=$(printf '%s' "$JSON"  | grep -o '"character_count":[0-9]*'  | grep -o '[0-9]*' || echo "?")
LIMIT=$(printf '%s' "$JSON" | grep -o '"character_limit":[0-9]*'  | grep -o '[0-9]*' || echo "?")
echo "✅ KEY IS VALID — auth OK. Usage this period: ${USED} / ${LIMIT} characters."
echo

# --- 2) real translation sanity check (~25 chars) ---
echo "[2/2] Test translation EN→ZH..."
T=$(curl -s "$BASE/v2/translate" \
  -H "Authorization: DeepL-Auth-Key $KEY" \
  -d "text=Food safety recall notice" -d "target_lang=ZH")
OUT=$(printf '%s' "$T" | grep -o '"text":"[^"]*"' | head -n1 | sed 's/"text":"//; s/"$//')
if [ -n "$OUT" ]; then
  echo "   \"Food safety recall notice\"  →  $OUT"
  echo
  echo "🎉 All good. Add this key as the GitHub Actions secret DEEPL_KEY:"
  echo "   https://github.com/xiangyuzeng/qa_dashboard/settings/secrets/actions"
else
  echo "   ⚠️ auth passed but translation returned no text. Raw response:"
  echo "   $T"
  exit 1
fi
