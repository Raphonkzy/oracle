/**
 * Signs the release APK with your own key. The key never lives in this repository:
 * the paths and passwords come from ~/.gradle/gradle.properties (ORACLE_STORE_FILE, ORACLE_STORE_PASSWORD,
 * ORACLE_KEY_ALIAS, ORACLE_KEY_PASSWORD). Without them the build falls back to the debug key, which is fine for trying
 * the app but cannot be updated later from a different build machine.
 */
// Expo config plugins are CommonJS, loaded by Node before the TypeScript build exists.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { withAppBuildGradle } = require("expo/config-plugins");

module.exports = function releaseSigning(config) {
  return withAppBuildGradle(config, (c) => {
    let g = c.modResults.contents;
    if (g.includes("ORACLE_STORE_FILE")) return c;
    g = g.replace(
      /signingConfigs \{\r?\n(\s*)debug \{/,
      (_m, indent) =>
        `signingConfigs {\n${indent}release {\n${indent}    if (project.hasProperty('ORACLE_STORE_FILE')) {\n${indent}        storeFile file(ORACLE_STORE_FILE)\n${indent}        storePassword ORACLE_STORE_PASSWORD\n${indent}        keyAlias ORACLE_KEY_ALIAS\n${indent}        keyPassword ORACLE_KEY_PASSWORD\n${indent}    }\n${indent}}\n${indent}debug {`,
    );
    g = g.replace(
      /(\/\/ see https:\/\/reactnative\.dev\/docs\/signed-apk-android\.\r?\n\s*)signingConfig signingConfigs\.debug/,
      "$1signingConfig project.hasProperty('ORACLE_STORE_FILE') ? signingConfigs.release : signingConfigs.debug",
    );
    if (!g.includes("signingConfigs.release")) throw new Error("release-signing: the build.gradle layout changed, update plugins/release-signing.js");
    c.modResults.contents = g;
    return c;
  });
};
