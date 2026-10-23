#!/usr/bin/env bash
# Deploy one release on the server (architecture.md §9, deploy/README.md). Run as the deploy user, from anywhere:
#   deploy/scripts/deploy.sh v0.2.0             check out the tag, pull images, migrate, restart, route through the
#                                               edge proxy, health check, prune
#   deploy/scripts/deploy.sh v0.2.0 --offline   same, but never contacts GitHub/GHCR: the tag was pushed to this
#                                               clone and the images were loaded with `docker load` (deploy/README.md)
# Needs the server's shared edge proxy running (deploy/edge, ADR-028); releases before it (v0.1.0) are refused.
# Rollback = run it again with the previous tag (printed at the end). Migrations only go forward: rolling back over
# a release that changed the database needs a restore (restore.sh, deploy/README.md §10).
set -euo pipefail

# The shared edge proxy: its container (deploy/edge/compose.yaml) and, in its sites/ directory, this site's file.
readonly EDGE_CONTAINER=edge-caddy
readonly EDGE_SITE_FILE=personalsite.caddy

compose() {
	docker compose -f compose.yaml -f compose.prod.yaml "$@"
}

log() {
	printf '\n==> %s\n' "$*"
}

die() {
	printf 'deploy: %s\n' "$*" >&2
	exit 1
}

# Value of KEY in .env (last line wins, like compose), without surrounding quotes; empty if missing.
env_value() {
	local value
	value=$(grep -E "^$1=" .env | tail -n 1 | cut -d= -f2- || true)
	# A .env saved on Windows has CRLF line ends.
	value=${value%$'\r'}
	value=${value%\"}
	value=${value#\"}
	printf '%s' "$value"
}

# Sets IMAGE_TAG in .env, so later `docker compose ps/logs/up` on the server (by hand, after a reboot) use the
# release that is running instead of failing on a missing variable.
save_image_tag() {
	if grep -qE '^IMAGE_TAG=' .env; then
		sed -i -E "s/^IMAGE_TAG=.*/IMAGE_TAG=$1/" .env
	else
		printf 'IMAGE_TAG=%s\n' "$1" >>.env
	fi
}

# The site answers over HTTPS through the edge: liveness of the API (/health) and a real page from Next.js (/fa).
# --resolve sends the request to this machine under the real hostname, so DNS and hairpin routing don't matter,
# but the certificate must be valid. A first deploy waits for Let's Encrypt, hence the retries (≈ 2 minutes).
check_health() {
	local host=$1 path
	local -a curl_opts=(--fail --silent --show-error --output /dev/null --max-time 5 --resolve "$host:443:127.0.0.1")
	# Local try-out only: Caddy signs "localhost" with its own CA (deploy/personalsite.caddy), which curl doesn't trust.
	if [[ $host == localhost || $host == *.localhost ]]; then
		curl_opts+=(--insecure)
	fi
	for path in /health /fa; do
		for _ in $(seq 1 24); do
			if curl "${curl_opts[@]}" "https://$host$path" 2>/dev/null; then
				echo "ok  https://$host$path"
				continue 2
			fi
			sleep 5
		done
		curl "${curl_opts[@]}" "https://$host$path" || true
		return 1
	done
}

# The edge must be up and its sites/ directory writable before anything changes, so a deploy never migrates and
# restarts the stack only to find it can't route to it.
check_edge() {
	local sites=$1
	[[ $(docker inspect --format '{{.State.Running}}' "$EDGE_CONTAINER" 2>/dev/null) == true ]] ||
		die "the edge proxy ($EDGE_CONTAINER) is not running (deploy/README.md, 'Shared edge proxy')"
	[[ -d $sites && -w $sites ]] || die "$sites is missing or not writable for $(id -un) (EDGE_DIR in .env)"
}

# Routes this site through the edge: fills the {{...}} tokens of deploy/personalsite.caddy with the hostnames from
# .env and the loopback ports compose published, writes it to the edge's sites/ and reloads the edge. Caddy checks
# the whole new config before switching to it, so a broken file is refused while the edge keeps serving the old
# config; the old file is then put back, so the next edge restart doesn't trip over it either.
install_edge_site() {
	local sites=$1 host=$2 redirects=$3 api frontend content output
	api=$(compose port api 8080)
	frontend=$(compose port frontend 3000)
	[[ -n $api && -n $frontend ]] || die "api/frontend publish no port (compose.prod.yaml)"

	content=$(<deploy/personalsite.caddy)
	content=${content//'{{SITE_HOST}}'/$host}
	content=${content//'{{REDIRECT_HOSTS}}'/$redirects}
	content=${content//'{{API_UPSTREAM}}'/$api}
	content=${content//'{{FRONTEND_UPSTREAM}}'/$frontend}
	[[ $content != *'{{'* ]] || die "deploy/personalsite.caddy has a token deploy.sh doesn't fill"

	local target=$sites/$EDGE_SITE_FILE
	# Neither name ends in .caddy, so the edge never imports them (its Caddyfile: import sites/*.caddy).
	local previous=$target.previous staged=$target.new
	printf '%s\n' "$content" >"$staged"
	if [[ -f $target ]]; then cp -p "$target" "$previous"; else rm -f "$previous"; fi
	mv "$staged" "$target"

	if ! output=$(docker exec "$EDGE_CONTAINER" caddy reload --config /etc/caddy/Caddyfile 2>&1); then
		printf '%s\n' "$output" >&2
		if [[ -f $previous ]]; then mv "$previous" "$target"; else rm -f "$target"; fi
		die "the edge refused the new site file; it keeps serving the previous config"
	fi
	echo "edge: $host → frontend $frontend, api $api"
}

# Removes this app's images except the release now running and the previous one (kept for a quick rollback).
# Other images on the host (postgres, caddy, anything unrelated) are left alone, apart from dangling layers.
prune_images() {
	local keep_current=$1 keep_previous=$2 image repo ref
	for image in $(compose config --images | grep '/personalsite-'); do
		repo=${image%:*}
		for ref in $(docker image ls "$repo" --format '{{.Repository}}:{{.Tag}}'); do
			if [[ $ref != "$repo:$keep_current" && $ref != "$repo:$keep_previous" ]]; then
				docker image rm "$ref" >/dev/null && echo "removed $ref"
			fi
		done
	done
	docker image prune --force >/dev/null
}

main() {
	local tag="" offline=false arg
	for arg in "$@"; do
		case $arg in
		--offline) offline=true ;;
		-*) die "unknown option $arg" ;;
		*) tag=$arg ;;
		esac
	done
	# Release tags only (the release workflow's v* tags; rules.md §6 forbids "latest").
	[[ $tag =~ ^v[0-9]+\.[0-9]+\.[0-9]+(-[0-9A-Za-z.-]+)?$ ]] ||
		die "usage: deploy.sh vX.Y.Z [--offline]"

	# The repository root: compose files, deploy/personalsite.caddy and .env live there.
	cd "$(dirname "${BASH_SOURCE[0]}")/../.."
	[[ -f .env ]] || die ".env is missing in $PWD (deploy/README.md, step 'Configure')"

	local previous host redirects sites
	previous=$(env_value IMAGE_TAG)
	host=$(env_value SITE_HOST)
	redirects=$(env_value REDIRECT_HOSTS)
	sites=$(env_value EDGE_DIR)
	sites=${sites:-/opt/edge}/sites
	# Hostnames go into the edge's config as text: letters, digits, dots, hyphens (and ", " between redirect hosts).
	[[ $host =~ ^[A-Za-z0-9.-]+$ ]] || die "SITE_HOST in .env must be one hostname, e.g. mahdiazghandi.ir"
	[[ $redirects =~ ^[A-Za-z0-9.-]+([ ,]+[A-Za-z0-9.-]+)*$ ]] ||
		die "REDIRECT_HOSTS in .env must be comma-separated hostnames"
	check_edge "$sites"

	# Compose files and the edge site file must belong to the same release as the images.
	log "Checking out $tag"
	if ! git diff --quiet || ! git diff --cached --quiet; then
		die "tracked files were changed on the server (git status); config belongs in .env, not in the repo"
	fi
	if [[ $offline == false ]]; then
		git fetch --quiet --tags --force origin
	fi
	git rev-parse --quiet --verify "refs/tags/$tag" >/dev/null || die "no tag $tag in this clone"
	# Releases before the edge proxy bring their own Caddy on 80/443, which would fight the edge for the ports.
	git cat-file -e "refs/tags/$tag:deploy/personalsite.caddy" 2>/dev/null ||
		die "$tag predates the shared edge proxy (ADR-028) and can't run on this server"
	git -c advice.detachedHead=false checkout --quiet --detach "refs/tags/$tag"

	# The tag is passed in the environment for this run; .env is updated only once the new images are migrated.
	export IMAGE_TAG=$tag
	compose config --quiet

	if [[ $offline == false ]]; then
		log "Pulling images"
		compose pull --quiet
	else
		log "Checking that every image is already loaded"
		local image missing=0
		for image in $(compose config --images); do
			docker image inspect "$image" >/dev/null 2>&1 || {
				echo "missing: $image"
				missing=1
			}
		done
		((missing == 0)) || die "load the missing images first (deploy/README.md, 'Without GitHub')"
	fi

	# Starts db if needed (depends_on), applies pending EF Core migrations with the new api image, creates the admin
	# account if the database has none (Admin__* in .env, P5-T2), then exits. A half-filled Admin__* stops here.
	log "Migrating the database"
	compose run --rm api --migrate

	# --wait: returns once api and frontend report healthy (their image HEALTHCHECKs), fails if one turns unhealthy.
	log "Starting $tag"
	save_image_tag "$tag"
	compose up --detach --remove-orphans --wait --wait-timeout 180

	log "Routing $host through the edge proxy"
	install_edge_site "$sites" "$host" "$redirects"

	log "Health check over HTTPS"
	if ! check_health "$host"; then
		echo "Look at: docker logs --tail 100 $EDGE_CONTAINER (certificates)," \
			"docker compose -f compose.yaml -f compose.prod.yaml ps / logs --tail 100 api frontend" >&2
		[[ -n $previous && $previous != "$tag" ]] && echo "Rollback: deploy/scripts/deploy.sh $previous" >&2
		die "$tag is running but the site does not answer over HTTPS"
	fi

	log "Removing old images"
	prune_images "$tag" "$previous"

	log "Deployed $tag"
	if [[ -n $previous && $previous != "$tag" ]]; then
		echo "Previous release: $previous (rollback: deploy/scripts/deploy.sh $previous)"
	fi
}

# `exit` sits on the same line as the call: bash has read this whole line before `git checkout` above replaces
# this file, so it never reads a mix of two versions of the script.
main "$@"; exit
