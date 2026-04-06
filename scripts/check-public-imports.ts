#!/usr/bin/env npx tsx
/**
 * check-public-imports.ts
 *
 * Legacy script: public routes now use the same `StoreProvider` / `makeStore` as the rest
 * of the app, so guarding against `lib/redux/store` imports is obsolete.
 *
 * Kept as a no-op so `pnpm check:public-imports` remains exit 0.
 */

console.log(
  "check-public-imports: skipped — public routes use the full Redux store by design.\n",
);
process.exit(0);
