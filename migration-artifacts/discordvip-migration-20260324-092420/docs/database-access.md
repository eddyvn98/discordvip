# Database Access Guide

## Current Setup

The PostgreSQL container is no longer exposed publicly on `0.0.0.0`.

Current access model:
- Host bind: `127.0.0.1:5432`
- Docker service name: `postgres`
- Database name: `discordvip`
- Database user: `postgres`
- Password: stored in `.env` as `POSTGRES_PASSWORD`

This means:
- Applications inside Docker should connect to `postgres:5432`
- Commands run directly on the server should connect to `127.0.0.1:5432`
- Remote machines should not connect directly unless using a tunnel

## For The Running App

The backend uses:

```env
DATABASE_URL=postgresql://postgres:<POSTGRES_PASSWORD>@postgres:5432/discordvip?schema=public
```

Do not change the host from `postgres` to `localhost` inside containerized app services.

## Access From The Server Itself

If you are on the VPS / host machine, use:

```bash
psql -h 127.0.0.1 -p 5432 -U postgres -d discordvip
```

If using Docker exec:

```bash
docker exec -it discordvip-postgres-1 psql -U postgres -d discordvip
```

## Access From Another Machine

Do not reopen public access to port `5432`.

Use an SSH tunnel instead:

```bash
ssh -L 5432:127.0.0.1:5432 <user>@<server>
```

Then on your local machine:

```bash
psql -h 127.0.0.1 -p 5432 -U postgres -d discordvip
```

## Useful Checks

Check whether PostgreSQL is only bound to localhost:

```bash
docker inspect -f "{{json .NetworkSettings.Ports}}" discordvip-postgres-1
```

Expected shape:

```json
{"5432/tcp":[{"HostIp":"127.0.0.1","HostPort":"5432"}]}
```

Check app health:

```bash
curl http://127.0.0.1:8080/health
```

Check recent backup logs:

```bash
docker logs discordvip-db-backup-1 --tail 50
```

## Important Notes For Future AI / Maintenance

- PostgreSQL is intentionally not public anymore.
- If a tool cannot connect from outside, that is expected behavior.
- Prefer `docker exec ... psql ...` for quick inspection.
- Prefer SSH tunnel for remote admin access.
- Do not revert `127.0.0.1:5432:5432` back to `5432:5432` unless you explicitly accept the security tradeoff.
- If database credentials are rotated, update both:
  - `.env` values: `POSTGRES_PASSWORD`, `DATABASE_URL`
  - the actual PostgreSQL user password inside the running database

## Backup Location

Automated backups are written to:

```text
./backups
```

Restore pattern:

```bash
gzip -dc ./backups/<file>.sql.gz | docker exec -i discordvip-postgres-1 psql -U postgres -d discordvip
```
