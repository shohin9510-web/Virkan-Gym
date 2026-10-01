#!/usr/bin/env bash
set -euo pipefail
sdk_root="${ANDROID_HOME:-${ANDROID_SDK_ROOT:-}}"
if [[ -z "$sdk_root" || ! -d "$sdk_root" ]]; then
  echo '::error::Android SDK not found. Use the ubuntu-22.04 GitHub-hosted runner.'
  exit 1
fi
sdkmanager="$sdk_root/cmdline-tools/latest/bin/sdkmanager"
if [[ ! -x "$sdkmanager" ]]; then
  sdkmanager=$(find "$sdk_root/cmdline-tools" -path '*/bin/sdkmanager' -type f | sort -V | tail -1)
fi
[[ -x "$sdkmanager" ]] || { echo '::error::sdkmanager is missing'; exit 1; }
# Avoid treating yes/SIGPIPE as the sdkmanager exit code.
set +e
yes | "$sdkmanager" --sdk_root="$sdk_root" --licenses > "${RUNNER_TEMP:-/tmp}/virkan-sdk-licenses.log" 2>&1
sdk_status=${PIPESTATUS[1]}
set -e
if [[ "$sdk_status" != 0 ]]; then
  cat "${RUNNER_TEMP:-/tmp}/virkan-sdk-licenses.log"
  exit "$sdk_status"
fi
"$sdkmanager" --sdk_root="$sdk_root" 'platform-tools' 'platforms;android-35' 'build-tools;35.0.0'
printf 'sdk.dir=%s\n' "$sdk_root" > local.properties
