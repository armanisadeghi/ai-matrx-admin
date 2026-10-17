"use client";

import { narrowGmailDraftedBy } from "@/features/crm/gmail/types";
import GmailComposeWindow from "@/features/window-panels/windows/crm/GmailComposeWindow";
import type { OverlayRenderProps } from "@ai-matrx/summon/react";

export default function OverlayRender({ data: overlayData, instanceId, close }: OverlayRenderProps) {

        if (!true) return null;
        const data = overlayData;
        const partyId = typeof data?.partyId === "string" ? data.partyId : null;
        const organizationId =
          typeof data?.organizationId === "string" ? data.organizationId : null;
        // A compose window with no record and no organization cannot write the
        // sent record it exists to write — it does not open half-alive.
        if (!partyId || !organizationId) return null;
        const draftedBy = narrowGmailDraftedBy(data?.draftedBy);
        return (
          <GmailComposeWindow
            isOpen
            onClose={() =>
              close()
            }
            partyId={partyId}
            organizationId={organizationId}
            partyLabel={
              typeof data?.partyLabel === "string" ? data.partyLabel : "this record"
            }
            dealId={typeof data?.dealId === "string" ? data.dealId : null}
            dealLabel={
              typeof data?.dealLabel === "string" ? data.dealLabel : null
            }
            projectId={
              typeof data?.projectId === "string" ? data.projectId : null
            }
            initialTo={typeof data?.initialTo === "string" ? data.initialTo : null}
            initialSubject={
              typeof data?.initialSubject === "string" ? data.initialSubject : null
            }
            initialBody={
              typeof data?.initialBody === "string" ? data.initialBody : null
            }
            draftedBy={draftedBy}
            sentCallbackId={
              typeof data?.sentCallbackId === "string" ? data.sentCallbackId : null
            }
          />
        );
}
