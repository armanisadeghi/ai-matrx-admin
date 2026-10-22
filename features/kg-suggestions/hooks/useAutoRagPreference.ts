// features/kg-suggestions/hooks/useAutoRagPreference.ts
//
// The person's own auto-RAG switch: when OFF, their content is not
// auto-ingested into the Knowledge corpus.
//
// 🚨 THIS IS A KNOB, NOT A COLUMN (2026-10-22). It reads and writes
// `knowledge.auto_rag_enabled` through `lib/scoped-config` — the platform's one
// scoped-knob register — at the `user` rung. Until 2026-10-22 this hook wrote
// `users.user_preferences.auto_rag_enabled` with a hand-rolled
// UPDATE-then-INSERT, and aidream resolved that column through a second
// per-tenant precedence chain of its own (`effective_setting.py`). That chain is
// deleted and the server now reads the register, so this hook writing the old
// column would have moved the switch on screen and changed nothing a user could
// observe — a control that lies.
//
// What the primitive gives us that the hand-rolled write could not: the door
// (`platform.knob_override_set`) decides authority and refuses in words, the
// write is recorded in the knob history and audit, the resolved value is cached
// ONCE per (organization, person) and busted for every reader in this tab the
// moment the write lands, and `value: null` CLEARS the rung so "inherits" and
// "set to off" can never blur.

"use client";

import { useCallback, useState } from "react";
import {
  AUTO_RAG_DEFAULT,
  AUTO_RAG_KEY,
  AUTO_RAG_KNOB,
  KNOWLEDGE_FEATURE,
  asKnobBoolean,
} from "@/features/kg-suggestions/autoRagKnobs";
import { describeWriteFailure } from "@/lib/errors/writeFailure";
import { useAppSelector } from "@/lib/redux/hooks";
import { selectOrganizationId } from "@/lib/redux/slices/appContextSlice";
import { selectUserId } from "@/lib/redux/selectors/userSelectors";
import { useEffectiveKnob } from "@/lib/scoped-config/effectiveKnobs.client";
import { knobRefusalSentence, setKnobOverride } from "@/lib/scoped-config/service";

export interface UseAutoRagPreferenceResult {
  enabled: boolean;
  loading: boolean;
  saving: boolean;
  error: string | null;
  /** Resolves to the value that is actually IN EFFECT afterwards. It differs
   * from `next` when the organization's rung overrules the person's — the knob
   * is `lower_only` — so a caller can say so instead of claiming success. */
  setEnabled: (next: boolean) => Promise<boolean>;
}

export function useAutoRagPreference(): UseAutoRagPreferenceResult {
  const userId = useAppSelector(selectUserId);
  // A knob override row is organization-scoped, so even the person's OWN rung is
  // addressed inside one organization. This is the organization the app is
  // working in — the same one the canonical personal settings surface resolves
  // its own rungs in (`features/settings/universal`). It is not a list filter.
  const organizationId = useAppSelector(selectOrganizationId);
  const resolved = useEffectiveKnob(organizationId, userId, AUTO_RAG_KNOB);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const enabled = asKnobBoolean(resolved, AUTO_RAG_DEFAULT);
  const loading = resolved === undefined && Boolean(userId) && Boolean(organizationId);

  const setEnabled = useCallback(
    async (next: boolean): Promise<boolean> => {
      if (!userId || !organizationId) return next;
      // PENDING, NEVER OPTIMISTIC (GATES-TAIL-2): the switch keeps its value (and shows busy via
      // `saving`) until the row is written; a refusal leaves it as it was, said in words. The
      // displayed value comes from the resolved snapshot, which the write busts, so there is
      // nothing to set here — the read is the single source.
      setSaving(true);
      try {
        const result = await setKnobOverride({
          feature: KNOWLEDGE_FEATURE,
          key: AUTO_RAG_KEY,
          scopeKind: "user",
          scopeId: userId,
          organizationId,
          value: next,
        });
        if (!result.ok) {
          setError(knobRefusalSentence(result));
          throw new Error(knobRefusalSentence(result));
        }
        // THE ORGANIZATION CAN OVERRULE THIS, AND IT IS NEVER SILENT. The knob is
        // `lower_only`: a person asking to turn auto-RAG back ON while their
        // organization has turned it OFF is DISCARDED by the resolver. The row is
        // written (so the choice is kept for when the organization changes its
        // mind), the door answers ok — and the effective value is still OFF. Say
        // so, rather than let the switch claim a state the platform will not honour.
        const effective = asKnobBoolean(result.effective_value, next);
        setError(
          effective === next
            ? null
            : "Your organization has turned this off, so it stays off for you. " +
              "Your choice is saved for if that changes.",
        );
        return effective;
      } catch (err) {
        if (err instanceof Error && err.message && error === null) {
          const w = describeWriteFailure(err, {
            action: next ? "turn on auto knowledge-graph" : "turn off auto knowledge-graph",
            remedy: "Try again.",
          });
          setError(`${w.title} ${w.description}`);
        }
        throw err;
      } finally {
        setSaving(false);
      }
    },
    // `error` is read only to avoid overwriting a refusal sentence the door already gave.
    [userId, organizationId, error],
  );

  return { enabled, loading, saving, error, setEnabled };
}
