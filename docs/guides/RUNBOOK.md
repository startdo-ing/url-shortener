# Incident Runbook

This runbook covers the first-response steps for common failure modes in the URL
shortener system. Review and update this document after every incident.

---

## System components

| Component | Default port | Process | Log source |
|---|---|---|---|
| redirect-service | 8000 | `bun src/index.ts` | stdout (JSON) |
| management-web | 3000 | `bun server.ts` | stdout (JSON) |
| SQLite database | — | shared file on disk | — |

---

## 1. Redirect service is returning 5xx or not responding

**Symptoms:** Short links return 500 or the service does not respond to HTTP requests.

**Steps:**

1. Check process status:
   ```sh
   docker compose ps
   # or
   ps aux | grep "bun src/index.ts"
   ```

2. Read recent error logs:
   ```sh
   docker compose logs redirect-service --tail=100
   # or pipe structured logs through jq:
   docker compose logs redirect-service | jq 'select(.level == "error")'
   ```

3. Verify the database file is accessible:
   ```sh
   ls -lh $DATABASE_PATH
   bun -e "import { Database } from 'bun:sqlite'; new Database('$DATABASE_PATH', { readonly: true }).close(); console.log('OK')"
   ```

4. If the database appears corrupt, restore from the latest backup:
   ```sh
   # See Section 4: Backup and Restore
   ```

5. Restart the service:
   ```sh
   docker compose restart redirect-service
   ```

6. Verify recovery:
   ```sh
   curl -I https://c.anh.pw/<known-active-slug>
   # Expect: HTTP 301/302/307
   ```

---

## 2. Redirect service is rate-limiting legitimate traffic (429 surge)

**Symptoms:** Many 429 responses visible in logs or metrics.

**Steps:**

1. Check the `/metrics` endpoint for 429 volume:
   ```sh
   curl http://localhost:8000/metrics | grep 429
   ```

2. Identify the source IPs from logs:
   ```sh
   docker compose logs redirect-service | jq 'select(.status == 429) | .fields.ip'
   ```

3. If it is a single abusive IP, add it to the upstream firewall or load-balancer
   block list.

4. If the surge is from legitimate traffic (e.g., a spike after a viral link), increase
   `RATE_LIMIT_MAX_REQUESTS` and `RATE_LIMIT_WINDOW_MS` env vars and restart:
   ```sh
   # .env
   RATE_LIMIT_MAX_REQUESTS=600
   RATE_LIMIT_WINDOW_MS=60000
   docker compose restart redirect-service
   ```
   *(Environment-variable-based rate limit config is a planned enhancement; for now,
   edit `createRateLimiter()` defaults in `rate-limiter.ts` and redeploy.)*

---

## 3. Management-web is not accessible or session errors

**Symptoms:** Dashboard returns 500, login loop, or session not persisting.

**Steps:**

1. Check process and recent logs:
   ```sh
   docker compose logs management-web --tail=100
   ```

2. Verify Keycloak connectivity:
   ```sh
   curl -s $KEYCLOAK_ISSUER_URL/.well-known/openid-configuration | jq .issuer
   # Should return the issuer URL without error
   ```

3. Check required env vars are set:
   ```sh
   docker compose exec management-web printenv | grep -E 'KEYCLOAK|SESSION_SECRET|DATABASE_PATH'
   ```

4. If session issues persist, rotate `SESSION_SECRET` (invalidates all active sessions):
   ```sh
   # Generate a new secret:
   openssl rand -hex 32
   # Update .env, then:
   docker compose restart management-web
   ```

5. Restart management-web:
   ```sh
   docker compose restart management-web
   ```

---

## 4. Backup and Restore

### Take a manual backup

```sh
# From the project root
DATABASE_PATH=/path/to/prod.sqlite BACKUP_DIR=/path/to/backups bun run db:backup
```

The backup file is written to `<BACKUP_DIR>/db-<timestamp>.sqlite`.

### Restore from backup

> **Warning:** This replaces the live database. Both apps must be stopped first.

```sh
docker compose stop redirect-service management-web

# Verify the backup is readable:
bun -e "import { Database } from 'bun:sqlite'; const db = new Database('/path/to/backup.sqlite', { readonly: true }); console.log('tables:', db.query(\"SELECT name FROM sqlite_master WHERE type='table'\").all()); db.close()"

# Replace the live database:
cp /path/to/backup.sqlite $DATABASE_PATH

docker compose start redirect-service management-web
```

### Scheduled backups (cron example)

```sh
# /etc/cron.d/url-shortener-backup
0 */6 * * * deploy cd /opt/url-shortener && DATABASE_PATH=/data/prod.sqlite BACKUP_DIR=/data/backups bun run db:backup >> /var/log/url-shortener-backup.log 2>&1
```

---

## 5. Database disk usage growing unexpectedly

**Symptoms:** Disk space alert; `du -h $DATABASE_PATH` returns a large value.

**Steps:**

1. Check WAL file size — it may not have been checkpointed:
   ```sh
   ls -lh ${DATABASE_PATH}-wal
   ```

2. Force a checkpoint (safe to run while apps are running):
   ```sh
   bun -e "import { Database } from 'bun:sqlite'; const db = new Database('$DATABASE_PATH'); db.run('PRAGMA wal_checkpoint(FULL)'); db.close(); console.log('checkpoint done')"
   ```

3. Check the `click_events` table size. It accumulates over time:
   ```sh
   bun -e "import { Database } from 'bun:sqlite'; const db = new Database('$DATABASE_PATH', { readonly: true }); console.log(db.query('SELECT COUNT(*) as n FROM click_events').get()); db.close()"
   ```
   If click events are the cause, archive or truncate old rows as needed.

---

## 6. Metrics

Both apps expose Prometheus-format metrics at `GET /metrics` (no authentication).

```sh
curl http://localhost:8000/metrics   # redirect-service
curl http://localhost:3000/metrics   # management-web
```

Key metric: `http_requests_total{service, method, status}`

Suggested alert thresholds:
- **Error rate > 1%** over a 5-minute window: page on-call.
- **No scrape data for > 5 minutes**: service may be down.
- **429 rate > 10% of total requests**: review rate limiter configuration.

---

## 7. After any incident

1. Record the timeline and root cause in a postmortem doc.
2. Update this runbook if steps were missing or incorrect.
3. Open a ticket for any systemic fix identified.
