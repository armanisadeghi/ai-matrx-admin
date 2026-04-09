"use client";

/**
 * Placeholder for the debug module registry. The real UI is
 * AgentAssistantMarkdownDebugWindow (WindowPanel) — MediumIndicator opens it
 * directly instead of DebugModulePanel.
 */
export default function AgentAssistantMarkdownDebugModule() {
  return (
    <p className="text-xs p-4 text-muted-foreground">
      This debugger opens as a floating window. Use the same icon in the Admin
      Indicator (opens WindowPanel, not this dialog).
    </p>
  );
}
