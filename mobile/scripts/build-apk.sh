#!/usr/bin/env bash
# Builds a release APK of the Oracle app on this computer.
#   bash scripts/build-apk.sh https://oracle.example.com
# The address is the public HTTPS address of your API. It is written into the app (ORACLE_API_URL, see app.config.js),
# so the APK only talks to that server. Needs JDK 21 and the Android SDK (Android Studio installs the SDK).
# The signing key comes from ~/.gradle/gradle.properties (see plugins/release-signing.js).
set -euo pipefail
cd "$(dirname "$0")/.."

URL="${1:-}"
if [[ ! "$URL" =~ ^https://[^/]+/?$ ]]; then
  echo "Give the public https address of your API, for example: bash scripts/build-apk.sh https://oracle.example.com" >&2
  exit 1
fi

# Find Java and the Android SDK when they are not on the PATH.
if ! command -v java >/dev/null 2>&1; then
  for d in "/c/Program Files/Eclipse Adoptium"/jdk-21* "/c/Program Files/Eclipse Adoptium"/jdk-17* "/c/Program Files/Android/Android Studio/jbr"; do
    [ -x "$d/bin/java.exe" ] && export JAVA_HOME="$d" && export PATH="$JAVA_HOME/bin:$PATH" && break
  done
fi
command -v java >/dev/null 2>&1 || { echo "Java (JDK 17 or 21) was not found." >&2; exit 1; }
export ANDROID_HOME="${ANDROID_HOME:-$LOCALAPPDATA/Android/Sdk}"
[ -d "$ANDROID_HOME" ] || { echo "The Android SDK was not found at $ANDROID_HOME" >&2; exit 1; }

export ORACLE_API_URL="${URL%/}"
export EXPO_PUBLIC_DEMO_LOGIN=0   # the demo mode never ships
export NODE_ENV=production CI=1

npx expo prebuild --platform android --clean --no-install
# prebuild rewrites the "android" script in package.json; put it back so the repository stays as it was.
git checkout -- package.json 2>/dev/null || true

(cd android && ./gradlew assembleRelease --no-daemon)

VERSION="$(node -p "require('./app.json').expo.version")"
mkdir -p dist
cp android/app/build/outputs/apk/release/app-release.apk "dist/oracle-$VERSION.apk"
echo "Done: mobile/dist/oracle-$VERSION.apk (talks to $ORACLE_API_URL)"
