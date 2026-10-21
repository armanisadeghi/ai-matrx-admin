"use client";

// Start a support session for one person: a reason, a length, then a one-time link to open in a
// separate browser (or private window). The link is good for 10 minutes and works once.

import { useState } from "react";
import { Copy, LifeBuoy } from "lucide-react";
import { useClipboard } from "@ai-matrx/kit/clipboard";
import { formatDurationMinutes } from "@ai-matrx/kit/format";
import { Button, PropertyRow, RegionSkeleton, SegmentedControl } from "@ai-matrx/design-system/controls";
import { copyNotify } from "@/lib/clipboard/copy-notify";
import { ProInput } from "@/components/official/ProInput";
import { MAIN_ORIGIN } from "@/lib/deployment/surfaces";
import { Spinner } from "@/components/ui/loaders/Spinner";
import { toast } from "@/lib/toast";
import { useAppSelector } from "@/lib/redux/hooks";
import { selectUserId } from "@/lib/redux/selectors/userSelectors";
import { selectActiveOrganizationId } from "@/features/scopes/redux/selectors/active-context";
import { useEffectiveKnob } from "@/lib/scoped-config/effectiveKnobs.client";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  SUPPORT_SESSION_KNOBS,
  knobMinuteChoices,
  knobMinutes,
  createSupportSession,
  supportSessionLink,
} from "./service";

export interface SupportSessionTarget {
  id: string;
  email: string | null;
  displayName: string | null;
}


/** A local build keeps its own origin; every deployed build sends the person to the main app. */
function linkOrigin(): string {
  if (typeof window === "undefined") return MAIN_ORIGIN;
  const host = window.location.hostname;
  return host === "localhost" || host.endsWith(".localhost") ? window.location.origin : MAIN_ORIGIN;
}

export function StartSupportSessionDialog({
  target,
  onClose,
}: {
  target: SupportSessionTarget | null;
  onClose: () => void;
}) {
  const { copyText } = useClipboard({ notify: copyNotify });
  const [reason, setReason] = useState("");
  const userId = useAppSelector(selectUserId);
  const organizationId = useAppSelector(selectActiveOrganizationId);
  const choices = knobMinuteChoices(useEffectiveKnob(organizationId, userId, SUPPORT_SESSION_KNOBS.lengthChoices));
  const defaultMinutes = knobMinutes(useEffectiveKnob(organizationId, userId, SUPPORT_SESSION_KNOBS.defaultMinutes));
  // The person's pick; until they pick, the knob's default length is the choice.
  const [picked, setPicked] = useState<string | null>(null);
  const minutes = picked ?? (defaultMinutes === null ? null : String(defaultMinutes));
  const [creating, setCreating] = useState(false);
  const [link, setLink] = useState<string | null>(null);

  const close = () => {
    setReason("");
    setPicked(null);
    setLink(null);
    onClose();
  };

  const start = async () => {
    if (!target || minutes === null) return;
    setCreating(true);
    try {
      const row = await createSupportSession({
        targetUserId: target.id,
        reason: reason.trim(),
        minutes: Number(minutes),
      });
      setLink(supportSessionLink(row.claim_token, linkOrigin()));
    } catch (error) {
      toast.error(`Could not start the support session: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setCreating(false);
    }
  };

  const who = target?.displayName || target?.email || target?.id;

  return (
    <Dialog open={target !== null} onOpenChange={(open) => !open && close()}>
      <DialogContent data-support-session-dialog>
        <DialogHeader>
          <DialogTitle>Support session as {who}</DialogTitle>
        </DialogHeader>
        {link ? (
          <PropertyRow
            label="Open in a private window"
            help="Works once, within 10 minutes. Opening it in this browser signs you out of your own account."
            value={<span className="break-all">{link}</span>}
            mono
          />
        ) : (
          <div className="flex flex-col gap-3">
            <ProInput
              data-surface-value="support_session_reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Reason, e.g. can't find her agent"
              autoFocus
              onSubmit={() => void start()}
              submitOnEnter
              submitDisabled={creating || minutes === null || reason.trim().length < 3}
            />
            {choices ? (
              <SegmentedControl
                aria-label="Session length"
                value={minutes}
                onValueChange={setPicked}
                data={choices.map((m) => ({
                  value: String(m),
                  label: formatDurationMinutes(m, { style: "long", abbreviate: true }),
                }))}
                fill
              />
            ) : (
              <RegionSkeleton />
            )}
          </div>
        )}
        <DialogFooter>
          <Button variant="quiet" onClick={close}>
            {link ? "Done" : "Cancel"}
          </Button>
          {link ? (
            <Button
              variant="primary"
              icon={<Copy />}
              onClick={() => void copyText(link)}
            >
              Copy link
            </Button>
          ) : (
            <Button
              variant="primary"
              icon={creating ? <Spinner size="xs" className="text-current" /> : <LifeBuoy />}
              disabled={creating || minutes === null || reason.trim().length < 3}
              onClick={() => void start()}
            >
              Start
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
