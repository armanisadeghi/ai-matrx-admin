// File: app/(authenticated)/chat/page.tsx

import WelcomeScreen from "@/features/chat/ui-parts/layout/WelcomeScreen";

const DEFAULT_MODEL_ID = "id:49848d52-9cc8-4ce4-bacb-32aa2201cd10";

export default function ChatPage() {
  // This is a server component, so we only pass the default model ID
  // All client-side logic will be in the WelcomeScreen component
  return <WelcomeScreen initialModelKey={DEFAULT_MODEL_ID} />;
}