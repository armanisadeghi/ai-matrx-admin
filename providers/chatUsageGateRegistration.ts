// The ONE place the entitlements usage gate is handed to the chat package.
// chatUiRegistrationBase imports it for every build profile; the usage-gate
// tests import it too, so a lost registration fails them.
import { registerChatUsageGate } from "@ai-matrx/chat/host/usage-gate";
import * as usageGate from "@/features/entitlements/usage-gate/usageGate";

registerChatUsageGate(usageGate);
