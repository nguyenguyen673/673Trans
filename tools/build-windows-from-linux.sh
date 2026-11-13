#!/usr/bin/env bash
# Build 673Trans.exe for Windows (x64) from a Linux machine / cloud container.
# This is how the first build of this fork was made. On a real Windows PC you
# do not need this script: see HUONG-DAN.md ("Tự build trên Windows").
#
# Needs: Node 18+, pnpm, Rust (rustup), clang/lld (LLVM 16+ with clang-cl, lld-link, llvm-rc).
set -euo pipefail
cd "$(dirname "$0")/.."

rustup target add x86_64-pc-windows-msvc
command -v cargo-xwin >/dev/null || cargo install cargo-xwin --locked

# clang-cl / lld-link / llvm-rc must be on PATH (Ubuntu keeps them here)
for d in /usr/lib/llvm-*/bin; do [ -d "$d" ] && PATH="$d:$PATH"; done
export PATH

pnpm install
# -b none: no installer, just the exe (it is fully self contained)
pnpm tauri build --runner cargo-xwin --target x86_64-pc-windows-msvc -b none

echo
echo "Done: src-tauri/target/x86_64-pc-windows-msvc/release/673Trans.exe"
