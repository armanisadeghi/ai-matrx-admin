"use client";

/**
 * Unified Chat Wrapper — Test Page
 *
 * Demonstrates all three API modes of the UnifiedChatWrapper:
 * - Agent mode: Server manages conversation state
 * - Conversation mode: Continue an existing conversation
 * - Chat mode: Client sends full history each time
 *
 * Also shows different layout modes (full, embedded, compact).
 */

import { useState, useCallback, useRef } from "react";
import { UnifiedChatWrapper } from "@/features/cx-conversation";
import type { ConversationSessionReturn } from "@/features/cx-conversation";
// Legacy ApiMode — chat is being rebuilt; reproduce the enum locally.
type ApiMode = "agent" | "conversation" | "chat";
import { Button } from "@/components/ui/button";
import {
  MessageSquare,
  Server,
  Zap,
  Minimize2,
  Maximize2,
  Layout,
} from "lucide-react";

type DemoMode = "agent" | "chat" | "embedded";

export default function UnifiedChatTestPage() {
  const [demoMode, setDemoMode] = useState<DemoMode>("agent");
  const [conversationId, setConversationId] = useState<string | null>(null);
  const sessionRef = useRef<ConversationSessionReturn | null>(null);

  // A known agent/prompt ID from the system — use a real one or a test one
  // This will be replaced by the user selecting one
  const [agentId, setAgentId] = useState("");
  const [chatModelId, setChatModelId] = useState("");

  const handleConversationIdChange = useCallback((id: string) => {
    setConversationId(id);
  }, []);

  const handleSessionReady = useCallback(
    (session: ConversationSessionReturn) => {
      sessionRef.current = session;
    },
    [],
  );

  return (
    <div className="h-[calc(100vh-2.5rem)] flex flex-col overflow-hidden bg-textured">
      {/* Header */}
      <div className="flex-shrink-0 border-b border-border px-4 py-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h1 className="text-sm font-semibold text-foreground">
              Unified Chat Wrapper Test
            </h1>
            {conversationId && (
              <span className="text-xs text-muted-foreground font-mono bg-muted px-2 py-0.5 rounded">
                conv: {conversationId.slice(0, 8)}...
              </span>
            )}
          </div>

          {/* Mode switcher */}
          <div className="flex items-center gap-1">
            <Button
              variant={demoMode === "agent" ? "default" : "ghost"}
              size="sm"
              onClick={() => setDemoMode("agent")}
              className="h-7 text-xs gap-1"
            >
              <Server className="h-3 w-3" />
              Agent Mode
            </Button>
            <Button
              variant={demoMode === "chat" ? "default" : "ghost"}
              size="sm"
              onClick={() => setDemoMode("chat")}
              className="h-7 text-xs gap-1"
            >
              <Zap className="h-3 w-3" />
              Chat Mode
            </Button>
            <Button
              variant={demoMode === "embedded" ? "default" : "ghost"}
              size="sm"
              onClick={() => setDemoMode("embedded")}
              className="h-7 text-xs gap-1"
            >
              <Layout className="h-3 w-3" />
              Embedded
            </Button>
          </div>
        </div>

        {/* Config inputs */}
        <div className="flex items-center gap-2 mt-2">
          <label className="text-xs text-muted-foreground">
            Agent/Prompt ID:
          </label>
          <input
            type="text"
            value={agentId}
            onChange={(e) => setAgentId(e.target.value)}
            placeholder="Enter a prompt UUID..."
            className="flex-1 text-xs bg-muted rounded px-2 py-1 text-foreground focus:outline-none max-w-[300px]"
            style={{ fontSize: "16px" }}
          />
          {demoMode === "chat" && (
            <>
              <label className="text-xs text-muted-foreground">Model ID:</label>
              <input
                type="text"
                value={chatModelId}
                onChange={(e) => setChatModelId(e.target.value)}
                placeholder="e.g. gpt-4o"
                className="text-xs bg-muted rounded px-2 py-1 text-foreground focus:outline-none max-w-[200px]"
                style={{ fontSize: "16px" }}
              />
            </>
          )}
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-hidden">
        {!agentId ? (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            <div className="text-center">
              <MessageSquare className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">
                Enter an Agent/Prompt ID above to begin.
              </p>
              <p className="text-xs mt-1 text-muted-foreground/60">
                This tests the UnifiedChatWrapper with all 3 API modes.
              </p>
            </div>
          </div>
        ) : demoMode === "agent" ? (
          <UnifiedChatWrapper
            key={`agent-${agentId}`}
            agentId={agentId}
            apiMode="agent"
            layout="full"
            title="Agent Mode"
            showVoice
            showResourcePicker
            showShiftEnterHint
            onConversationIdChange={handleConversationIdChange}
            onSessionReady={handleSessionReady}
          />
        ) : demoMode === "chat" ? (
          <UnifiedChatWrapper
            key={`chat-${agentId}-${chatModelId}`}
            agentId={agentId}
            apiMode="chat"
            chatModeConfig={{
              aiModelId: chatModelId || "gpt-4o",
              temperature: 0.7,
            }}
            layout="full"
            title="Chat Mode (Stateless)"
            showVoice={false}
            showResourcePicker={false}
            showShiftEnterHint
            placeholder="Full client control — sends entire history each time..."
            onSessionReady={handleSessionReady}
          />
        ) : (
          /* Embedded demo — shows side-by-side */
          <div className="flex h-full gap-4 p-4">
            <div className="flex-1 border border-border rounded-xl overflow-hidden">
              <UnifiedChatWrapper
                key={`embedded-1-${agentId}`}
                agentId={agentId}
                apiMode="agent"
                layout="embedded"
                compact
                title="Embedded Panel A"
                showVoice={false}
                placeholder="Compact embedded mode..."
                onConversationIdChange={handleConversationIdChange}
              />
            </div>
            <div className="flex-1 border border-border rounded-xl overflow-hidden">
              <UnifiedChatWrapper
                key={`embedded-2-${agentId}`}
                agentId={agentId}
                apiMode="agent"
                layout="embedded"
                compact
                title="Embedded Panel B"
                showVoice={false}
                placeholder="Independent session..."
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
