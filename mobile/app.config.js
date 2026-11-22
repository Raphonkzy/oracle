/**
 * Adds what must not be written in the repository to app.json. The address of the API is one of them:
 * it is given when the app is built (ORACLE_API_URL=https://api.example.com), see docs/BUILD.md.
 * A development run does not need it: it uses EXPO_PUBLIC_API_URL from mobile/.env instead.
 */
module.exports = ({ config }) => ({
  ...config,
  extra: { ...config.extra, apiUrl: (process.env.ORACLE_API_URL ?? "").trim().replace(/\/$/, "") || undefined },
});
