#!/usr/bin/env bash
# Fetch the OFFICIAL Gradle Wrapper, not the custom jar from the old project.
set -euo pipefail
cd "$(dirname "$0")/.."
jar=gradle/wrapper/gradle-wrapper.jar
expected=498495120a03b9a6ab5d155f5de3c8f0d986a449153702fb80fc80e134484f17
valid() { [[ -f "$jar" ]] && [[ "$(sha256sum "$jar" | cut -d' ' -f1)" == "$expected" ]]; }
if valid; then exit 0; fi
mkdir -p gradle/wrapper
trap 'rm -f "$jar.tmp"' EXIT
curl --fail --location --retry 3 --connect-timeout 20 --max-time 180 \
  'https://raw.githubusercontent.com/gradle/gradle/v8.9.0/gradle/wrapper/gradle-wrapper.jar' -o "$jar.tmp"
printf '%s  %s\n' "$expected" "$jar.tmp" | sha256sum --check --status
mv "$jar.tmp" "$jar"
