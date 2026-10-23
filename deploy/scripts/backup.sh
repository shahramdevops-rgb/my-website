#!/usr/bin/env bash
# Backup on the server, run nightly by cron (deploy/README.md §10): the database and the uploaded files.
#   deploy/scripts/backup.sh   → $BACKUP_DIR/<UTC time>.db.dump + <UTC time>.uploads.tar.gz, older than 14 days removed
# BACKUP_DIR defaults to /var/backups/personalsite. Restore: deploy/scripts/restore.sh <UTC time>|latest --yes.
# Not included: .env (secrets — keep a copy in a password manager), certificates (the edge proxy gets new ones),
# Data Protection keys (losing them only signs the admin out).
set -euo pipefail

readonly KEEP_DAYS=14

compose() {
	docker compose -f compose.yaml -f compose.prod.yaml "$@"
}

main() {
	cd "$(dirname "${BASH_SOURCE[0]}")/../.."
	local dir=${BACKUP_DIR:-/var/backups/personalsite} id
	id=$(date -u +%Y%m%dT%H%M%SZ)
	# Backups hold personal data (comments, messages from P8/P9): readable by the deploy user only.
	umask 077
	mkdir -p "$dir"

	# Both files get their final names only once both are complete and checked: a failed run leaves no half backup
	# behind (restore.sh latest would otherwise pick a database dump without its uploads).
	local db_file="$dir/$id.db.dump" uploads_file="$dir/$id.uploads.tar.gz"
	# shellcheck disable=SC2064 # expanded now on purpose: the trap runs after main's locals are gone
	trap "rm -f '$db_file.partial' '$uploads_file.partial'" EXIT

	# pg_dump runs inside the db container (same PostgreSQL version as the server, credentials from its env).
	# Custom format (-Fc): compressed, consistent (one snapshot), and pg_restore can restore all of it or parts.
	# shellcheck disable=SC2016 # $POSTGRES_* are expanded by the container's shell, not this one
	compose exec -T db sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc' >"$db_file.partial"
	# A dump that pg_restore can't read is not a backup.
	compose exec -T db pg_restore --list <"$db_file.partial" >/dev/null

	# The uploads volume is read through a throwaway container of the postgres image (Alpine with tar, already on the
	# server — the api image has no shell). Read-only mount: a backup can never change the files.
	local volume=${COMPOSE_PROJECT_NAME:-personalsite}_uploads image
	image=$(compose config --images | grep -E '(^|/)postgres:')
	docker run --rm --volume "$volume:/data:ro" --entrypoint tar "$image" -czf - -C /data . >"$uploads_file.partial"

	mv "$uploads_file.partial" "$uploads_file"
	mv "$db_file.partial" "$db_file"

	# Rotation runs only after a successful backup, so the newest backup always survives, even after a long outage.
	find "$dir" -maxdepth 1 -type f \( -name '*.db.dump' -o -name '*.uploads.tar.gz' \) -mtime +$((KEEP_DAYS - 1)) \
		-print -delete | sed 's/^/removed /'

	echo "backup $id: $(du -h "$db_file" | cut -f1) database, $(du -h "$uploads_file" | cut -f1) uploads → $dir"
}

main "$@"
