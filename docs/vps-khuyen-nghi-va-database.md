# VPS khuyen nghi va noi luu database

Tai lieu nay ap dung cho bo docker compose hien tai (`postgres`, `app-server`, `admin-web`, `web-gateway`).

## 1) Cau hinh VPS khuyen nghi (thuc te cho bot tai nhe)

### Muc khoi diem (du cho da so bot nho)
- vCPU: 1 core
- RAM: 2 GB
- Disk: 30-40 GB SSD/NVMe
- OS: Ubuntu 22.04 LTS
- Phu hop khi so guild va giao dich chua cao.

### Muc nen dung lau dai (khuyen nghi)
- vCPU: 2 core
- RAM: 4 GB
- Disk: 50 GB SSD/NVMe
- OS: Ubuntu 22.04 LTS
- Du headroom cho Postgres, log, backup va dot bien nho.

### Muc nang cap (chi khi da co dau hieu qua tai)
- vCPU: 4 core
- RAM: 8 GB
- Disk: 80-100 GB SSD/NVMe
- Nen dung khi webhook/command dong thoi tang ro, DB lon nhanh, hoac response bi tre.

### Khi nao can nang cap VPS
- CPU > 80% lien tuc trong gio cao diem
- RAM > 80% thuong xuyen hoac container bi OOM/restart
- Do tre command/webhook tang ro
- Backup DB cham dan vi dung luong lon

## 2) Noi luu database hien tai (theo docker-compose)

Trong `docker-compose.yml`, Postgres dang dung named volume:

```yaml
volumes:
  - postgres-data:/var/lib/postgresql/data
```

Nghia la du lieu DB luu trong Docker volume `postgres-data` (thuc te co the la `<project>_postgres-data`).

Tren Linux VPS, duong dan vat ly thuong nam duoi:

```bash
/var/lib/docker/volumes/<volume_name>/_data
```

Kiem tra chinh xac volume name va mountpoint:

```bash
docker volume ls | grep postgres-data
docker volume inspect <volume_name>
```

## 3) Khuyen nghi de quan ly du lieu de backup

Nen doi sang bind mount de nhin thay data ro rang tren host, vi du:

```yaml
services:
  postgres:
    volumes:
      - /opt/discordvip/postgres-data:/var/lib/postgresql/data
```

Khi do, database nam tai:
- `/opt/discordvip/postgres-data` tren VPS

Uu diem:
- De backup theo folder
- De monitor dung luong dia
- De migrate sang VPS khac

## 4) Backup toi thieu de tranh mat du lieu

Backup logic hang ngay:

```bash
docker exec -t <postgres_container> pg_dump -U postgres -d discordvip > /opt/discordvip/backups/discordvip-$(date +%F).sql
```

Nen giu it nhat:
- Ban backup 7 ngay gan nhat (local)
- Them 1 ban sao offsite (S3, R2, Google Drive, ...)

## 5) Checklist van hanh production (toi gian)

- Bat firewall (`22`, `80`, `443`; khong mo cong `5432` ra internet)
- Dat mat khau Postgres manh, khong dung mac dinh `postgres/postgres`
- Dat `restart: unless-stopped` (da co trong compose)
- Theo doi disk usage, RAM va log rotation
- Thu restore backup dinh ky (it nhat 1 lan/thang)

## 6) Ket qua stress test thuc te (2026-03-10)

Da test truc tiep tren stack Docker dang chay: `web-gateway -> app-server -> postgres`.

### Bai test A: `GET /health` (khong cham DB nghiep vu)

- `c=20`: ~859 req/s, latency avg ~22.77ms, p99 ~124ms
- `c=50`: ~1367 req/s, latency avg ~35.98ms, p99 ~112ms
- `c=100`: ~939 req/s, latency avg ~105.69ms, p99 ~348ms
- `c=200`: ~1577 req/s, latency avg ~125.93ms, p99 ~487ms

Nhan xet:
- Tu `c>=100`, do tre tang manh (du la van chua timeout).
- Bai test nay nhe hon luong nghiep vu thuc te vi endpoint rat don gian.

### Bai test B: `GET /api/auth/discord/login` (co session, cham DB)

- `c=50`: ~577 req/s, latency avg ~85.97ms, p99 ~153ms
- Quan sat `docker stats`: `app-server` ~100% CPU, `postgres` ~46-49% CPU.

Nhan xet:
- Khi vao luong co session/DB, tai CPU tang ro rang so voi `/health`.
- Neu co nhieu luong login/webhook/admin cung luc, can uu tien CPU headroom.

### Ket luan sizing tu test

- Muc khoi diem: `1 vCPU / 2 GB RAM` (traffic nho, it dot bien).
- Muc nen dung: `2 vCPU / 4 GB RAM` (on dinh hon cho login/webhook/DB).
- Muc nang cap: `4 vCPU / 8 GB RAM` khi latency p99 tang cao o gio cao diem hoac CPU > 80% lien tuc.

Luu y:
- So lieu tren la benchmark trong moi truong local Docker co workload khac cung ton tai, chi nen dung lam moc tham khao de chon cau hinh ban dau.
