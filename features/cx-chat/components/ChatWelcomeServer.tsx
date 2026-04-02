// ChatWelcomeServer
//
// Thin server wrapper. Passes flat serializable props to ChatInstanceManager
// which creates the instance and renders ChatWelcomeClient.

import { ChatInstanceManager } from "./ChatInstanceManager";

export interface WelcomeAgent {
  promptId: string;
  name: string;
  description?: string;
}

interface ChatWelcomeServerProps {
  agent: WelcomeAgent;
}

export default function ChatWelcomeServer({ agent }: ChatWelcomeServerProps) {
  return (
    <div className="h-full flex flex-col overflow-hidden">
      <ChatInstanceManager
        mode="welcome"
        agentId={agent.promptId}
        agentName={agent.name}
        agentDescription={agent.description}
      />
    </div>
  );
}
