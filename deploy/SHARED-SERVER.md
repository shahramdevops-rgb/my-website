# Sharing the server with the gym system

**Status (2026-10-23):** this repository is ready (edge proxy, prod compose, `deploy.sh`, all tested locally end to
end). Nothing has been run on the server. The gym repository still needs its part (§3), and nothing is deployed yet.

The production VPS (Shahram's own; Ubuntu 26.04, 2 vCPU, 4 GB RAM, 2 GB swap, 60 GB disk, amd64) already runs the
**gym management system** (`/opt/gym`, user `gym`) with real member, payment and SMS data. To save cost, this site
runs on the same machine (ADR-028). This file lists the conflicts, the chosen shape and the work in order.

**Ground rules for every step on that server:** take a gym backup first (`cd /opt/gym && ./backup.sh run`, plus a
copy off the server); explain each command before running it; never remove the gym's containers or its
`postgres-data` volume; nothing but the edge may listen on 80/443.

## 1. What conflicts and how it is handled

| Area | Conflict | Handling |
|---|---|---|
| Ports 80/443 (+443/udp) | Only one process can listen on a port; the Caddy inside `gym-web` holds them today | One shared **edge** Caddy owns them; both apps sit behind it (§2) |
| Client IP behind two proxies | With a proxy in front of `gym-web`, the gym API would see one IP for every user: one shared login rate-limit bucket, wrong IPs in logs (the same problem the gym docs give for a CDN) | `gym-web`'s Caddy trusts the hop from the edge and passes the real client IP on (§3) |
| Service names | Two projects on one docker network both answer to names like `api` | No shared docker network: the edge uses the host network and reaches apps on loopback ports |
| Docker subnets | `compose.prod.yaml` pins `172.30.0.0/24`; if the gym uses it, `up` fails | Checked before the first deploy (§4, A2); pick another /24 if taken |
| Loopback ports | This site uses `127.0.0.1:13000` and `:18080`, the gym needs one too | Checked (A3); changeable in `.env` (`FRONTEND_HOST_PORT`, `API_HOST_PORT`) |
| RAM / CPU | 3.8 GB usable, two cores, two stacks | This stack: each service ≤ 1 core and 384 MB, `oom_score_adj: 500` so the kernel kills it before the gym; measure, upgrade RAM if needed (§5) |
| Gym releases | A gym release that still publishes 80/443 would take the ports back from the edge | The change is made in the gym repo, not by hand on the server |
| Rollback | Rolling this site back to `v0.1.0` would start its own Caddy on 80/443 | `deploy.sh` refuses releases without `deploy/personalsite.caddy` |
| Compose projects, volumes | — | Different project names (`personalsite`, `gym`, `edge`), so different volume names |
| Image clean-up | — | `deploy.sh` removes only `personalsite-*` tags and dangling layers; the gym's images are never touched |
| Databases | — | Separate PostgreSQL per app, own credentials, own backups, no published ports |
| ufw, fail2ban, SSH, Docker, DNS resolvers | — | Already set up; still only 22/80/443 open |

## 2. Shape

```text
Internet ──80/443──► edge Caddy  (/opt/edge, host network, owns 80/443 and every certificate)
                       ├─ sites/gym.caddy           panel.pasargadgymplus.ir, pasargadgymplus.ir, www…, .com
                       │                            ──► 127.0.0.1:<gym port> ──► gym-web (HTTP) ──► gym API ─ gym DB
                       └─ sites/personalsite.caddy  mahdiazghandi.ir (+ www, shahramazghandi.ir → 301)
                                                    ──► 127.0.0.1:13000 frontend / 127.0.0.1:18080 api ─ our DB
```

- **Edge** = `deploy/edge/` in this repository (compose file + a Caddyfile that only does `import sites/*.caddy`),
  copied once to `/opt/edge`. It holds no app logic and almost never changes; deploying an app never restarts it.
- **Each app owns its site file** and reloads the edge after changing it. Caddy validates the whole new config
  before switching; a broken file is refused and the old config keeps serving (tested). For this site, `deploy.sh`
  renders `deploy/personalsite.caddy` and does the reload.
- **Host network for the edge**, not a shared docker network: it reaches apps at `127.0.0.1:<port>`, where each
  app publishes on loopback only (unreachable from outside even though Docker bypasses ufw). Docker hands those
  connections to the container from the app network's gateway (tested: `172.30.0.1`), which is inside the network
  the API already trusts for forwarded headers.
- The edge's admin API is a root-only unix socket inside the container (`docker exec` only); the default
  `localhost:2019` would be open to every local user under the host network, including the restricted `gymbackup`.

## 3. The gym repository's part (separate session in that repository)

1. `gym-web` publishes `127.0.0.1:<port>:80` instead of `80`/`443`, and its Caddy serves plain HTTP for its
   hostnames (TLS moves to the edge). Host-based behaviour (panel vs public page vs redirects) can stay: the edge
   forwards the original `Host`.
2. Its Caddy trusts the hop from the edge (`trusted_proxies` = its network's range) and the gym API still receives
   the **real client IP** — e.g. by forwarding `{client_ip}`, or by the API trusting one more hop. Check after the
   cut-over: a gym login shows the real IP in the gym API's logs, and the login rate limit is per user again.
3. A `gym.caddy` site file (the gym hostnames → `reverse_proxy 127.0.0.1:<port>`), owned by the gym repo, with
   hostnames from its `.env` like ours.
4. Confirm that `./server.sh rollback` brings the old port bindings back (it is the cut-over's rollback).

## 4. Server checklist, in order

**A. Read-only checks (any time; nothing changes):**

| # | What | Why |
|---|---|---|
| A1 | RAM, swap and disk use; memory per running container | Baseline: is there room for ≈ 0.4–0.75 GB more, or upgrade first? |
| A2 | Docker networks and their subnets | `172.30.0.0/24` must be free |
| A3 | Ports listening on the host | `13000`/`18080` free; pick the gym's loopback port |
| A4 | The gym's compose file, Caddyfile, forwarded-header settings, `release.sh` / `server.sh` | Input for §3; check the gym's Caddy has no catch-all site that would answer for this site's domains |
| A5 | Anonymous access to `ghcr.io` and `github.com` from the server | Decides pull vs. the `docker save \| ssh docker load` fallback (`deploy/README.md §8`) |
| A6 | `docker compose version` ≥ 2.24.4 | `compose.prod.yaml` uses `!reset` and `<<: [a, b]` merges |
| A7 | The gym's last backup and its off-server copy | The safety net for the cut-over |

**B. Preparation that doesn't touch the gym:**

| # | What | Why |
|---|---|---|
| B1 | DNS: `A` records for `mahdiazghandi.ir`, `www.`, `shahramazghandi.ir`, `www.` → the server; no `AAAA`, no CDN | Let's Encrypt needs them; until the edge exists they hit the gym's Caddy, which has no certificate for them (harmless) |
| B2 | User `deploy` with your SSH key, in the `docker` group | Separate owner for this site's files and cron; `docker` membership is root-equivalent, so key-only |
| B3 | Clone to `/opt/personalsite`, create `.env` (`POSTGRES_PASSWORD`, `SITE_HOST`, `REDIRECT_HOSTS`) | `deploy/README.md §5` |
| B4 | Create `/opt/edge` (files, `sites/` group-writable for `docker`, `.env` with `ACME_EMAIL`) — **don't start it** | Ready for the cut-over |
| B5 | Pre-pull `caddy:2.11-alpine`, `postgres:17-alpine` (+ this site's images once tagged) | No downloads during the cut-over |

**C. Gym repository changes (§3)** — released only in D.

**D. Cut-over night (gym closed):** gym backup + off-server copy → put `gym.caddy` in `/opt/edge/sites` → gym release
without 80/443 (downtime starts) → start the edge (it fetches certificates in seconds; downtime ends, ≈ 1 minute) →
check all four gym hostnames over HTTPS, a login, and the client IP in the gym API logs. Rollback: stop the edge,
`./server.sh rollback`.

**E. This site's first deploy (another day):** tag `v0.2.0` → `deploy.sh v0.2.0` (`deploy/README.md §7`). If it
fails, the gym is unaffected: its site file and the edge stay as they are.

**F. After the first deploy:** backups cron + restore drill on the server (`deploy/README.md §10`), tick P4-T4/P4-T6,
measure again after a week (A1) and decide on the RAM upgrade.

## 5. Resources

Estimated memory of this stack (to be measured, not promised): PostgreSQL 100–200 MB, API 100–200 MB, Next.js
150–300 MB, plus the edge Caddy 30–50 MB → ≈ 0.4–0.75 GB. Later features add more: the live demos (P6) and the local
AI model for semantic search (P12, a few hundred MB). Upgrade trigger: swap in use all the time, or the gym panel
slower after this site's deploy → 8 GB RAM. CPU matters less: nothing is built on the server.

## 6. Isolation: if this site is ever compromised (P4-T7)

The gym holds real member and payment data; this site is the newer, more exposed code. The question for every
layer: *if an attacker gets code running inside one of this site's containers, what can they reach?*

| Layer | What is in place | What it stops |
|---|---|---|
| Users | `api` and `frontend` run as non-root (`app`, `node`); PostgreSQL drops to `postgres` | Root inside the container |
| Linux capabilities | `cap_drop: [ALL]` on every service; the db adds back only `CHOWN DAC_OVERRIDE FOWNER SETGID SETUID` for its entrypoint (its server process ends with none) | Raw sockets, mounts, changing other files' owners, … |
| Privilege escalation | `no-new-privileges` | A setuid binary turning the attacker into root |
| Filesystem | `read_only: true`; writable only: the named volumes and small tmpfs mounts (`/tmp`, Next's cache, the db socket) | Dropping tools, changing the app's code, filling the disk outside volumes |
| Processes | `pids_limit: 256`, `cpus: 1`, `mem_limit: 384m`, `oom_score_adj: 500` | Fork bombs; starving the gym of CPU/RAM; the OOM killer picks this site first |
| Network: db | Only on the `internal` network `backend` (api ↔ db); no ports | The frontend can't reach PostgreSQL; the db has no route to the internet or the host |
| Network: other apps | No shared docker network with the gym; apps publish on `127.0.0.1` only; Docker isolates bridge networks from each other | Reaching the gym's containers or its database |
| Host | No docker socket mounted anywhere; the edge's admin API is a root-only unix socket | Controlling Docker or the edge from a container |
| Requests | Edge: bodies > 10 MB → 413; API: bodies > 1 MB → 413, `login` rate limit, lockout, CSRF check (P5-T3) | Memory/CPU exhaustion through requests |

Checked locally on 2026-10-25 with the production compose file: the stack migrates, becomes healthy and serves pages;
writes outside the volumes fail (`Read-only file system`); `CapEff` is 0 for every app process; the frontend can't
resolve `db`; the db can't reach the internet; forwarded headers are still trusted (HSTS on a forwarded https
request); `pg_dump` (backups) and a db restart work.

**Remaining risks, and who handles them:**
- **Shared kernel.** A kernel exploit escapes any container. Keep the server patched (`unattended-upgrades` for
  security updates) — a server-level setting that protects the gym as much as this site.
- **The `deploy` user is in the `docker` group**, which is root on the host. Its SSH key is the most valuable secret
  of this site; key-only login, never on a shared machine.
- **The app's database user is PostgreSQL's superuser** in its own container (the image's default). A SQL injection
  could run programs *inside the db container* (`COPY … TO PROGRAM`), which the table above contains. A separate
  least-privilege role for the app is planned for the security audit (P13).
- **Disk.** Volumes share the server's disk; logs are capped, uploads get size limits in P6. Watch `df -h` after
  launch (F).
- Not used: Docker's user-namespace remapping (`userns-remap`) — a daemon-wide switch that would also change the
  gym's containers and volume ownership.

**After the first deploy, on the server (adds to F):**
```bash
docker inspect personalsite-api-1 personalsite-frontend-1 personalsite-db-1 \
  --format '{{.Name}} ro={{.HostConfig.ReadonlyRootfs}} drop={{.HostConfig.CapDrop}} opt={{.HostConfig.SecurityOpt}} pids={{.HostConfig.PidsLimit}}'
docker exec personalsite-frontend-1 node -e "require('net').connect(5432,'db').on('error',e=>console.log(e.code))"  # EAI_AGAIN
```
