# @oracle/core

Pure logic shared by the Oracle app and server. It has no database and no UI. Its only dependency is `zod`.

It contains: dates and month cycles (`dates`), statistics and insights (`stats`, `insight-text`), validation (`validation`), money (`money`, `amount`), account types (`account-types`), category names in 8 languages (`category-names`), number checks for the AI (`grounding`), and the app guide the assistant reads (`app-guide`, `guide-labels`).

`guide-labels.ts` is generated from the app translations (`npm run check:i18n -- --write-guide` in the root). Do not edit it by hand.

```bash
npm test         # tests
npm run typecheck
```

This package is used directly from TypeScript (its `exports` point to `src/index.ts`), so consumers must be able to read TypeScript (Metro, tsx).
