// state-analyzer/StateViewerOverlay.tsx
import React from "react";
import { useSelector } from "react-redux";
import FullScreenOverlay, { TabDefinition } from "@/components/official/FullScreenOverlay";
import GenericSliceViewer from "./sliceViewers/GenericSliceViewer";
import { RootState } from "@/lib/redux";
import EntitySliceViewer from "./sliceViewers/EntitySliceViewer";
import { featureSchemas } from "@/lib/redux/dynamic/featureSchema";
import { moduleSchemas, ModuleName } from "@/lib/redux/dynamic/moduleSchema";
import AppletRuntimeViewer from "./sliceViewers/AppletRuntimeViewer";

interface StateViewerOverlayProps {
    isOpen: boolean;
    onClose: () => void;
}

const StateViewerOverlay: React.FC<StateViewerOverlayProps> = ({ isOpen, onClose }) => {
    // Get the complete Redux state
    const completeState = useSelector((state: RootState) => state);

    // Create tabs based on the exact slices from your root reducer
    const tabs: TabDefinition[] = [
        {
            id: "customAppletRuntime",
            label: "Custom Applet Runtime",
            content: <AppletRuntimeViewer sliceKey="customAppletRuntime" state={completeState.customAppletRuntime} />,
        },
        {
            id: "customAppRuntime",
            label: "Custom App Runtime",
            content: <GenericSliceViewer sliceKey="customAppRuntime" state={completeState.customAppRuntime} />,
        },
        {
            id: "brokers",
            label: "Brokers",
            content: <GenericSliceViewer sliceKey="brokers" state={completeState.brokers} />,
        },
        {
            id: "brokerValues",
            label: "Broker Values",
            content: <GenericSliceViewer sliceKey="brokerValues" state={completeState.brokerValues} />,
        },
        {
            id: "appBuilder",
            label: "App Builder",
            content: <GenericSliceViewer sliceKey="appBuilder" state={completeState.appBuilder} />,
        },
        {
            id: "appletBuilder",
            label: "Applet Builder",
            content: <GenericSliceViewer sliceKey="appletBuilder" state={completeState.appletBuilder} />,
        },
        {
            id: "containerBuilder",
            label: "Container Builder",
            content: <GenericSliceViewer sliceKey="containerBuilder" state={completeState.containerBuilder} />,
        },
        {
            id: "fieldBuilder",
            label: "Field Builder",
            content: <GenericSliceViewer sliceKey="fieldBuilder" state={completeState.fieldBuilder} />,
        },

        {
            id: "socketConnections",
            label: "Socket Connections",
            content: <GenericSliceViewer sliceKey="socketConnections" state={completeState.socketConnections} />,
        },
        {
            id: "socketResponse",
            label: "Socket Response",
            content: <GenericSliceViewer sliceKey="socketResponse" state={completeState.socketResponse} />,
        },
        {
            id: "socketTasks",
            label: "Socket Tasks",
            content: <GenericSliceViewer sliceKey="socketTasks" state={completeState.socketTasks} />,
        },
        {
            id: "componentDefinitions",
            label: "Component Definitions",
            content: <GenericSliceViewer sliceKey="componentDefinitions" state={completeState.componentDefinitions} />,
        },

        {
            id: "fileSystem",
            label: "File System",
            content: <GenericSliceViewer sliceKey="fileSystem" state={completeState.fileSystem} />,
        },
        {
            id: "entities",
            label: "Entities",
            content: <GenericSliceViewer sliceKey="entities" state={completeState.entities} />,
        },
        {
            id: "entities-custom",
            label: "Entities Custom",
            content: <EntitySliceViewer sliceKey="entities" state={completeState.entities} />,
        },
        {
            id: "entityFields",
            label: "Entity Fields",
            content: <GenericSliceViewer sliceKey="entityFields" state={completeState.entityFields} />,
        },
        {
            id: "layout",
            label: "Layout",
            content: <GenericSliceViewer sliceKey="layout" state={completeState.layout} />,
        },
        {
            id: "theme",
            label: "Theme",
            content: <GenericSliceViewer sliceKey="theme" state={completeState.theme} />,
        },
        {
            id: "form",
            label: "Form",
            content: <GenericSliceViewer sliceKey="form" state={completeState.form} />,
        },
        {
            id: "user",
            label: "User",
            content: <GenericSliceViewer sliceKey="user" state={completeState.user} />,
        },
        {
            id: "userPreferences",
            label: "User Preferences",
            content: <GenericSliceViewer sliceKey="userPreferences" state={completeState.userPreferences} />,
        },
        {
            id: "testRoutes",
            label: "Test Routes",
            content: <GenericSliceViewer sliceKey="testRoutes" state={completeState.testRoutes} />,
        },
        {
            id: "flashcardChat",
            label: "Flashcard Chat",
            content: <GenericSliceViewer sliceKey="flashcardChat" state={completeState.flashcardChat} />,
        },
        {
            id: "aiChat",
            label: "AI Chat",
            content: <GenericSliceViewer sliceKey="aiChat" state={completeState.aiChat} />,
        },
        {
            id: "globalCache",
            label: "Global Cache",
            content: <GenericSliceViewer sliceKey="globalCache" state={completeState.globalCache} />,
        },
        {
            id: "ui",
            label: "UI",
            content: <GenericSliceViewer sliceKey="ui" state={completeState.ui} />,
        },
        {
            id: "notes",
            label: "Notes",
            content: <GenericSliceViewer sliceKey="notes" state={completeState.notes} />,
        },
        {
            id: "tags",
            label: "Tags",
            content: <GenericSliceViewer sliceKey="tags" state={completeState.tags} />,
        },
        {
            id: "storage",
            label: "Storage",
            content: <GenericSliceViewer sliceKey="storage" state={completeState.storage} />,
        },
        {
            id: "conversation",
            label: "Conversation",
            content: <GenericSliceViewer sliceKey="conversation" state={completeState.conversation} />,
        },
        {
            id: "messages",
            label: "Messages",
            content: <GenericSliceViewer sliceKey="messages" state={completeState.messages} />,
        },
        {
            id: "newMessage",
            label: "New Message",
            content: <GenericSliceViewer sliceKey="newMessage" state={completeState.newMessage} />,
        },
        {
            id: "chatDisplay",
            label: "Chat Display",
            content: <GenericSliceViewer sliceKey="chatDisplay" state={completeState.chatDisplay} />,
        },

        ...Object.keys(featureSchemas).map((key) => ({
            id: `feature-${key}`,
            label: `Feature: ${key}`,
            content: <GenericSliceViewer sliceKey={key} state={completeState[key]} />,
        })),

        // Module reducers - using the imported moduleSchemas
        ...Object.keys(moduleSchemas).map((key) => ({
            id: `module-${key}`,
            label: `Module: ${key}`,
            content: <GenericSliceViewer sliceKey={key} state={completeState[key]} />,
        })),
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
        />
    );
};

export default StateViewerOverlay;
