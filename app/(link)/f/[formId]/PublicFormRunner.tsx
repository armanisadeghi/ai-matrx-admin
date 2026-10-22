"use client";

// app/(link)/f/[formId]/PublicFormRunner.tsx — THE ONLY CLIENT CODE ON THE
// PUBLIC FORM PAGE, and it is a mount and a few fetches.
//
// `FormRunner` is the SAME component the owner sees inside the app. Its public
// arm takes the Fields the server already resolved and a submit port, so it
// mounts no record-store client at all: the browser on this page holds no key,
// knows no organization id and cannot read a row. Everything it knows, the
// server handed it.
//
// A SCREEN IS ABSENT OR HONEST. A refused answer shows the STORE's own sentence
// — "This form needs full name, date of birth." — because `custom.form_submit`
// names every missing question so a screen can point at it, rather than one
// generic error beside a form with twenty questions.
//
// AND A PERSON NEVER LOSES HER PLACE (lane S7-PRIME). A moment after each change
// the answers so far are saved through `custom.form_draft_save` under a secret
// only this browser holds (kept in localStorage) — never a record, never a
// submission. The page offers that place as a link, so she can finish on another
// device; the link carries the secret in the URL FRAGMENT (`#resume=…`), which no
// server or log ever sees. Coming back — same browser or the link — reads the
// place through `custom.form_draft_read` and the form opens where she stopped.
// Sending uses the place up: the secret travels as the submission's client key,
// and the store marks the place sent in the same transaction.

import { useClipboard } from "@ai-matrx/kit/clipboard";
import { copyNotify } from "@/lib/clipboard/copy-notify";
import { useCallback, useEffect, useRef, useState } from "react";
import { FormRunner, RecordsUiProvider } from "@/features/data-tables/records-ui-host/recordsUiLazy";
import { endingsFromDocument, hiddenFromLink, themeFromDocument, welcomeFromDocument } from "@ai-matrx/records-ui/helpers";
import type { ComponentProps } from "react";
import type { FormSubmitOutcome, RecordsUiHost } from "@ai-matrx/records-ui";
import { RichContentStaticInline } from "@ai-matrx/rich-content/levels/RichContentStaticProse";
import type { Field, RuleExpression } from "@ai-matrx/records";

import type { PublicForm } from "@/features/forms/service";
import { PaymentNotice, type PaymentNoticeProps } from "@/features/payments/PaymentNotice";
import { replaceAddressWithoutNavigating } from "@/lib/url-state/addressWithoutNavigating";
import { ErrorAlchemyMenu } from "@/components/errors/ErrorAlchemyMenu";
import { formatRelativeTime } from "@ai-matrx/kit/format";
import { TranscriptionGrantProvider } from "@/features/audio/components/TranscriptionGrantProvider";
import { publicAnswerTextBox } from "@/features/forms/publicAnswerTextBox";


/** Authored form text → the static inline level (phrasing, valid inside the package's <p>). */
const FORM_TEXT_HOST: RecordsUiHost = {
  renderText: (text) => <RichContentStaticInline source={text} />,
  // A long-text question is a SPOKEN OR TYPED answer: the platform's writing box with its mic,
  // transcribed under this form's public transcription grant (mounted below), no agent actions.
  textBox: publicAnswerTextBox,
};

/**
 * What the runner's `whichAsked` port answers — records-ui's `FormAsked`, 0.84.10 onwards.
 * Declared here, and the ports handed over through `ports` below, so this page still
 * compiles against 0.84.8 until the chair publishes; on 0.84.8 those ports are ignored
 * (the runner shows every question with its "cannot branch" sentence, starts empty and
 * keeps no place) — which is honest, never a silent wrong answer. When `@ai-matrx/records-ui`
 * 0.84.12 is live, import `FormAsked`, pass `whichAsked`, `initialAnswers` and
 * `onAnswersChange` by name, and hand `thankYou` over typed, so a rename is a build failure.
 */
type PublicFormAsked =
  | {
      ok: true;
      asks: ReadonlyArray<{ field: string; asked: boolean; said?: string | null }>;
      ending?: string | null;
      score?: number | null;
    }
  | { ok: false; message: string };

/** Where this browser keeps the secret to its saved place, per form. */
const placeKey = (formId: string) => `matrx:form-place:${formId}`;
/** How long after the last keystroke the place is saved. */
const SAVE_AFTER_MS = 1200;

function readStoredPlace(formId: string): string | null {
  try {
    return window.localStorage.getItem(placeKey(formId));
  } catch {
    return null; // private mode or blocked storage: the place still works for this visit
  }
}
function storePlace(formId: string, secret: string | null) {
  try {
    if (secret) window.localStorage.setItem(placeKey(formId), secret);
    else window.localStorage.removeItem(placeKey(formId));
  } catch {
    // Storage refused. The resume link below still carries the place; nothing else is lost.
  }
}

type SaveState =
  | { kind: "idle" }
  | { kind: "saving" }
  | { kind: "saved"; at: string | null; expiresAt: string | null }
  | { kind: "refused"; message: string };

type Resumed =
  | { kind: "none" }
  | { kind: "found"; answers: Record<string, unknown>; savedAt: string | null }
  | { kind: "gone"; message: string };

/** A random key for THIS visit, held in memory only — never a cookie, never stored. */
function newVisitKey(): string {
  const bytes = new Uint8Array(18);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function PublicFormRunner({
  form,
  prefill,
  linkQuery,
  autoAdvance,
  paymentNotice,
  unlock = null,
  words = null,
}: {
  /** TYPEFORM-2: a single choice moves on when picked (the knob, resolved by the page). */
  autoAdvance?: boolean;
  form: PublicForm;
  prefill?: Record<string, unknown>;
  /** The link's query. TYPEFORM-DUP: the form's HIDDEN FIELDS (utm_source, ref, …) are read from it —
   *  only the names the form declares — sent beside the answers and kept on the submission, never shown. */
  linkQuery?: Record<string, string | string[] | undefined>;
  /** PAYMENTS: what the server read about this visit's payment (REVIEW-PAYMENTS I4) — never the query. */
  paymentNotice?: PaymentNoticeProps | null;
  /** CD-PAGE-08: the password's fingerprint the page read from this visitor's signed cookie (a protected form). */
  unlock?: string | null;
  /** CD-PAGE-08: the runner's own words in the language the visitor met (null: English). */
  words?: Record<string, string> | null;
}) {
  const hidden = hiddenFromLink(form.presentation?.hidden_fields ?? [], linkQuery ?? {});
  // PAYMENTS-CONNECT: a payment that could not start after the answers were saved (I5) — said in
  // place, with Pay now, instead of a thank-you that implies it was paid.
  const [paymentRefused, setPaymentRefused] = useState<{ reason: string; recordId: string | null } | null>(null);
  // ── COUNTED HONESTLY (TYPEFORM-DUP): view, start, each question reached — through our own route.
  const visitKey = useRef<string | null>(null);
  const count = useCallback(
    (event: "view" | "start" | "reach", field: string | null = null) => {
      if (!visitKey.current) visitKey.current = newVisitKey();
      void fetch(`/api/forms/${form.form_id}/visit`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ visit: visitKey.current, event, field }),
        keepalive: true,
      }).catch(() => undefined);
    },
    [form.form_id],
  );
  useEffect(() => {
    count("view");
  }, [count]);
  const { copyText } = useClipboard({
    notify: copyNotify,
  });
  const [secret, setSecret] = useState<string | null>(null);
  const [resumed, setResumed] = useState<Resumed>({ kind: "none" });
  const [runKey, setRunKey] = useState(0);
  // TYPEFORM-2: NO WELCOME FLASH BEFORE A SAVED PLACE OPENS. The runner is laid out (no shift) but
  // not shown until this browser has said whether it holds a place, and the place has been read.
  const [placeChecked, setPlaceChecked] = useState(false);
  const [save, setSave] = useState<SaveState>({ kind: "idle" });
  const [sent, setSent] = useState(false);
  const [copied, setCopied] = useState<"idle" | "copied" | "manual">("idle");
  const secretRef = useRef<string | null>(null);
  // CD-PAGE-08 — ANSWER AGAIN. `editKey` is the respondent's own secret: handed back once after a send (their private
  // link), or read from the link's fragment (`#answer=…`) when they come back to change what they sent.
  const [editKey, setEditKey] = useState<string | null>(null);
  const [editing, setEditing] = useState<{ kind: "none" } | { kind: "found"; answers: Record<string, unknown> } | { kind: "gone"; message: string }>({ kind: "none" });
  const [editCopied, setEditCopied] = useState<"idle" | "copied" | "manual">("idle");
  // CD-PAGE-08: every sentence this page says to the visitor comes from the form's words (one table, in
  // @ai-matrx/records/forms) — English only when she met the form in English.
  const w = {
    changeAnswers: "Change your answers",
    saveChanges: "Save changes",
    copyMyLink: "Copy my link",
    linkCopied: "Link copied",
    copyByHand: "This browser would not copy for you, so here is your link to copy by hand:",
    saving: "Saving your answers…",
    savedFinishElsewhere: "Your answers are saved. To finish on another device, use your own link.",
    pickedUp: "Picked up where you left off.",
    startOver: "Start over",
    answersKept: "Your answers were saved.",
    ...(words ?? {}),
  };
  // The timestamped English sentences stay for an English visitor (the store's words for her are the English ones);
  // any other language reads its own sentence whole.
  const englishSaved = w.savedFinishElsewhere === "Your answers are saved. To finish on another device, use your own link.";
  const englishPicked = w.pickedUp === "Picked up where you left off.";
  const pending = useRef<ReturnType<typeof setTimeout> | null>(null);
  const editingRef = useRef(false);
  const inFlight = useRef<Promise<void> | null>(null);

  // ── WHERE WAS I: the link's fragment first, then this browser's own memory ──────────
  // The fragment is read ONCE per mount and kept here: the effect below clears it from the address
  // bar, and an effect that runs twice (React's development double-run, a remount) read an empty
  // fragment the second time and opened the form on question one — the other device's place lost
  // (MAKE-HOME W5 walk, 2026-10-02).
  const linkSecret = useRef<string | null | undefined>(undefined);
  useEffect(() => {
    let cancelled = false;
    // CD-PAGE-08: `#answer=<secret>` opens the respondent's own sent answers to change them — not a saved place.
    const answerKey = /(?:^|[#&])answer=([A-Za-z0-9_-]{24,})/.exec(window.location.hash)?.[1] ?? null;
    if (answerKey) {
      replaceAddressWithoutNavigating(window.location.pathname + window.location.search);
      void (async () => {
        try {
          const response = await fetch(`/api/forms/${form.form_id}/response`, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ edit: answerKey, unlock }),
          });
          const body = (await response.json()) as { ok?: boolean; answers?: Record<string, unknown> | null; message?: string | null };
          if (cancelled) return;
          if (body.ok && body.answers) {
            setEditKey(answerKey);
            setEditing({ kind: "found", answers: body.answers });
            setRunKey((k) => k + 1);
          } else {
            setEditing({ kind: "gone", message: body.message ?? "This link does not open an answer to this form." });
          }
        } catch {
          if (!cancelled) setEditing({ kind: "gone", message: "Your answers could not be opened just now. Try the link again in a moment." });
        } finally {
          if (!cancelled) setPlaceChecked(true);
        }
      })();
      return () => {
        cancelled = true;
      };
    }
    if (linkSecret.current === undefined) {
      linkSecret.current = /(?:^|[#&])resume=([A-Za-z0-9_-]{16,})/.exec(window.location.hash)?.[1] ?? null;
    }
    const fromLink = linkSecret.current;
    if (fromLink && window.location.hash) {
      // The secret is this person's; it does not stay in the address bar to be screenshotted.
      replaceAddressWithoutNavigating(window.location.pathname + window.location.search);
    }
    const stored = fromLink ?? readStoredPlace(form.form_id);
    if (!stored) {
      setPlaceChecked(true);
      return;
    }
    void (async () => {
      try {
        const response = await fetch(`/api/forms/${form.form_id}/draft/resume`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ draft: stored }),
        });
        const body = (await response.json()) as {
          ok?: boolean;
          state?: string;
          answers?: Record<string, unknown> | null;
          saved_at?: string | null;
          expires_at?: string | null;
          message?: string | null;
        };
        if (cancelled) return;
        if (body.ok && body.answers) {
          secretRef.current = stored;
          setSecret(stored);
          storePlace(form.form_id, stored);
          setResumed({ kind: "found", answers: body.answers, savedAt: body.saved_at ?? null });
          setSave({ kind: "saved", at: body.saved_at ?? null, expiresAt: body.expires_at ?? null });
          setRunKey((k) => k + 1); // the runner opens with her answers, where she stopped
          return;
        }
        // Gone — sent, expired, closed or never there. Forget it here, and say so if it was hers.
        storePlace(form.form_id, null);
        if (body.message && (fromLink || body.state !== "not_found")) setResumed({ kind: "gone", message: body.message });
      } catch {
        if (!cancelled && fromLink) {
          setResumed({ kind: "gone", message: "Your saved answers could not be opened just now. The form starts fresh." });
        }
      } finally {
        if (!cancelled) setPlaceChecked(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [form.form_id]);

  // ── KEEP MY PLACE: a moment after each change ─────────────────────────────────────────
  const persist = useCallback(
    async (answers: Record<string, unknown>) => {
      const filled = Object.values(answers).some((v) => v !== undefined && v !== null && v !== "");
      if (!filled && !secretRef.current) return; // nothing typed yet, nothing to keep
      setSave({ kind: "saving" });
      try {
        const response = await fetch(`/api/forms/${form.form_id}/draft`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ answers, draft: secretRef.current }),
        });
        const body = (await response.json()) as {
          ok?: boolean;
          state?: string;
          draft?: string | null;
          saved_at?: string | null;
          expires_at?: string | null;
          message?: string | null;
        };
        if (body.ok) {
          if (body.draft && body.draft !== secretRef.current) {
            secretRef.current = body.draft;
            setSecret(body.draft);
            storePlace(form.form_id, body.draft);
          }
          setSave({ kind: "saved", at: body.saved_at ?? null, expiresAt: body.expires_at ?? null });
          return;
        }
        if (body.state === "refused" && secretRef.current) {
          // The key no longer opens anything (a form that changed hands, a tampered link):
          // forget it, and the next change starts a new place.
          secretRef.current = null;
          setSecret(null);
          storePlace(form.form_id, null);
        }
        setSave({
          kind: "refused",
          message: body.message ?? "Your answers could not be saved just now. They are still here; sending works as usual.",
        });
      } catch {
        setSave({
          kind: "refused",
          message: "Your answers could not be saved just now — the connection dropped. They are still on this page.",
        });
      }
    },
    [form.form_id],
  );

  const onAnswersChange = useCallback(
    (answers: Record<string, unknown>) => {
      // Changing a sent answer keeps no saved place: the answer itself is what changes, on Save changes.
      if (editingRef.current) return;
      if (pending.current) clearTimeout(pending.current);
      pending.current = setTimeout(() => {
        pending.current = null;
        inFlight.current = persist(answers).finally(() => {
          inFlight.current = null;
        });
      }, SAVE_AFTER_MS);
    },
    [persist],
  );

  useEffect(
    () => () => {
      if (pending.current) clearTimeout(pending.current);
    },
    [],
  );

  editingRef.current = editing.kind === "found";

  // CD-PAGE-08: SAVE CHANGES — the record the answer became is changed in place, through the store's own judgement.
  const saveChanges = useCallback(
    async (values: Record<string, unknown>): Promise<FormSubmitOutcome> => {
      try {
        const response = await fetch(`/api/forms/${form.form_id}/response/update`, {
          method: "POST",
          signal: AbortSignal.timeout(45_000),
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ edit: editKey, values: { ...values, ...(unlock ? { _unlock: unlock } : {}) } }),
        });
        const body = (await response.json()) as { ok?: boolean; message?: string | null; record_id?: string | null };
        if (!response.ok || body.ok === false) {
          return { ok: false, message: body.message ?? "Your changes could not be saved. Nothing changed, so it is safe to try again." };
        }
        setSent(true);
        return { ok: true, recordId: body.record_id ?? null };
      } catch {
        return { ok: false, message: "Your changes did not reach us — the connection dropped. Nothing changed, so saving again is safe." };
      }
    },
    [form.form_id, editKey, unlock],
  );

  const submit = useCallback(
    async (values: Record<string, unknown>): Promise<FormSubmitOutcome> => {
      // A save still waiting would re-open a place the send is about to use up.
      if (pending.current) {
        clearTimeout(pending.current);
        pending.current = null;
      }
      // AT-FIX-H 4: a draft save that never answers must not hold the send: wait for it a moment, then send anyway.
      if (inFlight.current) await Promise.race([inFlight.current, new Promise((resolve) => setTimeout(resolve, 5000))]);
      try {
        const response = await fetch(`/api/forms/${form.form_id}/submit`, {
          method: "POST",
          // AT-FIX-H 4: a send nobody answers ends as the "did not reach us" notice, never a button stuck on Sending.
          signal: AbortSignal.timeout(45_000),
          headers: { "content-type": "application/json" },
          // THE SAVED PLACE'S SECRET IS THE CLIENT KEY: the store marks the place sent in the
          // same transaction, and a second press of Send writes nothing twice.
          body: JSON.stringify({
            values: {
              ...values,
              ...(hidden && Object.keys(hidden).length > 0 ? { _hidden: hidden } : {}),
              ...(visitKey.current ? { _visit: visitKey.current } : {}),
              _time_zone: Intl.DateTimeFormat().resolvedOptions().timeZone,
              ...(unlock ? { _unlock: unlock } : {}),
            },
            clientKey: secretRef.current,
          }),
        });
        const body = (await response.json()) as {
          ok?: boolean;
          state?: string;
          message?: string | null;
          record_id?: string | null;
          payment_url?: string | null;
          payment_refused?: string | null;
          /** CD-PAGE-08: the respondent's answer-again secret, handed back once. */
          edit?: string | null;
        };
        if (!response.ok || body.ok === false) {
          return {
            ok: false,
            message:
              body.message ??
              "This answer could not be sent. Nothing was saved, so it is safe to try again.",
          };
        }
        storePlace(form.form_id, null);
        secretRef.current = null;
        setSecret(null);
        if (body.edit) setEditKey(body.edit);
        // PAYMENTS-CONNECT: the form asks for payment. The answers are saved; now pay on Stripe
        // (the organization's own account). Coming back lands on ?payment=paid|cancelled.
        if (body.payment_url) {
          window.location.assign(body.payment_url);
          return { ok: true, recordId: body.record_id ?? null, message: "Taking you to payment…" };
        }
        if (body.payment_refused) setPaymentRefused({ reason: body.payment_refused, recordId: body.record_id ?? null });
        setSent(true);
        // HELD IS NOT SENT-AND-FORGOTTEN. An answer whose form has no accept
        // Rule waits for a person, and the thank-you screen says so in the
        // store's own words instead of implying it landed in the table.
        return {
          ok: true,
          recordId: body.record_id ?? null,
          ...(body.message ? { message: body.message } : {}),
        };
      } catch {
        return {
          ok: false,
          message:
            "This answer did not reach us — the connection dropped. Nothing was saved, so pressing send again is safe.",
        };
      }
    },
    [form.form_id, unlock],
  );

  // WHICH QUESTIONS COME NEXT — the store's answer, through the server (lane FORMS-FIX-1).
  // A prefilled or resumed answer is asked about exactly like a typed one (lane S7-PRIME).
  const whichAsked = useCallback(
    async (values: Record<string, unknown>): Promise<PublicFormAsked> => {
      try {
        const response = await fetch(`/api/forms/${form.form_id}/asks`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ values }),
        });
        const body = (await response.json()) as
          | { ok: true; asks: Array<{ field: string; asked: boolean; said?: string | null }>; ending?: string | null; score?: number | null }
          | { ok: false; message?: string | null };
        if (!response.ok || body.ok !== true) {
          return {
            ok: false,
            message:
              (body as { message?: string | null }).message ??
              "This form could not work out which questions come next, so all of them are shown.",
          };
        }
        return { ok: true, asks: body.asks, ending: body.ending ?? null, score: body.score ?? null };
      } catch {
        return {
          ok: false,
          message:
            "This form could not reach us to work out which questions come next, so all of them are shown.",
        };
      }
    },
    [form.form_id],
  );

  function startOver() {
    if (pending.current) clearTimeout(pending.current);
    pending.current = null;
    storePlace(form.form_id, null);
    secretRef.current = null;
    setSecret(null);
    setSave({ kind: "idle" });
    setResumed({ kind: "none" });
    setRunKey((k) => k + 1);
  }

  async function copyResumeLink(url: string) {
    if (!(await copyText(url))) {
      setCopied("manual");
      return;
    }
    setCopied("copied");
    window.setTimeout(() => setCopied("idle"), 1600);
  }

  const initialAnswers =
    editing.kind === "found"
      ? editing.answers
      : resumed.kind === "found"
        ? { ...(prefill ?? {}), ...resumed.answers }
        : (prefill ?? {});
  const editUrl =
    editKey && typeof window !== "undefined" ? `${window.location.origin}${window.location.pathname}#answer=${editKey}` : null;
  async function copyEditLink(url: string) {
    if (!(await copyText(url))) {
      setEditCopied("manual");
      return;
    }
    setEditCopied("copied");
    window.setTimeout(() => setEditCopied("idle"), 1600);
  }
  const thankYou = form.presentation?.thank_you ?? null;
  const resumeUrl =
    secret && typeof window !== "undefined"
      ? `${window.location.origin}${window.location.pathname}#resume=${secret}`
      : null;

  // THE PORTS 0.84.8 DOES NOT KNOW YET — see the note at the top of this file.
  // `resumed` opens a saved place on its first unanswered question; a link that only prefills opens
  // on question one, so she sees what the referral link already said for her.
  const ports: Record<string, unknown> = {
    whichAsked,
    initialAnswers,
    onAnswersChange,
    resumed: resumed.kind === "found",
    onStart: () => count("start"),
    onQuestionShown: (field: string) => count("reach", field),
    ...(typeof autoAdvance === "boolean" ? { autoAdvance } : {}),
    ...(words ? { words } : {}),
  };
  const spec: Record<string, unknown> = {
    name: form.title,
    subject: form.table_id,
    intro: form.presentation?.intro ?? null,
    questions: (form.presentation?.questions ?? []).map((q) => ({
      field: q.field,
      ask: q.ask ?? null,
      help: q.help ?? null,
      required: q.required ?? null,
      showIf: (q.showIf as RuleExpression | null | undefined) ?? null,
      jumps: q.jumps ?? null,
      points: q.points ?? null,
    })),
    welcome: welcomeFromDocument(form.presentation?.welcome),
    endings: endingsFromDocument(form.presentation?.endings),
    hiddenFields: form.presentation?.hidden_fields ?? [],
    flow: form.presentation?.flow ?? "one-at-a-time",
    theme: themeFromDocument(form.presentation?.theme),
    thankYou: thankYou
      ? { title: thankYou.title ?? null, body: thankYou.body ?? null, redirectUrl: thankYou.redirect_url ?? null }
      : null,
    submitLabel: editing.kind === "found" ? w.saveChanges : (form.presentation?.submit_label ?? null),
    isPublic: true,
  };

  return (
    <>
      {resumed.kind === "found" && !sent ? (
        <p className="mt-3 flex flex-wrap items-center gap-x-2 rounded border border-dashed px-2 py-1 text-xs text-muted-foreground">
          <span>
            {englishPicked && resumed.savedAt ? `Picked up where you left off — saved ${whenSaid(resumed.savedAt)}.` : w.pickedUp}
          </span>
          <button type="button" className="underline underline-offset-2" onClick={startOver}>
            {w.startOver}
          </button>
        </p>
      ) : null}
      {editing.kind === "found" && !sent ? (
        <p className="mt-3 rounded border border-dashed px-2 py-1 text-xs text-muted-foreground" data-form-editing="">
          {w.changeAnswers}
        </p>
      ) : null}
      {editing.kind === "gone" ? (
        <p className="mt-3 rounded border border-dashed px-2 py-1 text-xs text-muted-foreground" data-form-editing-gone="">
          {editing.message}
        </p>
      ) : null}
      {resumed.kind === "gone" && !sent ? (
        <p className="mt-3 rounded border border-dashed px-2 py-1 text-xs text-muted-foreground">{resumed.message}</p>
      ) : null}

      {/* The form's authored text (intro, question help, thank-you) reads
          through the one rich-content core — markdown and math, in the
          server HTML (records-ui `renderText` host port, 0.85.15). */}
      {paymentNotice ? <PaymentNotice {...paymentNotice} note={w.answersKept} /> : null}
      {paymentRefused ? (
        <PaymentNotice
          outcome="refused"
          reason={paymentRefused.reason}
          note={w.answersKept}
          retry={paymentRefused.recordId ? { subjectId: form.form_id, recordId: paymentRefused.recordId, back: `/f/${form.form_id}` } : null}
        />
      ) : null}
      <TranscriptionGrantProvider type="anon_form" capability={form.form_id}>
      <RecordsUiProvider value={FORM_TEXT_HOST}>
        <div className={placeChecked ? undefined : "invisible"} aria-busy={!placeChecked} data-form-place-checked={placeChecked ? "" : undefined}>
        <FormRunner
          key={runKey}
          form={spec as unknown as ComponentProps<typeof FormRunner>["form"]}
          fields={form.fields as unknown as Field[]}
          honeypotKey={form.honeypot_key}
          onSubmit={editing.kind === "found" ? saveChanges : submit}
          {...ports}
        />
        </div>
      </RecordsUiProvider>
      </TranscriptionGrantProvider>

      {sent && editUrl ? (
        <div className="mt-2 flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground" aria-live="polite" data-form-edit-link="">
          <span>{w.changeAnswers}:</span>
          <button type="button" className="underline underline-offset-2" onClick={() => void copyEditLink(editUrl)}>
            {editCopied === "copied" ? w.linkCopied : w.copyMyLink}
          </button>
          {editCopied === "manual" ? (
            <span className="break-all rounded border border-dashed px-2 py-1">
              {w.copyByHand} {editUrl}
            </span>
          ) : null}
        </div>
      ) : null}
      {!sent && save.kind !== "idle" ? (
        <div className="mt-2 flex flex-col gap-1 text-xs text-muted-foreground" aria-live="polite">
          {save.kind === "saving" ? <span>{w.saving}</span> : null}
          {save.kind === "refused" ? <span>{save.message} <ErrorAlchemyMenu error={save.message} /></span> : null}
          {save.kind === "saved" && resumeUrl ? (
            <span className="flex flex-wrap items-center gap-x-2">
              <span>
                {englishSaved && save.at
                  ? `Your answers are saved (${whenSaid(save.at)}). To finish on another device, use your own link.`
                  : w.savedFinishElsewhere}
              </span>
              <button type="button" className="underline underline-offset-2" onClick={() => void copyResumeLink(resumeUrl)}>
                {copied === "copied" ? w.linkCopied : w.copyMyLink}
              </button>
            </span>
          ) : null}
          {copied === "manual" && resumeUrl ? (
            <span className="break-all rounded border border-dashed px-2 py-1">
              {w.copyByHand} {resumeUrl}
            </span>
          ) : null}
        </div>
      ) : null}
    </>
  );
}

const DAY_MS = 86_400_000;

/** "3 minutes ago", "2 hours ago", or the day — said the way a person says it. */
function whenSaid(at: string): string {
  const then = new Date(at).getTime();
  if (Number.isNaN(then)) return "earlier";
  if (Date.now() - then >= DAY_MS) {
    return `on ${new Date(then).toLocaleDateString(undefined, { month: "long", day: "numeric" })}`;
  }
  return formatRelativeTime(then, { style: "long" });
}
