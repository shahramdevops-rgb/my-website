# Downloads the pinned Tailwind CSS standalone CLI into tools/bin/tailwindcss.exe and verifies its SHA-256.
# Version: tools/tailwind-version. Checksums: tools/tailwind-checksums.txt (the release's sha256sums.txt).
# To upgrade: change the version, replace the checksums file with the new release's sha256sums.txt, rerun.
# Linux/macOS and Docker: tools/get-tailwind.sh.
$ErrorActionPreference = 'Stop'

$toolsDir = $PSScriptRoot
$version = (Get-Content (Join-Path $toolsDir 'tailwind-version') -Raw).Trim()
$target = Join-Path $toolsDir 'bin/tailwindcss.exe'

# Tailwind ships only an x64 Windows build; Windows on ARM runs it through emulation.
$asset = 'tailwindcss-windows-x64.exe'

$expected = Get-Content (Join-Path $toolsDir 'tailwind-checksums.txt') |
    ForEach-Object { $hash, $name = $_ -split '\s+', 2; if ($name -eq "./$asset") { $hash } } |
    Select-Object -First 1
if (-not $expected) {
    throw "No checksum for $asset in tools/tailwind-checksums.txt"
}

# The checksum doubles as a version check: a binary from another version has a different hash.
if ((Test-Path $target) -and (Get-FileHash $target -Algorithm SHA256).Hash -eq $expected) {
    Write-Host "Tailwind CLI $version already present: $target"
    return
}

New-Item -ItemType Directory -Force (Join-Path $toolsDir 'bin') | Out-Null
$url = "https://github.com/tailwindlabs/tailwindcss/releases/download/$version/$asset"
$temp = "$target.tmp"
Write-Host "Downloading $url"
# Without this, Windows PowerShell 5.1 renders a progress bar that makes the download many times slower.
$ProgressPreference = 'SilentlyContinue'
Invoke-WebRequest -Uri $url -OutFile $temp -UseBasicParsing

$actual = (Get-FileHash $temp -Algorithm SHA256).Hash
if ($actual -ne $expected) {
    Remove-Item $temp -Force
    throw "Checksum mismatch for ${asset}: expected $expected, got $actual"
}

Move-Item $temp $target -Force
Write-Host "Tailwind CLI $version installed: $target"
