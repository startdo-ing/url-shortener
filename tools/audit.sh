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
if [[ "$id" == "F-002" ]]; then
  test -f docs/features/F-002-portal-links-crud.md
  grep -q 'R-005' packages/core/src/url.test.ts
  test -d apps/portal/src/pages
  echo "audit $id OK (minimal traceability grep)"
  exit 0
fi
if [[ "$id" == "F-003" ]]; then
  test -f docs/features/F-003-portal-unfurl-previews.md
  grep -q 'R-024' docs/features/F-003-portal-unfurl-previews.md
  test -f docs/adr/0002-unfurl-fetch-ssrf-boundaries.md
  grep -q 'link-preview' apps/portal/src/pages/api/link-preview.ts
  grep -q 'isSsrfBlockedUrl' packages/core/src/ssrf-host.ts
  echo "audit $id OK (spec + ADR 0002 + portal route + core SSRF)"
  exit 0
fi
if [[ "$id" == "F-004" ]]; then
  test -f docs/features/F-004-portal-notes-markdown.md
  grep -q 'R-027' docs/features/F-004-portal-notes-markdown.md
  test -f docs/adr/0004-notes-markdown-sanitization.md
  grep -q 'renderNotesMarkdown' apps/portal/src/lib/render-notes.ts
  test -f apps/portal/src/components/NotesEditor.svelte
  echo "audit $id OK (spec + ADR 0004 + portal notes pipeline)"
  exit 0
fi
if [[ "$id" == "F-005" ]]; then
  test -f docs/features/F-005-click-enrichment.md
  grep -q 'R-008' docs/features/F-005-click-enrichment.md
  test -f docs/adr/0003-click-enrichment-placement.md
  grep -q 'uaEnrichmentFields' apps/redirect/src/enrich-click.ts
  test -f apps/redirect/README.md
  echo "audit $id OK (spec + ADR 0003 + redirect enrichment)"
  exit 0
fi
if [[ "$id" == "F-006" ]]; then
  test -f docs/features/F-006-analytics-dashboards.md
  grep -q 'R-009' docs/features/F-006-analytics-dashboards.md
  grep -q 'getGlobalAnalytics' apps/portal/src/server/analytics.ts
  test -f apps/portal/src/pages/analytics/index.astro
  echo "audit $id OK (spec + portal analytics routes)"
  exit 0
fi
if [[ "$id" == "F-007" ]]; then
  test -f docs/features/F-007-bulk-import-export.md
  grep -q 'R-029' docs/features/F-007-bulk-import-export.md
  grep -q 'parseBulkPaste' apps/portal/src/lib/bulk-parse.test.ts
  test -f apps/portal/src/pages/api/bulk-links.ts
  test -f apps/portal/src/pages/api/export-links-csv.ts
  test -f apps/portal/src/pages/api/export-links-json.ts
  grep -q 'click_count' apps/portal/src/pages/api/export-links-csv.ts
  grep -q 'click_count' apps/portal/src/pages/api/export-links-json.ts
  echo "audit $id OK (spec + bulk parse tests + import/export routes)"
  exit 0
fi
if [[ "$id" == "F-008" ]]; then
  test -f docs/features/F-008-marketer-utm-tags-qr.md
  grep -q 'R-035' docs/features/F-008-marketer-utm-tags-qr.md
  grep -q 'R-035' docs/REQUIREMENTS.md
  test -f packages/db/migrations/002_f008_utm_tags.sql
  grep -q 'mergeUtmParamsIntoUrl' packages/core/src/utm-merge.test.ts
  test -f 'apps/portal/src/pages/api/links/[id]/qr.svg.ts'
  grep -q 'setLinkTags' apps/portal/src/server/marketer.ts
  echo "audit $id OK (spec + migration + core UTM + QR route + marketer)"
  exit 0
fi
if [[ "$id" == "F-009" ]]; then
  test -f docs/features/F-009-api-and-auth.md
  grep -q 'R-033' docs/features/F-009-api-and-auth.md
  grep -q 'R-033' docs/REQUIREMENTS.md
  test -f packages/db/migrations/003_f009_api_keys_sessions.sql
  test -f apps/portal/src/middleware.ts
  grep -q 'verifyApiKeyFromAuthorization' apps/portal/src/pages/api/v1/links/index.ts
  grep -q 'unauthorized' apps/portal/src/server/v1-http.test.ts
  echo "audit $id OK (spec + migration + middleware + v1 + 401 test)"
  exit 0
fi
echo "audit: no rule for $id — extend tools/audit.sh" >&2
exit 3
