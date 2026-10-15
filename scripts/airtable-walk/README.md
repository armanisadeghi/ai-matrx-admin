# Airtable parity walk harness

Reusable by the AT-WALK lanes (parity doc: common-docs/systems/data/custom-data/AIRTABLE-PARITY.md).

- `setup.mjs` declares admin@admin.com's disposable "Catering Clients" and "Catering Events" tables (every field type). Archive after.
- `store.mjs` returns `{ sb, client }`, a records client signed in as admin, to seed or read data through the store doors.
- `lib.mjs` starts headless Playwright signed in as admin (or test@test.com with `start(true)`) against `ORIGIN` (the shared preview hostname) and opens `/data/<id>`.
