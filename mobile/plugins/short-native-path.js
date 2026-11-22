/**
 * Windows only: the native (C++) build of some libraries makes paths longer than Windows allows, and ninja stops with
 * "mkdir(...): No such file or directory". Putting the CMake build folder at a very short path (C:\b) keeps every
 * path under the limit. On macOS and Linux nothing changes.
 */
// Expo config plugins are CommonJS, loaded by Node before the TypeScript build exists.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { withAppBuildGradle } = require("expo/config-plugins");

const BLOCK = `
    externalNativeBuild {
        cmake {
            if (System.getProperty("os.name").toLowerCase().contains("windows")) {
                buildStagingDirectory new File((System.getenv("SystemDrive") ?: "C:") + "/b")
            }
        }
    }`;

module.exports = function shortNativePath(config) {
  return withAppBuildGradle(config, (c) => {
    let g = c.modResults.contents;
    if (g.includes("buildStagingDirectory")) return c;
    if (!/\nandroid \{/.test(g)) throw new Error("short-native-path: the build.gradle layout changed, update plugins/short-native-path.js");
    g = g.replace(/\nandroid \{/, `\nandroid {${BLOCK}`);
    c.modResults.contents = g;
    return c;
  });
};
