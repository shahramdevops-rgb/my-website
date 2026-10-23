#!/usr/bin/env bash
# Deploy one release on the server (architecture.md §9, deploy/README.md). Run as the deploy user, from anywhere:
#   deploy/scripts/deploy.sh v0.1.0             check out the tag, pull images, migrate, restart, health check, prune
#   deploy/scripts/deploy.sh v0.1.0 --offline   same, but never contacts GitHub/GHCR: the tag was pushed to this
#                                               clone and the images were loaded with `docker load` (deploy/README.md)
# Rollback = run it again with the previous tag (printed at the end). Migrations only go forward: rolling back over
# a release that changed the database needs the backup (P4-T5).
set -euo pipefail

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

# The site answers over HTTPS through Caddy: liveness of the API (/health) and a real page from Next.js (/fa).
# --resolve sends the request to this machine under the real hostname, so DNS and hairpin routing don't matter,
# but the certificate must be valid. A first deploy waits for Let's Encrypt, hence the retries (≈ 2 minutes).
check_health() {
	local host=$1 path
	local -a curl_opts=(--fail --silent --show-error --output /dev/null --max-time 5 --resolve "$host:443:127.0.0.1")
	# Local try-out only: Caddy signs "localhost" with its own CA (deploy/Caddyfile), which curl doesn't trust.
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

	# The repository root: compose files, deploy/Caddyfile and .env live there.
	cd "$(dirname "${BASH_SOURCE[0]}")/../.."
	[[ -f .env ]] || die ".env is missing in $PWD (deploy/README.md, step 'Configure')"

	local previous host
	previous=$(env_value IMAGE_TAG)
	host=$(env_value SITE_HOST)
	[[ -n $host ]] || die "SITE_HOST is not set in .env"

	# Compose files and Caddyfile must belong to the same release as the images.
	log "Checking out $tag"
	if ! git diff --quiet || ! git diff --cached --quiet; then
		die "tracked files were changed on the server (git status); config belongs in .env, not in the repo"
	fi
	if [[ $offline == false ]]; then
		git fetch --quiet --tags --force origin
	fi
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

	# Starts db if needed (depends_on), applies pending EF Core migrations with the new api image, then exits.
	log "Migrating the database"
	compose run --rm api --migrate

	# --wait: returns once api and frontend report healthy (their image HEALTHCHECKs), fails if one turns unhealthy.
	log "Starting $tag"
	save_image_tag "$tag"
	compose up --detach --remove-orphans --wait --wait-timeout 180

	log "Health check over HTTPS"
	if ! check_health "$host"; then
		echo "Look at: docker compose -f compose.yaml -f compose.prod.yaml ps / logs --tail 100 caddy api frontend" >&2
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
