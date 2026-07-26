#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${BASE_URL:-http://localhost:8000}"
SAMPLE_FILE="${SAMPLE_FILE:-got_s1e1.txt}"

pass=0
fail=0

check() {
  local name="$1" url="$2"
  local code
  code=$(curl -s -o /dev/null -w "%{http_code}" "$url")
  if [ "$code" = "200" ]; then
    echo "PASS  $name ($url) -> $code"
    pass=$((pass + 1))
  else
    echo "FAIL  $name ($url) -> $code"
    fail=$((fail + 1))
  fi
}

echo "== Health checks =="
check "root"      "$BASE_URL/"
check "health"     "$BASE_URL/health"
check "chromadb"   "$BASE_URL/health/chromadb"
check "mongodb"    "$BASE_URL/health/mongodb"
check "neo4j"      "$BASE_URL/health/neo4j"

echo
echo "== Ingest test =="
if [ -f "$SAMPLE_FILE" ]; then
  code=$(curl -s -o /tmp/ingest_response.json -w "%{http_code}" \
    -X POST "$BASE_URL/ingest" \
    -F "file=@$SAMPLE_FILE" \
    -F "episode=test-run")
  if [ "$code" = "200" ]; then
    echo "PASS  ingest ($SAMPLE_FILE) -> $code"
    cat /tmp/ingest_response.json
    echo
    pass=$((pass + 1))
  else
    echo "FAIL  ingest ($SAMPLE_FILE) -> $code"
    cat /tmp/ingest_response.json
    echo
    fail=$((fail + 1))
  fi
else
  echo "SKIP  ingest -> sample file '$SAMPLE_FILE' not found"
fi

echo
echo "== Summary: $pass passed, $fail failed =="
[ "$fail" -eq 0 ]
