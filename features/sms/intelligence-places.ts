// features/sms/intelligence-places.ts
//
// WHERE EACH TEXT-MESSAGE JOB RUNS — drawn on /intelligence/sms.
// Proved against the files named below by
// features/mandates/feature-intelligence/__tests__/declared-places.test.ts.

import { MANDATE_KEYS } from "@ai-matrx/agents/mandates";
import type { FeaturePlaces } from "@/features/mandates/feature-intelligence/types";
import { SMS_ASSISTANT_MANDATE } from "./assistant-program";

export const SMS_PLACES: FeaturePlaces = {
  feature: "sms",
  label: "Text messages",
  aliases: { SMS_ASSISTANT_MANDATE },
  roots: ["features/sms"],
  places: [
    {
      id: "assistant",
      label: "Settings, Messaging",
      trigger: "Your text-message assistant (answers texts you send it)",
      urlPattern: "/user-settings/communication/messaging",
      mandateKeys: [MANDATE_KEYS.personal_staff__front_line],
      sources: [
        "features/sms/assistant-program.ts",
        "features/sms/components/SmsAssistantSettingsSection.tsx",
      ],
    },
  ],
};
