# Server setup & deployment

How the production server is prepared once, and how every release reaches it. Background: `architecture.md §9`.

**Shape:** an Ubuntu LTS VPS with Docker. The repository is cloned to `/opt/personalsite` (compose files,
`deploy/Caddyfile`, this script); secrets live only in `/opt/personalsite/.env`. Images are **never built on the
server**: GitHub Actions builds them (`.github/workflows/release.yml`) and the server pulls them from GHCR.
One release = one git tag `vX.Y.Z` = one image tag; `deploy/scripts/deploy.sh vX.Y.Z` checks the tag out, so
config files and images always come from the same commit.

In the commands below, `SERVER` is the server's IP address or hostname. Windows commands are for PowerShell.

## 1. Before you start

- A VPS with **Ubuntu 24.04 LTS** (x86-64; the images are built for `linux/amd64`), at least 2 GB RAM and 20 GB disk.
- DNS at the registrar (IRNIC for `.ir`): `A` records for `mahdiazghandi.ir`, `www.mahdiazghandi.ir`,
  `shahramazghandi.ir`, `www.shahramazghandi.ir` → the server's IPv4 (plus `AAAA` records if it has IPv6).
  Let's Encrypt only issues a certificate once a name points at the server, so set these before the first deploy.
- An SSH key on your PC (skip if `~\.ssh\id_ed25519.pub` exists):

  ```powershell
  ssh-keygen -t ed25519 -C "mahdi@pc"
  ```

## 2. Deploy user and SSH (once, as root)

```powershell
# From your PC: copy the public key to root (the provider's root password is asked once).
Get-Content $env:USERPROFILE\.ssh\id_ed25519.pub | ssh root@SERVER "mkdir -p ~/.ssh && cat >> ~/.ssh/authorized_keys"
ssh root@SERVER
```

```bash
# On the server, as root: a normal user that runs the site, with your key.
adduser --disabled-password --gecos "" deploy
usermod -aG sudo deploy
passwd deploy                                   # needed for sudo
install -d -m 700 -o deploy -g deploy /home/deploy/.ssh
install -m 600 -o deploy -g deploy ~/.ssh/authorized_keys /home/deploy/.ssh/authorized_keys

# Keys only, no root login.
cat > /etc/ssh/sshd_config.d/10-hardening.conf <<'EOF'
PermitRootLogin no
PasswordAuthentication no
KbdInteractiveAuthentication no
EOF
sshd -t && systemctl reload ssh
```

Before closing the root session, check from a **second** PowerShell window that `ssh deploy@SERVER` works.
A short alias on your PC saves typing: add this to `~\.ssh\config`, then `ssh site` is enough.

```text
Host site
    HostName SERVER
    User deploy
```

## 3. Firewall and updates

```bash
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp       # Let's Encrypt HTTP-01 + redirect to HTTPS
sudo ufw allow 443/tcp
sudo ufw allow 443/udp      # HTTP/3
sudo ufw enable
sudo apt update && sudo apt install -y unattended-upgrades git curl
sudo dpkg-reconfigure -plow unattended-upgrades   # security updates install themselves
```

Docker writes its own iptables rules, so a port published by a container is reachable **even if ufw doesn't allow
it**. That is why `compose.prod.yaml` publishes only Caddy's 80/443 — never add `ports:` to `db`, `api` or `frontend`.

## 4. Docker

Docker's official apt repository (https://docs.docker.com/engine/install/ubuntu/):

```bash
sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" \
  | sudo tee /etc/apt/sources.list.d/docker.list
sudo apt update && sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
```

If `download.docker.com` is unreachable from the server, Ubuntu's own packages work too:
`sudo apt install -y docker.io docker-compose-v2`.

```bash
sudo usermod -aG docker deploy    # then log out and in again
docker compose version            # must be 2.24.4 or newer (compose.prod.yaml uses `!reset`)
```

Membership in the `docker` group is root-equivalent: keep the `deploy` account key-only.

**Docker Hub throttled?** `postgres` and `caddy` come from Docker Hub. If `docker pull caddy:2.11-alpine` hangs, add
a registry mirror that is reachable from the server (your hosting provider usually names one) to
`/etc/docker/daemon.json` — `{ "registry-mirrors": ["https://<mirror>"] }` — then `sudo systemctl restart docker`.
The mirror is used only for pulling at deploy time; the running site never depends on it.

## 5. The repository and `.env`

```bash
sudo install -d -o deploy -g deploy /opt/personalsite
git clone https://github.com/shahramdevops-rgb/my-website.git /opt/personalsite
cd /opt/personalsite
cp .env.example .env && chmod 600 .env
openssl rand -hex 24              # a POSTGRES_PASSWORD (hex: no ';' that would break the connection string)
nano .env
```

In `.env` set at least:

| Key | Value |
|---|---|
| `POSTGRES_PASSWORD` | the generated value. Set it **before the first deploy**: PostgreSQL stores it when it creates `pgdata` |
| `SITE_HOST` | `mahdiazghandi.ir` |
| `REDIRECT_HOSTS` | `www.mahdiazghandi.ir, shahramazghandi.ir, www.shahramazghandi.ir` |
| `ACME_EMAIL` | your email (Let's Encrypt expiry warnings) |
| `Site__Social__*` | contact links, when you have them |

Delete the `Site__BaseUrl=` line (production builds it from `SITE_HOST`). Don't set `IMAGE_TAG`: `deploy.sh` writes it.
Never edit tracked files on the server — the deploy script refuses to run if `git status` shows changes. Config
belongs in `.env`; anything else is a commit and a new release.

## 6. Pulling from GHCR

The packages `ghcr.io/shahramdevops-rgb/personalsite-api` and `…/personalsite-frontend` were created by the first
release (`v0.1.0`, 2026-10-23). They are **public** — linked to this public repository through the image's
`org.opencontainers.image.source` label — so the server pulls them **without any login** (checked: an anonymous pull
of the `v0.1.0` manifest returns 200). The images contain no secrets; config comes from `.env` at run time.

If the packages are ever made private (GitHub → your profile → Packages → package → Package settings), the server
needs a classic personal access token with only the `read:packages` scope: `docker login ghcr.io -u
shahramdevops-rgb`, then paste the token. Docker stores it base64-encoded (not encrypted) in `~/.docker/config.json`.

## 7. Deploy a release

1. Tag the release on your PC: `git tag v0.1.0; git push origin v0.1.0`. Wait for the **Release** workflow on
   GitHub (CI first, then both images).
2. Deploy with one command from your PC:

   ```powershell
   ssh site /opt/personalsite/deploy/scripts/deploy.sh v0.1.0
   ```

The script stops at the first failing step:

| Step | What it does |
|---|---|
| check out | refuses if tracked files changed, `git fetch --tags`, `git checkout` the tag |
| pull | `docker compose pull` (both app images at the tag, plus `postgres` and `caddy`) |
| migrate | `docker compose run --rm api --migrate` — starts `db` if needed, applies pending migrations, exits |
| up | writes `IMAGE_TAG` to `.env`, `docker compose up -d --wait` until `api` and `frontend` report healthy |
| health check | `https://SITE_HOST/health` and `/fa` through Caddy on this machine, with a valid certificate (retries ≈ 2 min) |
| prune | removes this app's images except the current and the previous release, and dangling layers |

**Rollback:** run the script with the previous tag (it prints it at the end). Migrations only go forward, so a
rollback over a release that changed the database needs a restore (§10) — `deploy.sh` never undoes a migration.

**First deploy:** if the health check fails, the usual cause is the certificate: DNS doesn't point at the server
yet, or port 80 is blocked. `docker compose -f compose.yaml -f compose.prod.yaml logs caddy` says which.

## 8. Without GitHub (fallback)

If the server can't reach GitHub or GHCR, send the tag and the images from your PC, then deploy with `--offline`
(no `git fetch`, no `docker pull`; the script checks every image is present). Run this in **Git Bash**, not
PowerShell: Windows PowerShell 5.1 re-encodes binary data in a `|` pipe and corrupts the image archive.

```bash
TAG=v0.1.0
OWNER=ghcr.io/shahramdevops-rgb
git push ssh://deploy@SERVER/opt/personalsite "$TAG"           # the tag into the server's clone
docker pull "$OWNER/personalsite-api:$TAG"
docker pull "$OWNER/personalsite-frontend:$TAG"
docker save "$OWNER/personalsite-api:$TAG" "$OWNER/personalsite-frontend:$TAG" | gzip | ssh deploy@SERVER 'gunzip | docker load'
ssh deploy@SERVER /opt/personalsite/deploy/scripts/deploy.sh "$TAG" --offline
```

If Docker Hub is unreachable too, add `postgres:17-alpine caddy:2.11-alpine` to the `docker pull` and `docker save`
lines once (they change only when `compose.yaml` does).

## 9. Everyday commands (on the server)

```bash
cd /opt/personalsite
alias dc='docker compose -f compose.yaml -f compose.prod.yaml'   # put it in ~/.bashrc
dc ps                         # state and health of every service
dc logs --tail 100 -f api     # follow one service's logs
dc restart frontend           # restart one service
df -h /var/lib/docker         # disk (logs are capped at 3 × 10 MB per service)
```

## 10. Backups and restore

`deploy/scripts/backup.sh` writes two files per run to `/var/backups/personalsite` (override with `BACKUP_DIR`),
named by UTC time: `<time>.db.dump` (`pg_dump -Fc`, checked with `pg_restore --list`) and `<time>.uploads.tar.gz`
(the `uploads` volume). Both get their final names only when both are complete, so a failed run leaves nothing
half-written. Backups older than 14 days are removed — only after a successful run, so the newest always survives.
Not in the backup: `.env` (keep a copy in your password manager), certificates (Caddy fetches new ones), Data
Protection keys (losing them only signs the admin out).

**Set up once:**

```bash
sudo install -d -m 700 -o deploy -g deploy /var/backups/personalsite
crontab -e      # as deploy; add the line below: every night at 03:15 server time
```

```text
15 3 * * * /opt/personalsite/deploy/scripts/backup.sh >> /var/backups/personalsite/backup.log 2>&1
```

Run it once by hand (`deploy/scripts/backup.sh`) and check that the two files appear.

**Off-server copy:** a backup on the same disk doesn't survive losing the server. Your PC pulls the files (the
server holds no credentials for other machines, so a hacked server can't delete the copies):

```powershell
New-Item -ItemType Directory -Force "$env:USERPROFILE\Backups\personalsite" | Out-Null
scp -p "site:/var/backups/personalsite/*.db.dump" "site:/var/backups/personalsite/*.uploads.tar.gz" "$env:USERPROFILE\Backups\personalsite"
```

Do it weekly at least (Windows Task Scheduler can run the `scp` line). Delete old copies on the PC by hand; the files
contain personal data once comments and messages exist (P8/P9).

**Restore:**

```bash
deploy/scripts/restore.sh latest                      # shows which backup, changes nothing
deploy/scripts/restore.sh 20261023T031500Z --yes      # restores that one
```

It first backs up the current state (a safety net if the wrong backup was picked), stops `frontend` and `api`,
drops and re-creates the database, runs `pg_restore --single-transaction` (all or nothing), replaces the `uploads`
volume, and starts the stack. On a **new server**: steps 1–7 first (the deploy creates the volumes), copy the backup
files to `/var/backups/personalsite` with `scp`, then `restore.sh <time> --yes`.

**Restore drills** (a backup that was never restored is a hope, not a backup):

| Date | Where | What | Result |
|---|---|---|---|
| 2026-10-23 | local (Docker Desktop, prod compose with `localhost`) | seeded a table (incl. Persian text) + an uploaded file → `backup.sh` → `docker compose down -v` (every volume deleted) → fresh deploy → `restore.sh --yes` | rows, EF migration history and the file (owner uid 1654 kept) back; `/health` and `/fa` 200 |
| | server, after the first deploy | the same with real data | |

## 11. Domain renewals

`.ir` domains are renewed at IRNIC (nic.ir). Keep the dates here so a renewal is never missed.

| Domain | Expires |
|---|---|
| `mahdiazghandi.ir` | [placeholder] |
| `shahramazghandi.ir` | [placeholder] |
