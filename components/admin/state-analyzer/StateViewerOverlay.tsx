// state-analyzer/StateViewerOverlay.tsx
import React from "react";
import FullScreenOverlay, {
  TabDefinition,
} from "@/components/official/FullScreenOverlay";
import GenericSliceViewer from "./sliceViewers/GenericSliceViewer";
import type { RootState } from "@/lib/redux/store";
import EntitySliceViewer from "./sliceViewers/EntitySliceViewer";
import { featureSchemas } from "@/lib/redux/dynamic/featureSchema";
import { moduleSchemas } from "@/lib/redux/dynamic/moduleSchema";
import AppletRuntimeViewer from "./sliceViewers/AppletRuntimeViewer";
import { useAppStore } from "@/lib/redux/hooks";

interface StateViewerOverlayProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Custom hook to get the entire Redux state without triggering warnings
 * This is only used for debugging purposes
 */
const useCompleteState = (): RootState => {
  const store = useAppStore();
  // Get the state directly from the store instead of using useSelector
  return store.getState();
};

const StateViewerOverlay: React.FC<StateViewerOverlayProps> = ({
  isOpen,
  onClose,
}) => {
  // Get the complete Redux state using our custom hook
  const completeState = useCompleteState();

  // One tab per top-level key in createRootReducer (order matches rootReducer.ts)
  const tabs: TabDefinition[] = [
    {
      id: "user",
      label: "User",
      content: (
        <GenericSliceViewer sliceKey="user" state={completeState.user} />
      ),
    },
    {
      id: "userPreferences",
      label: "User Preferences",
      content: (
        <GenericSliceViewer
          sliceKey="userPreferences"
          state={completeState.userPreferences}
        />
      ),
    },
    {
      id: "adminDebug",
      label: "Admin Debug",
      content: (
        <GenericSliceViewer
          sliceKey="adminDebug"
          state={completeState.adminDebug}
        />
      ),
    },
    {
      id: "overlays",
      label: "Overlays",
      content: (
        <GenericSliceViewer
          sliceKey="overlays"
          state={completeState.overlays}
        />
      ),
    },
    {
      id: "overlayData",
      label: "Overlay Data",
      content: (
        <GenericSliceViewer
          sliceKey="overlayData"
          state={completeState.overlayData}
        />
      ),
    },
    {
      id: "voicePad",
      label: "Voice Pad",
      content: (
        <GenericSliceViewer
          sliceKey="voicePad"
          state={completeState.voicePad}
        />
      ),
    },
    {
      id: "windowManager",
      label: "Window Manager",
      content: (
        <GenericSliceViewer
          sliceKey="windowManager"
          state={completeState.windowManager}
        />
      ),
    },
    {
      id: "urlSync",
      label: "URL Sync",
      content: (
        <GenericSliceViewer sliceKey="urlSync" state={completeState.urlSync} />
      ),
    },
    {
      id: "canvas",
      label: "Canvas",
      content: (
        <GenericSliceViewer sliceKey="canvas" state={completeState.canvas} />
      ),
    },
    {
      id: "artifacts",
      label: "Artifacts",
      content: (
        <GenericSliceViewer
          sliceKey="artifacts"
          state={completeState.artifacts}
        />
      ),
    },
    {
      id: "htmlPages",
      label: "HTML Pages",
      content: (
        <GenericSliceViewer
          sliceKey="htmlPages"
          state={completeState.htmlPages}
        />
      ),
    },
    {
      id: "textDiff",
      label: "Text Diff",
      content: (
        <GenericSliceViewer
          sliceKey="textDiff"
          state={completeState.textDiff}
        />
      ),
    },
    {
      id: "noteVersions",
      label: "Note Versions",
      content: (
        <GenericSliceViewer
          sliceKey="noteVersions"
          state={completeState.noteVersions}
        />
      ),
    },
    {
      id: "sms",
      label: "SMS",
      content: <GenericSliceViewer sliceKey="sms" state={completeState.sms} />,
    },
    {
      id: "theme",
      label: "Theme",
      content: (
        <GenericSliceViewer sliceKey="theme" state={completeState.theme} />
      ),
    },

    ...Object.keys(featureSchemas).map((key) => ({
      id: `feature-${key}`,
      label: `Feature: ${key}`,
      content: (
        <GenericSliceViewer
          sliceKey={key}
          state={completeState[key as keyof RootState]}
        />
      ),
    })),

    ...Object.keys(moduleSchemas).map((key) => ({
      id: `module-${key}`,
      label: `Module: ${key}`,
      content: (
        <GenericSliceViewer
          sliceKey={key}
          state={completeState[key as keyof RootState]}
        />
      ),
    })),

    {
      id: "fileSystem",
      label: "File System",
      content: (
        <GenericSliceViewer
          sliceKey="fileSystem"
          state={completeState.fileSystem}
        />
      ),
    },
    {
      id: "entities",
      label: "Entities",
      content: (
        <GenericSliceViewer
          sliceKey="entities"
          state={completeState.entities}
        />
      ),
    },
    {
      id: "entities-custom",
      label: "Entities Custom",
      content: (
        <EntitySliceViewer sliceKey="entities" state={completeState.entities} />
      ),
    },
    {
      id: "entityFields",
      label: "Entity Fields",
      content: (
        <GenericSliceViewer
          sliceKey="entityFields"
          state={completeState.entityFields}
        />
      ),
    },
    {
      id: "layout",
      label: "Layout",
      content: (
        <GenericSliceViewer sliceKey="layout" state={completeState.layout} />
      ),
    },
    {
      id: "form",
      label: "Form",
      content: (
        <GenericSliceViewer sliceKey="form" state={completeState.form} />
      ),
    },
    {
      id: "testRoutes",
      label: "Test Routes",
      content: (
        <GenericSliceViewer
          sliceKey="testRoutes"
          state={completeState.testRoutes}
        />
      ),
    },
    {
      id: "flashcardChat",
      label: "Flashcard Chat",
      content: (
        <GenericSliceViewer
          sliceKey="flashcardChat"
          state={completeState.flashcardChat}
        />
      ),
    },
    {
      id: "globalCache",
      label: "Global Cache",
      content: (
        <GenericSliceViewer
          sliceKey="globalCache"
          state={completeState.globalCache}
        />
      ),
    },
    {
      id: "ui",
      label: "UI",
      content: <GenericSliceViewer sliceKey="ui" state={completeState.ui} />,
    },
    {
      id: "storage",
      label: "Storage",
      content: (
        <GenericSliceViewer sliceKey="storage" state={completeState.storage} />
      ),
    },
    {
      id: "aiChat",
      label: "AI Chat",
      content: (
        <GenericSliceViewer sliceKey="aiChat" state={completeState.aiChat} />
      ),
    },
    {
      id: "conversation",
      label: "Conversation",
      content: (
        <GenericSliceViewer
          sliceKey="conversation"
          state={completeState.conversation}
        />
      ),
    },
    {
      id: "messages",
      label: "Messages",
      content: (
        <GenericSliceViewer
          sliceKey="messages"
          state={completeState.messages}
        />
      ),
    },
    {
      id: "newMessage",
      label: "New Message",
      content: (
        <GenericSliceViewer
          sliceKey="newMessage"
          state={completeState.newMessage}
        />
      ),
    },
    {
      id: "chatDisplay",
      label: "Chat Display",
      content: (
        <GenericSliceViewer
          sliceKey="chatDisplay"
          state={completeState.chatDisplay}
        />
      ),
    },
    {
      id: "activeChat",
      label: "Active Chat",
      content: (
        <GenericSliceViewer
          sliceKey="activeChat"
          state={completeState.activeChat}
        />
      ),
    },
    {
      id: "chatConversations",
      label: "Chat Conversations",
      content: (
        <GenericSliceViewer
          sliceKey="chatConversations"
          state={completeState.chatConversations}
        />
      ),
    },
    {
      id: "messageActions",
      label: "Message Actions",
      content: (
        <GenericSliceViewer
          sliceKey="messageActions"
          state={completeState.messageActions}
        />
      ),
    },
    {
      id: "socketConnections",
      label: "Socket Connections",
      content: (
        <GenericSliceViewer
          sliceKey="socketConnections"
          state={completeState.socketConnections}
        />
      ),
    },
    {
      id: "socketResponse",
      label: "Socket Response",
      content: (
        <GenericSliceViewer
          sliceKey="socketResponse"
          state={completeState.socketResponse}
        />
      ),
    },
    {
      id: "socketTasks",
      label: "Socket Tasks",
      content: (
        <GenericSliceViewer
          sliceKey="socketTasks"
          state={completeState.socketTasks}
        />
      ),
    },
    {
      id: "componentDefinitions",
      label: "Component Definitions",
      content: (
        <GenericSliceViewer
          sliceKey="componentDefinitions"
          state={completeState.componentDefinitions}
        />
      ),
    },
    {
      id: "appBuilder",
      label: "App Builder",
      content: (
        <GenericSliceViewer
          sliceKey="appBuilder"
          state={completeState.appBuilder}
        />
      ),
    },
    {
      id: "appletBuilder",
      label: "Applet Builder",
      content: (
        <GenericSliceViewer
          sliceKey="appletBuilder"
          state={completeState.appletBuilder}
        />
      ),
    },
    {
      id: "containerBuilder",
      label: "Container Builder",
      content: (
        <GenericSliceViewer
          sliceKey="containerBuilder"
          state={completeState.containerBuilder}
        />
      ),
    },
    {
      id: "fieldBuilder",
      label: "Field Builder",
      content: (
        <GenericSliceViewer
          sliceKey="fieldBuilder"
          state={completeState.fieldBuilder}
        />
      ),
    },
    {
      id: "customAppRuntime",
      label: "Custom App Runtime",
      content: (
        <GenericSliceViewer
          sliceKey="customAppRuntime"
          state={completeState.customAppRuntime}
        />
      ),
    },
    {
      id: "customAppletRuntime",
      label: "Custom Applet Runtime",
      content: (
        <AppletRuntimeViewer
          sliceKey="customAppletRuntime"
          state={completeState.customAppletRuntime}
        />
      ),
    },
    {
      id: "broker",
      label: "Broker",
      content: (
        <GenericSliceViewer sliceKey="broker" state={completeState.broker} />
      ),
    },
    {
      id: "contextMenuCache",
      label: "Context Menu Cache",
      content: (
        <GenericSliceViewer
          sliceKey="contextMenuCache"
          state={completeState.contextMenuCache}
        />
      ),
    },
    {
      id: "agentCache",
      label: "Agent Cache",
      content: (
        <GenericSliceViewer
          sliceKey="agentCache"
          state={completeState.agentCache}
        />
      ),
    },
    {
      id: "promptCache",
      label: "Prompt Cache",
      content: (
        <GenericSliceViewer
          sliceKey="promptCache"
          state={completeState.promptCache}
        />
      ),
    },
    {
      id: "promptConsumers",
      label: "Prompt Consumers",
      content: (
        <GenericSliceViewer
          sliceKey="promptConsumers"
          state={completeState.promptConsumers}
        />
      ),
    },
    {
      id: "promptRunner",
      label: "Prompt Runner",
      content: (
        <GenericSliceViewer
          sliceKey="promptRunner"
          state={completeState.promptRunner}
        />
      ),
    },
    {
      id: "promptExecution",
      label: "Prompt Execution",
      content: (
        <GenericSliceViewer
          sliceKey="promptExecution"
          state={completeState.promptExecution}
        />
      ),
    },
    {
      id: "actionCache",
      label: "Action Cache",
      content: (
        <GenericSliceViewer
          sliceKey="actionCache"
          state={completeState.actionCache}
        />
      ),
    },
    {
      id: "dbFunctionNode",
      label: "DB Function Node",
      content: (
        <GenericSliceViewer
          sliceKey="dbFunctionNode"
          state={completeState.dbFunctionNode}
        />
      ),
    },
    {
      id: "workflows",
      label: "Workflows",
      content: (
        <GenericSliceViewer
          sliceKey="workflows"
          state={completeState.workflows}
        />
      ),
    },
    {
      id: "workflowNodes",
      label: "Workflow Nodes",
      content: (
        <GenericSliceViewer
          sliceKey="workflowNodes"
          state={completeState.workflowNodes}
        />
      ),
    },
    {
      id: "promptEditor",
      label: "Prompt Editor",
      content: (
        <GenericSliceViewer
          sliceKey="promptEditor"
          state={completeState.promptEditor}
        />
      ),
    },
    {
      id: "messaging",
      label: "Messaging",
      content: (
        <GenericSliceViewer
          sliceKey="messaging"
          state={completeState.messaging}
        />
      ),
    },
    {
      id: "adminPreferences",
      label: "Admin Preferences",
      content: (
        <GenericSliceViewer
          sliceKey="adminPreferences"
          state={completeState.adminPreferences}
        />
      ),
    },
    {
      id: "entitySystem",
      label: "Entity System",
      content: (
        <GenericSliceViewer
          sliceKey="entitySystem"
          state={completeState.entitySystem}
        />
      ),
    },
    {
      id: "agentSettings",
      label: "Agent Settings",
      content: (
        <GenericSliceViewer
          sliceKey="agentSettings"
          state={completeState.agentSettings}
        />
      ),
    },
    {
      id: "cxConversations",
      label: "CX Conversations",
      content: (
        <GenericSliceViewer
          sliceKey="cxConversations"
          state={completeState.cxConversations}
        />
      ),
    },
    {
      id: "modelRegistry",
      label: "Model Registry",
      content: (
        <GenericSliceViewer
          sliceKey="modelRegistry"
          state={completeState.modelRegistry}
        />
      ),
    },
    {
      id: "apiConfig",
      label: "API Config",
      content: (
        <GenericSliceViewer
          sliceKey="apiConfig"
          state={completeState.apiConfig}
        />
      ),
    },
    {
      id: "agentDefinition",
      label: "Agent Definition",
      content: (
        <GenericSliceViewer
          sliceKey="agentDefinition"
          state={completeState.agentDefinition}
        />
      ),
    },
    {
      id: "agentShortcut",
      label: "Agent Shortcuts",
      content: (
        <GenericSliceViewer
          sliceKey="agentShortcut"
          state={completeState.agentShortcut}
        />
      ),
    },
    {
      id: "agentConsumers",
      label: "Agent Consumers",
      content: (
        <GenericSliceViewer
          sliceKey="agentConsumers"
          state={completeState.agentConsumers}
        />
      ),
    },
    {
      id: "appContext",
      label: "App Context",
      content: (
        <GenericSliceViewer
          sliceKey="appContext"
          state={completeState.appContext}
        />
      ),
    },
    {
      id: "executionInstances",
      label: "Execution Instances",
      content: (
        <GenericSliceViewer
          sliceKey="executionInstances"
          state={completeState.executionInstances}
        />
      ),
    },
    {
      id: "instanceModelOverrides",
      label: "Instance Model Overrides",
      content: (
        <GenericSliceViewer
          sliceKey="instanceModelOverrides"
          state={completeState.instanceModelOverrides}
        />
      ),
    },
    {
      id: "instanceVariableValues",
      label: "Instance Variable Values",
      content: (
        <GenericSliceViewer
          sliceKey="instanceVariableValues"
          state={completeState.instanceVariableValues}
        />
      ),
    },
    {
      id: "instanceResources",
      label: "Instance Resources",
      content: (
        <GenericSliceViewer
          sliceKey="instanceResources"
          state={completeState.instanceResources}
        />
      ),
    },
    {
      id: "instanceContext",
      label: "Instance Context",
      content: (
        <GenericSliceViewer
          sliceKey="instanceContext"
          state={completeState.instanceContext}
        />
      ),
    },
    {
      id: "instanceUserInput",
      label: "Instance User Input",
      content: (
        <GenericSliceViewer
          sliceKey="instanceUserInput"
          state={completeState.instanceUserInput}
        />
      ),
    },
    {
      id: "instanceClientTools",
      label: "Instance Client Tools",
      content: (
        <GenericSliceViewer
          sliceKey="instanceClientTools"
          state={completeState.instanceClientTools}
        />
      ),
    },
    {
      id: "instanceUIState",
      label: "Instance UI State",
      content: (
        <GenericSliceViewer
          sliceKey="instanceUIState"
          state={completeState.instanceUIState}
        />
      ),
    },
    {
      id: "activeRequests",
      label: "Active Requests",
      content: (
        <GenericSliceViewer
          sliceKey="activeRequests"
          state={completeState.activeRequests}
        />
      ),
    },
    {
      id: "instanceConversationHistory",
      label: "Instance Conversation History",
      content: (
        <GenericSliceViewer
          sliceKey="instanceConversationHistory"
          state={completeState.instanceConversationHistory}
        />
      ),
    },
    {
      id: "mcp",
      label: "MCP",
      content: <GenericSliceViewer sliceKey="mcp" state={completeState.mcp} />,
    },
  ];

  return (
    <FullScreenOverlay
      isOpen={isOpen}
      onClose={onClose}
      title=""
      description="View the current Redux state of the application"
      tabs={tabs}
      width="95vw"
      height="95vh"
      compactTabs={true}
    />
  );
};

export default StateViewerOverlay;
