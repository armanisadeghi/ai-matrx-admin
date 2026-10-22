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

import { useCallback, useEffect, useState } from "react";
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

/** Said when there is nobody, or no organization, to write a rung for. */
export const NO_WRITE_TARGET =
  "Sign in and choose an organization to change this setting.";

export interface UseAutoRagPreferenceResult {
  enabled: boolean;
  loading: boolean;
  saving: boolean;
  /** False when there is no person or no organization to write a rung for — the
   * control must not be clickable, because nothing could be written. */
  canChange: boolean;
  error: string | null;
  /** Resolves to the value that is actually IN EFFECT afterwards. It differs
   * from `next` when the organization's rung overrules the person's — the knob
   * is `lower_only` — so a caller can say so instead of claiming success.
   * Rejects when nothing was written. */
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

  // 🚨 ABSENT IS UNKNOWN, NEVER THE DEFAULT. A successful write calls
  // `invalidateEffectiveKnob`, which does `snapshots.clear()` — so between the
  // write and the refetch the snapshot answers `undefined`. Reading that as the
  // register default made the switch JUMP to ON right after being turned off and
  // then snap back, and show ON for a moment even when the organization's rung
  // had just overruled the person's. The last value actually known (from the
  // snapshot, or from the door's own `effective_value`, which is authoritative
  // and immediate) covers that gap instead.
  // 🚨 AND IT IS KEYED TO THE ADDRESS IT WAS LEARNED AT. A snapshot answers for
  // ONE (organization, person) pair; switching organization makes the old answer
  // somebody else's. Holding it unkeyed meant the switch showed the previous
  // tenant's setting — enabled, not loading — until the new read landed, and
  // kept showing it if that read failed. A value from another address is not a
  // value we know.
  const address = `${organizationId ?? ""}|${userId ?? ""}`;
  const [lastKnown, setLastKnown] = useState<{ address: string; value: boolean } | null>(null);
  useEffect(() => {
    if (typeof resolved === "boolean") setLastKnown({ address, value: resolved });
  }, [resolved, address]);

  const canChange = Boolean(userId) && Boolean(organizationId);
  const known =
    typeof resolved === "boolean"
      ? resolved
      : lastKnown?.address === address
        ? lastKnown.value
        : null;
  const enabled = known ?? AUTO_RAG_DEFAULT;
  const loading = canChange && known === null;

  const setEnabled = useCallback(
    async (next: boolean): Promise<boolean> => {
      if (!userId || !organizationId) {
        // Returning `next` here reported SUCCESS for a write that never
        // happened — the caller compared it to what it asked for and toasted
        // "enabled". Refuse in words instead.
        setError(NO_WRITE_TARGET);
        throw new Error(NO_WRITE_TARGET);
      }
      // PENDING, NEVER OPTIMISTIC (GATES-TAIL-2): the switch keeps its value (and shows busy via
      // `saving`) until the row is written; a refusal leaves it as it was, said in words.
      setSaving(true);
      // Whether the DOOR refused, which is the only case whose sentence is
      // already set. Checked here rather than through `error`, whose closure
      // still holds the value from the render this callback was created in —
      // `setError` above cannot have re-rendered yet, so reading state would
      // always look like "no message set" and overwrite the door's own words
      // with a generic wrapper.
      let refused = false;
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
          const sentence = knobRefusalSentence(result);
          refused = true;
          setError(sentence);
          throw new Error(sentence);
        }
        // THE ORGANIZATION CAN OVERRULE THIS, AND IT IS NEVER SILENT. The knob is
        // `lower_only`: a person asking to turn auto-RAG back ON while their
        // organization has turned it OFF is DISCARDED by the resolver. The row is
        // written (so the choice is kept for when the organization changes its
        // mind), the door answers ok — and the effective value is still OFF. Say
        // so, rather than let the switch claim a state the platform will not honour.
        const effective = asKnobBoolean(result.effective_value, next);
        setLastKnown({ address, value: effective });
        setError(
          effective === next
            ? null
            : "Your organization has turned this off, so it stays off for you. " +
              "Your choice is saved for if that changes.",
        );
        return effective;
      } catch (err) {
        if (!refused) {
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
    [userId, organizationId, address],
  );

  return { enabled, loading, saving, canChange, error, setEnabled };
}
