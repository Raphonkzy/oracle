# Building the APK and the web version

The API address is **not** in the code. It is given at build time through `ORACLE_API_URL` (read by `mobile/app.config.js`), so this repository can be public. A release build without that address stops with a clear message when it starts.

## APK (Android)

You need JDK 21 and the Android SDK (Android Studio installs it).

```bash
cd mobile
bash scripts/build-apk.sh https://api.example.com
```

The result is `mobile/dist/oracle-<version>.apk`. The APK only talks to the address you give it, and demo mode is off. Raise `version` and `android.versionCode` in `mobile/app.json` for every new APK.

**Signing key.** The key never goes into the repository. `mobile/plugins/release-signing.js` reads four values from `~/.gradle/gradle.properties` (outside the repo): `ORACLE_STORE_FILE`, `ORACLE_STORE_PASSWORD`, `ORACLE_KEY_ALIAS`, `ORACLE_KEY_PASSWORD`. Without them, the build uses the debug key, and its APK cannot update an APK installed from another build. **Keep a copy of the key somewhere safe** (a password manager or an offline drive). If it is lost, a new APK cannot replace the old one on devices.

**Windows.** The native (C++) build of some libraries creates paths longer than Windows allows, and ninja stops with `mkdir(...): No such file or directory`. There are two ways around it:
- Copy the repository to a very short path (for example `C:\o`) and build there.
- `mobile/plugins/short-native-path.js` moves the CMake staging folder to `C:\b`. On macOS and Linux the plugin does nothing.

Manual steps (what `build-apk.sh` runs):

```bash
cd mobile
ORACLE_API_URL=https://api.example.com EXPO_PUBLIC_DEMO_LOGIN=0 CI=1 npx expo prebuild --platform android --no-install
cd android && ORACLE_API_URL=https://api.example.com ./gradlew assembleRelease
```

The address must be set in both steps (prebuild and gradle). The result is `mobile/android/app/build/outputs/apk/release/app-release.apk`.

## Web version

```bash
ORACLE_API_URL=https://api.example.com npm run export:web
```

The result is the static folder `mobile/dist`, which any web server can host. It is a single page (`output: "single"`), so every path must fall back to `index.html`.

What the server must match:
- The web address must be in the server's `CORS_ORIGINS`. That also makes it a trusted origin for sign-in.
- The session cookie is sent with `credentials: "include"`. This works when the web app and the API share a site, for example `app.example.com` and `api.example.com`. Completely different domains need cross-site cookie settings on the server.
- Anyone can read the contents of the web bundle. Never put secrets in `EXPO_PUBLIC_*` variables.
