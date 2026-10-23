#!/usr/bin/env bash
# Restore a backup made by backup.sh (deploy/README.md §10). Replaces the whole database and all uploaded files.
#   deploy/scripts/restore.sh latest                  shows what would be restored, changes nothing
#   deploy/scripts/restore.sh 20261023T031500Z --yes  restores that backup
# The current state is backed up first (a backup that is itself restorable), then api and frontend are stopped,
# the database is dropped and re-created from the dump, the uploads volume is replaced, and the stack is started.
# On a new server: deploy the release first (deploy.sh creates the volumes and containers), then restore.
set -euo pipefail

compose() {
	docker compose -f compose.yaml -f compose.prod.yaml "$@"
}

log() {
	printf '\n==> %s\n' "$*"
}

die() {
	printf 'restore: %s\n' "$*" >&2
	exit 1
}

main() {
	local id="" yes=false arg
	for arg in "$@"; do
		case $arg in
		--yes) yes=true ;;
		-*) die "unknown option $arg" ;;
		*) id=$arg ;;
		esac
	done
	[[ -n $id ]] || die "usage: restore.sh <backup time>|latest [--yes]"

	local scripts dir
	scripts=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
	cd "$scripts/../.."
	dir=${BACKUP_DIR:-/var/backups/personalsite}

	if [[ $id == latest ]]; then
		# The names are UTC times (20261023T031500Z), so the last one in sort order is the newest.
		id=$(find "$dir" -maxdepth 1 -name '*.db.dump' -printf '%f\n' | sort | tail -n 1)
		id=${id%.db.dump}
		[[ -n $id ]] || die "no backups in $dir"
	fi
	local db_file="$dir/$id.db.dump" uploads_file="$dir/$id.uploads.tar.gz"
	[[ -f $db_file ]] || die "$db_file not found (ls $dir)"

	echo "Backup $id: database $(du -h "$db_file" | cut -f1)$([[ -f $uploads_file ]] && echo ", uploads $(du -h "$uploads_file" | cut -f1)")"
	echo "This REPLACES the current database and uploaded files. The site is down for the duration."
	[[ $yes == true ]] || die "nothing changed; add --yes to restore"

	# A safety net in case the wrong backup was picked. A broken current database must not block the restore.
	log "Backing up the current state first"
	"$scripts/backup.sh" || echo "warning: the current state could not be backed up; restoring anyway" >&2

	# Nothing may write to the database or the files while they are replaced. Caddy keeps answering (502).
	log "Stopping frontend and api"
	compose stop frontend api

	# Drop + create gives an empty database, so the restore never mixes with what was there. --force ends any
	# connection that is still open. The tables, data and EF Core's migration history all come from the dump.
	log "Replacing the database"
	# shellcheck disable=SC2016 # $POSTGRES_* are expanded by the container's shell, not this one
	compose exec -T db sh -c \
		'dropdb -U "$POSTGRES_USER" --force --if-exists "$POSTGRES_DB" && createdb -U "$POSTGRES_USER" "$POSTGRES_DB"'
	# --single-transaction + --exit-on-error: either the whole dump is restored or nothing is.
	# shellcheck disable=SC2016
	compose exec -T db sh -c \
		'pg_restore -U "$POSTGRES_USER" -d "$POSTGRES_DB" --no-owner --single-transaction --exit-on-error' <"$db_file"

	if [[ -f $uploads_file ]]; then
		log "Replacing the uploaded files"
		local volume=${COMPOSE_PROJECT_NAME:-personalsite}_uploads image
		image=$(compose config --images | grep -E '(^|/)caddy:')
		# tar keeps the numeric owner from the backup (the api's non-root user), so the api can still write.
		docker run --rm -i --volume "$volume:/data" --entrypoint sh "$image" \
			-c 'find /data -mindepth 1 -delete && tar -xzf - -C /data' <"$uploads_file"
	else
		echo "warning: $uploads_file not found; uploaded files left as they are" >&2
	fi

	log "Starting the stack"
	compose up --detach --wait --wait-timeout 180

	log "Restored $id"
}

main "$@"
