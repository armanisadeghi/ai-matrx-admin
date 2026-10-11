# E-sign sender editor

The sender's side of e-signature (`/esign/new`, `/esign/<id>` while a draft, `/esign/templates`):
upload, recipients, fields placed on the real PDF, auto-placement, preview, send, templates.
Contract: `common-docs/projects/esign-parity/CONTRACT.md` §1, §12, §15 (frozen shapes in
`features/esign/contract/`). Report: `common-docs/projects/esign-parity/reports/sender.md`.

## Parts
- `components/EsignEditor.tsx` — the editor (left rail Documents · People · Message · Fields, the
  stage, properties on the right; phone = sheets + a bottom bar, placement by tap).
- `components/DocumentStage.tsx` — PdfPreview `layout="continuous"` + a per-page field layer
  (move / resize / marquee / guides, 1 % snap). Fields are fractions of the page.
- `useDraftSync.ts` — autosave: single flight, 800 ms debounce, keepalive flush on hide, local
  mirror restored after refresh, `stale_draft` three-way merge (`merge.ts`) with Keep mine / Take theirs.
- `history.ts` — 50-step undo / redo. `model.ts` — kinds, defaults, warnings.
- `api/types.ts` is the ONE interface to the server; `api/realApi.ts` the real doors;
- `components/EditorHost.tsx` / `EnvelopeRoute.tsx` — the real routes (draft → editor, sent → envelope page).
- `features/esign/templates/` — the template list; `features/esign/envelopes/EnvelopeDetail.tsx` — the sent envelope page.

## Rules
- A draft is composition only (`EnvelopeDraftV1`); access codes never enter it (`esign_draft_set_access_code`: 4-20 characters, stored as a hash). `has_access_code` is the server's note of a stored hash (`access_codes_set`, applied on load); a copy or template keeps the choice "Access code" but never the code, so the recipient shows "Access code needed" and Send is blocked by name until the sender types it again.
- Nothing silently discarded: a conflicting edit asks; an unsaved mirror restores with a toast.
- A signer without a signature field is a warning at Send, never a block.

## Change log
- 2026-10-07 — editor, templates list, envelope page rewrite built against a mock; real doors wired (parity lane, sender).
- 2026-10-10 — Access code is a real option (owner ruling): masked field with show/hide, named Send blocker, flags from stored hashes; the `honestVerification` downgrade is gone (gates lane).
- 2026-10-11 — After Send the editor is replaced IN PLACE by the envelope page (EditorHost sentId): router.replace to the draft's own address changed nothing on screen. Unaccepted Find-fields suggestions persist per envelope in the browser. Recipient cards wrap; own row filled from the profile name.
