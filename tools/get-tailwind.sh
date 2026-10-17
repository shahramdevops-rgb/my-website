#!/bin/sh
# Downloads the pinned Tailwind CSS standalone CLI into tools/bin/tailwindcss and verifies its SHA-256.
# Version: tools/tailwind-version. Checksums: tools/tailwind-checksums.txt (the release's sha256sums.txt).
# To upgrade: change the version, replace the checksums file with the new release's sha256sums.txt, rerun.
# Used on Linux/macOS and in the Docker build stage. Windows: tools/get-tailwind.ps1.
set -eu

tools_dir=$(cd "$(dirname "$0")" && pwd)
version=$(tr -d '[:space:]' < "$tools_dir/tailwind-version")
target="$tools_dir/bin/tailwindcss"

case "$(uname -s)" in
  Linux) os=linux ;;
  Darwin) os=macos ;;
  *) echo "Unsupported OS: $(uname -s). On Windows use tools/get-tailwind.ps1." >&2; exit 1 ;;
esac
case "$(uname -m)" in
  x86_64 | amd64) arch=x64 ;;
  aarch64 | arm64) arch=arm64 ;;
  *) echo "Unsupported CPU architecture: $(uname -m)" >&2; exit 1 ;;
esac
asset="tailwindcss-$os-$arch"
# Alpine-style distros use musl instead of glibc and need their own build.
if [ "$os" = linux ] && ls /lib/ld-musl-* > /dev/null 2>&1; then
  asset="$asset-musl"
fi

expected=$(awk -v name="./$asset" '$2 == name { print $1 }' "$tools_dir/tailwind-checksums.txt")
if [ -z "$expected" ]; then
  echo "No checksum for $asset in tools/tailwind-checksums.txt" >&2
  exit 1
fi

sha256() {
  if command -v sha256sum > /dev/null 2>&1; then sha256sum "$1" | awk '{ print $1 }'
  else shasum -a 256 "$1" | awk '{ print $1 }'
  fi
}

# The checksum doubles as a version check: a binary from another version has a different hash.
if [ -f "$target" ] && [ "$(sha256 "$target")" = "$expected" ]; then
  echo "Tailwind CLI $version already present: $target"
  exit 0
fi

mkdir -p "$tools_dir/bin"
url="https://github.com/tailwindlabs/tailwindcss/releases/download/$version/$asset"
echo "Downloading $url"
if command -v curl > /dev/null 2>&1; then
  curl --fail --location --silent --show-error --retry 3 --output "$target.tmp" "$url"
else
  wget --quiet --output-document="$target.tmp" "$url"
fi

actual=$(sha256 "$target.tmp")
if [ "$actual" != "$expected" ]; then
  rm -f "$target.tmp"
  echo "Checksum mismatch for $asset: expected $expected, got $actual" >&2
  exit 1
fi

mv "$target.tmp" "$target"
chmod +x "$target"
echo "Tailwind CLI $version installed: $target"
