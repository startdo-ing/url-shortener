#!/usr/bin/env bash
set -euo pipefail
id="${1:-}"
if [[ -z "$id" ]]; then
  echo "usage: audit.sh <F-NNN>" >&2
  exit 2
fi
if [[ "$id" == "F-001" ]]; then
  test -f docs/features/F-001-redirect-core.md
  grep -q 'R-001' apps/redirect/src/handler.test.ts
  grep -q 'R-007' apps/redirect/src/handler.test.ts
  echo "audit $id OK (minimal traceability grep)"
  exit 0
fi
echo "audit: no rule for $id — extend tools/audit.sh" >&2
exit 3
