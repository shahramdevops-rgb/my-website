#!/bin/sh
# Dev: recompiles wwwroot/css/app.css whenever Styles/ or a .cshtml file changes. Run next to `dotnet watch`.
set -eu

tools_dir=$(cd "$(dirname "$0")" && pwd)
"$tools_dir/get-tailwind.sh"

web="$tools_dir/../src/PersonalSite.Web"
exec "$tools_dir/bin/tailwindcss" \
  --input "$web/Styles/app.css" \
  --output "$web/wwwroot/css/app.css" \
  --watch
