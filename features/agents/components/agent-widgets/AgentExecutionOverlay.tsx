"use client";

/**
 * AgentExecutionOverlay — DEPRECATED
 *
 * This file previously contained a central router that rendered the correct
 * widget based on displayMode. Each widget is now a standalone component
 * managed independently by the overlay system (overlaySlice + OverlayController).
 *
 * Individual widgets:
 *   - AgentFullModal
 *   - AgentCompactModal
 *   - AgentChatBubble
 *   - AgentInlineOverlay
 *   - AgentSidebarOverlay
 *   - AgentFlexiblePanel
 *   - AgentPanelOverlay
 *   - AgentToastOverlay
 *   - AgentFloatingChat
 *   - ChatCollapsible
 *
 * To open any widget, dispatch the corresponding action creator from overlaySlice:
 *   dispatch(openAgentFullModal({ instanceId }))
 *   dispatch(openAgentChatBubble({ instanceId }))
 *   etc.
 */

export { AgentFullModal } from "./AgentFullModal";
export { AgentCompactModal } from "./AgentCompactModal";
export { AgentChatBubble } from "./AgentChatBubble";
export { AgentInlineOverlay } from "./AgentInlineOverlay";
export { AgentSidebarOverlay } from "./AgentSidebarOverlay";
export { AgentFlexiblePanel } from "./AgentFlexiblePanel";
export { AgentPanelOverlay } from "./AgentPanelOverlay";
export { AgentToastOverlay } from "./AgentToastOverlay";
export { AgentFloatingChat } from "./AgentFloatingChat";
export { ChatCollapsible } from "./ChatCollapsible";
