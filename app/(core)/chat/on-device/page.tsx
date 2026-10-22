import { OnDeviceChat } from "@/features/ai-models/remote/OnDeviceChat";

/**
 * `/chat/on-device?d=<computer>&m=<model>` — a conversation answered by a local model ON one of the
 * person's (or their organization's) computers, over the device relay.
 * `/chat/on-device?d=<computer>&plan=claude` — "Claude (your plan)": Claude Code on the person's own
 * computer, under their own sign-in there, projected into the chat.
 * Opened from the composer's "Your computers" group (features/ai-models/remote/your-computers.ts).
 */
export default function OnDeviceChatPage() {
  return <OnDeviceChat />;
}
