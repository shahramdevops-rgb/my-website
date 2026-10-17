# Dev: recompiles wwwroot/css/app.css whenever Styles/ or a .cshtml file changes. Run next to `dotnet watch`.
$ErrorActionPreference = 'Stop'

& (Join-Path $PSScriptRoot 'get-tailwind.ps1')

$web = Join-Path $PSScriptRoot '../src/PersonalSite.Web'
& (Join-Path $PSScriptRoot 'bin/tailwindcss.exe') `
    --input (Join-Path $web 'Styles/app.css') `
    --output (Join-Path $web 'wwwroot/css/app.css') `
    --watch
