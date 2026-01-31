/**
 * Shared types for PromptRunner display variants
 * All display components receive these props from the core PromptRunner logic
 */

// @ts-ignore - conversation module may not exist, using any type
import type { ConversationMessage } from "@/features/prompts/components/conversation";
import type { PromptMessage, PromptVariable } from "@/features/prompts/types/core";
import type { Resource } from "../resource-display";

/**
 * Display variant types
 */
export type PromptRunnerDisplayVariant = 'standard' | 'compact';

/**
 * Canvas state and handlers passed to display variants
 */
export interface CanvasControl {
  isCanvasOpen: boolean;
  canvasContent: any;
  openCanvas: (content: any) => void;
  closeCanvas: () => void;
}

/**
 * Mobile canvas state and handlers
 */
export interface MobileCanvasControl {
  isMobile: boolean;
  showCanvasOnMobile: boolean;
  setShowCanvasOnMobile: (show: boolean) => void;
}

/**
 * Shared props passed to all display variant components
 * These props contain all the state and handlers needed for rendering
 */
export interface PromptRunnerDisplayProps {
  // Display configuration
  title?: string;
  className?: string;
  promptName: string;
  
  // Conversation state
  displayMessages: ConversationMessage[];
  isExecutingPrompt: boolean;
  conversationStarted: boolean;
  
  // Variable management
  variableDefaults: PromptVariable[];
  shouldShowVariables: boolean;
  expandedVariable: string | null;
  onVariableValueChange: (variableName: string, value: string) => void;
  onExpandedVariableChange: (variable: string | null) => void;
  
  // Chat input
  chatInput: string;
  onChatInputChange: (value: string) => void;
  onSendMessage: () => void;
  
  // Resources
  resources: Resource[];
  onResourcesChange: (resources: Resource[]) => void;
  
  // Template messages for context
  templateMessages: PromptMessage[];
  
  // Canvas control
  canvasControl: CanvasControl;
  mobileCanvasControl: MobileCanvasControl;
  
  // Execution config flags
  autoRun: boolean;
  allowChat: boolean;
  
  // Input visibility
  hideInput: boolean;
  
  // Close handler (if provided)
  onClose?: () => void;
}

