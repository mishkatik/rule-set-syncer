# Rule-Set Syncer

Periodically mirrors [Mihomo](https://github.com/MetaCubeX/mihomo) rule-set files from upstream sources to your S3-compatible storage.

## How it works

On startup and then on a configurable cron schedule, the syncer fetches all rule sources defined in `sources.json` in parallel and uploads them to S3. If the downloaded content is identical to the object already in S3 (compared via MD5 against the object's ETag), the upload is skipped. Failed sources are logged and retried on the next run.

## Quick start

### 1. Run with Docker (recommended)

```bash
mkdir /opt/rule-set-syncer && cd /opt/rule-set-syncer
curl -o docker-compose.yml https://raw.githubusercontent.com/mishkatik/rule-set-syncer/refs/heads/main/docker-compose.prod.yml
curl -o sources.json https://raw.githubusercontent.com/mishkatik/rule-set-syncer/refs/heads/main/sources.json
curl -o .env https://raw.githubusercontent.com/mishkatik/rule-set-syncer/refs/heads/main/.env.example
```

Edit `.env` with your S3 credentials:

| Variable               | Required | Default     | Description                                  |
|------------------------|----------|-------------|----------------------------------------------|
| `S3_ACCESS_KEY_ID`     | ✅        | —           | S3 access key                                |
| `S3_SECRET_ACCESS_KEY` | ✅        | —           | S3 secret key                                |
| `S3_BUCKET`            | ✅        | —           | Target bucket name                           |
| `S3_ENDPOINT`          | —        | —           | Custom endpoint (Cloudflare R2, MinIO, etc.) |
| `S3_REGION`            | —        | `us-east-1` | Bucket region                                |
| `S3_KEY_PREFIX`        | —        | —           | Optional prefix for all uploaded keys        |
| `CRON_SCHEDULE`        | —        | `0 * * * *` | Cron expression (default: every hour)        |

Then start:

```bash
docker compose up -d && docker compose logs -f -t
```

### 2. Run locally with Bun

```bash
bun install
bun start
```

## Customizing sources

Edit `sources.json` to add, remove, or update rule sources. Each entry has three fields:

```json
{
  "name": "telegram_domains",
  "url": "https://github.com/MetaCubeX/meta-rules-dat/raw/meta/geo/geosite/telegram.mrs",
  "s3Key": "rule-sets/telegram_domains.mrs"
}
```

| Field   | Description                                   |
|---------|-----------------------------------------------|
| `name`  | Human-readable identifier (used in logs)      |
| `url`   | Upstream download URL                         |
| `s3Key` | Object key in S3 (relative, no leading slash) |

`sources.json` is mounted into the container — edit it on the host and restart to apply changes:

```bash
docker compose restart
```
