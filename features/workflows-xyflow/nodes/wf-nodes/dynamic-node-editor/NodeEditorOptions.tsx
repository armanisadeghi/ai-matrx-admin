import React from "react";
import { DynamicNodeEditor, TabConfig } from "./DynamicNodeEditor";
import { OverviewTab, InputsTab, OutputsTab, DependenciesTab, AdminTab, MetadataTab, RawDataTab } from "@/features/workflows-xyflow/nodes/wf-nodes/editor-tabs";

// Example 1: Original full editor with all tabs
const DefaultNodeEditor: React.FC<{nodeId: string, isOpen: boolean, onOpenChange: (open: boolean) => void}> = ({
    nodeId,
    isOpen,
    onOpenChange
}) => {
    const tabs: TabConfig[] = [
        { id: "overview", label: "Overview", component: <OverviewTab nodeId={nodeId} /> },
        { id: "inputs", label: "Inputs", component: <InputsTab nodeId={nodeId} /> },
        { id: "outputs", label: "Outputs", component: <OutputsTab nodeId={nodeId} /> },
        { id: "dependencies", label: "Dependencies", component: <DependenciesTab nodeId={nodeId} /> },
        { id: "metadata", label: "Metadata", component: <MetadataTab nodeId={nodeId} /> },
        { id: "admin", label: "Admin", component: <AdminTab nodeId={nodeId} /> },
        { id: "rawdata", label: "Raw Data", component: <RawDataTab nodeId={nodeId} /> },
    ];

    return (
        <DynamicNodeEditor
            nodeId={nodeId}
            isOpen={isOpen}
            onOpenChange={onOpenChange}
            tabs={tabs}
            defaultTab="overview"
        />
    );
};

// Example 2: Simplified editor with only essential tabs
const SimpleNodeEditor: React.FC<{nodeId: string, isOpen: boolean, onOpenChange: (open: boolean) => void}> = ({
    nodeId,
    isOpen,
    onOpenChange
}) => {
    const tabs: TabConfig[] = [
        { id: "overview", label: "Overview", component: <OverviewTab nodeId={nodeId} /> },
        { id: "inputs", label: "Inputs", component: <InputsTab nodeId={nodeId} /> },
        { id: "outputs", label: "Outputs", component: <OutputsTab nodeId={nodeId} /> },
    ];

    return (
        <DynamicNodeEditor
            nodeId={nodeId}
            isOpen={isOpen}
            onOpenChange={onOpenChange}
            tabs={tabs}
        />
    );
};

// // Example 3: Custom editor with specialized tabs
// import { CustomAnalyticsTab, CustomConfigTab } from "./custom-tabs";

// const AnalyticsNodeEditor: React.FC<{nodeId: string, isOpen: boolean, onOpenChange: (open: boolean) => void}> = ({
//     nodeId,
//     isOpen,
//     onOpenChange
// }) => {
//     const tabs: TabConfig[] = [
//         { id: "overview", label: "Overview", component: <OverviewTab nodeId={nodeId} /> },
//         { id: "analytics", label: "Analytics", component: <CustomAnalyticsTab nodeId={nodeId} /> },
//         { id: "config", label: "Configuration", component: <CustomConfigTab nodeId={nodeId} /> },
//         { id: "admin", label: "Admin", component: <AdminTab nodeId={nodeId} /> },
//     ];

//     return (
//         <DynamicNodeEditor
//             nodeId={nodeId}
//             isOpen={isOpen}
//             onOpenChange={onOpenChange}
//             tabs={tabs}
//             defaultTab="analytics"
//         />
//     );
// };


export { DefaultNodeEditor, SimpleNodeEditor };