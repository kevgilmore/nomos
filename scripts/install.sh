#!/usr/bin/env bash
set -euo pipefail
repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
case "$(uname -s)" in
  Linux) platform=linux ;;
  Darwin) platform=darwin ;;
  *) echo "Setup supports Ubuntu/WSL and macOS." >&2; exit 1 ;;
esac
case "$(uname -m)" in
  x86_64|amd64) arch=x64 ;;
  arm64|aarch64) arch=arm64 ;;
  *) echo "Unsupported CPU architecture." >&2; exit 1 ;;
esac
if ! command -v node >/dev/null || ! node -e 'process.exit(Number(process.versions.node.split(".")[0]) >= 22 ? 0 : 1)' || ! command -v npm >/dev/null; then
  for tool in curl tar; do
    command -v "$tool" >/dev/null || { echo "Install $tool first (Ubuntu: sudo apt-get install curl ca-certificates tar)." >&2; exit 1; }
  done
  temp_dir="$(mktemp -d)"
  trap 'rm -rf "$temp_dir"' EXIT
  base_url=https://nodejs.org/dist/latest-v22.x
  curl --fail --silent --show-error --location "$base_url/SHASUMS256.txt" -o "$temp_dir/SHASUMS256.txt"
  archive="$(awk -v suffix="-$platform-$arch.tar.gz" 'index($2,suffix) && substr($2,length($2)-length(suffix)+1)==suffix {print $2}' "$temp_dir/SHASUMS256.txt")"
  [[ "$archive" =~ ^node-v22\.[0-9]+\.[0-9]+-(linux|darwin)-(x64|arm64)\.tar\.gz$ ]] || { echo "Could not resolve Node.js archive." >&2; exit 1; }
  curl --fail --silent --show-error --location "$base_url/$archive" -o "$temp_dir/$archive"
  (
    cd "$temp_dir"
    awk -v name="$archive" '$2 == name' SHASUMS256.txt > checksum
    if command -v sha256sum >/dev/null; then sha256sum -c checksum
    else shasum -a 256 -c checksum; fi
  )
  node_dir="$HOME/.local/share/nomos/${archive%.tar.gz}"
  mkdir -p "$node_dir"
  tar -xzf "$temp_dir/$archive" --strip-components=1 -C "$node_dir"
  export PATH="$node_dir/bin:$PATH"
fi
node "$repo_root/cli/install.mjs" "$@"
