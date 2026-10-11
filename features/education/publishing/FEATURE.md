# Education Publishing Engine (`features/education/publishing`)

The DB-backed `/education/learn` study-guide engine plus the Education Hub SEO machinery: a guide
published from the UI is live, indexed, OG-imaged and in the sitemap without a deploy. Public-content
rules (publish / curate / human-verify are three states no write collapses, exam slugs,
`edu_public_decks`, `CertifiedBadge`): IC-12 in `common-docs/systems/education/INTEGRATION_MAP.md`.

## Data model

`education.learn_doc` (canonical base entity + `visibility` + guide payload; migration
`migrations/education_learn_doc.sql`, shareable token `learn_doc`). Content is the canonical
`EduSection[]` vocabulary (`../types.ts`), rendered by the shared `SectionRenderer`.
**Publication = visibility**: `personal` is a draft, `public` is published (anon `pub_read`); there
is no status column. **Writes** go only through `is_super_admin()`-gated SECURITY DEFINER RPCs
(`edu_learn_doc_upsert`, `_set_status`, `_delete` (soft), `_admin_list`) called from `actions.ts`.

## Where it lives

- `queries.ts`: public server reads (anon cookie-free client, `unstable_cache` tag
  `education-learn-docs`, ISR); `actions.ts` mutations call `updateTag` after the RPC.
- `sitemap.ts` -> `app/sitemap.xml/route.ts` (dynamic, so a database outage cannot fail a build).
  OG: learn docs use route handler `/education/learn/og/[...slug]` (a catch-all cannot host
  file-based OG); axis families use `opengraph-image.tsx`; renderer `ogImage.tsx`.
- `components/LearnDocAdmin.tsx` (`/education/learn/admin`, super-admin self-gated; surface
  `matrx-user/education-learn-authoring` with ask-policy draft targets that stage into the editor —
  slug, publish and delete are not targets), `SectionBlockEditor.tsx` (Advanced JSON is an escape
  hatch, not a second path), `ExamContentPipeline.tsx` + `examContentPipeline.ts` +
  `verifyGeneratedDeck.ts` (super-admin batch authoring of exam decks).
- SEO: learn `[...slug]` and axis `[slug]` use `generateStaticParams` + `revalidate=3600`
  (`axisStaticParams` in `route-helpers.ts`); `LearnArticle` emits `Article`, `AxisDetail` emits
  `FAQPage` (any `faq` section) + `Course` (subjects / exam-prep).

## Invariants

- No dual content path: the DB is the only source. Writes never bypass the RPCs.
- Never a raw per-slug `unstable_cache` with static keyParts (collapses every slug onto one entry).
- Anon read needs BOTH the schema GRANT and the `pub_read` policy.
- Every save passes `validateAuthoredSections` (kind + every renderer-consumed field, e.g. FAQ
  `{q, a}`) before the upsert; malformed blocks disable Save/Publish. Agent writes share the gate
  (`validateSectionFields`).
- Batch exam content fails closed: an empty/failed IC-3 retrieval, a citation id outside the
  retrieved set, a missing excerpt, or any non-`verified` card verdict leaves that deck private and
  disables publish. Generation/verification use `flashcards.generate_from_source` /
  `flashcards.verify_against_source`.
- Publish is a visible human transition: the pipeline drafts and verifies privately; the button makes
  the set public as an AI-built starter and never writes WP9's human-verification fields or claims Certified.
- Interrupted work is recoverable: the admin recovers the newest private draft per exam and plan,
  generates only missing plans, never changes visibility or duplicates. Persisted verdicts are reused
  only while `verified` and `verifiedBack` equals the current answer. A zero-card shell is rejected
  visibly; verification refuses zero-card sets.

Open: grounded guide drafting waits on a requested `education.learn_doc_draft` mandate (not yet
declared) returning strict `EduSection[]`; it stays a draft until the admin publishes.

Cross-repo system-of-record: /Users/armanisadeghi/code/common-docs/systems/education/STATE.md — read it before touching this feature in ANY repo.
