import React from "react";
import { DynamicNodeEditor, TabConfig } from "./DynamicNodeEditor";
import { OverviewTab, InputsTab, OutputsTab, DependenciesTab, AdminTab, MetadataTab, RegisteredFunctionTab } from "../editor-tabs";
import InputEditor from "../editor-tabs/InputEditor";

// Helper component to make tab creation easier
interface TabProps {
    id: string;
    label: string;
    component: React.ComponentType<{ nodeId: string }>;
}

const Tab: React.FC<TabProps> = ({ component: Component }) => {
    // This will receive nodeId from DynamicNodeEditor via cloneElement
    return <Component nodeId="" />;
};

interface FlexibleNodeEditorProps {
    nodeId: string;
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    children: React.ReactElement<TabProps>[];
}

const FlexibleNodeEditor: React.FC<FlexibleNodeEditorProps> = ({ nodeId, isOpen, onOpenChange, children }) => {
    const tabs: TabConfig[] = React.Children.map(children, (child) => ({
        id: child.props.id,
        label: child.props.label,
        component: React.createElement(child.props.component, { nodeId: "" }),
    }));

    return <DynamicNodeEditor nodeId={nodeId} isOpen={isOpen} onOpenChange={onOpenChange} tabs={tabs} />;
};

export const NodeEditorOne = ({ nodeId, isOpen, onOpenChange }: { nodeId: string; isOpen: boolean; onOpenChange: (open: boolean) => void }) => {
    return (
        <FlexibleNodeEditor nodeId={nodeId} isOpen={isOpen} onOpenChange={onOpenChange}>
            <Tab id="overview" label="Overview" component={OverviewTab} />
            <Tab id="inputs" label="Inputs" component={InputEditor} />
            <Tab id="outputs" label="Outputs" component={OutputsTab} />
            <Tab id="dependencies" label="Dependencies" component={DependenciesTab} />
            <Tab id="admin" label="Admin" component={AdminTab} />
            <Tab id="metadata" label="Metadata" component={MetadataTab} />
            <Tab id="registered-function" label="Registered Function" component={RegisteredFunctionTab} />
        </FlexibleNodeEditor>
    );
};
