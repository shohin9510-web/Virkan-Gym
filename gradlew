#!/usr/bin/env sh
# Small launcher for the official, SHA-256-verified Gradle Wrapper.
set -eu
APP_HOME=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
bash "$APP_HOME/scripts/fetch-wrapper.sh"
JAVA_EXE=java
if [ -n "${JAVA_HOME:-}" ]; then JAVA_EXE="$JAVA_HOME/bin/java"; fi
exec "$JAVA_EXE" -Dfile.encoding=UTF-8 -classpath "$APP_HOME/gradle/wrapper/gradle-wrapper.jar" org.gradle.wrapper.GradleWrapperMain "$@"
