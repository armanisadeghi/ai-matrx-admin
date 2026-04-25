import React from "react";
import {
  DynamicNodeEditor,
  TabConfig,
} from "./editor-options/DynamicNodeEditor";
import OverviewTab from "@/features/workflows-xyflow/node-editor/tabs/OverviewTab";
import InputsTab from "@/features/workflows-xyflow/node-editor/tabs/InputsTab";
import OutputsTab from "@/features/workflows-xyflow/node-editor/tabs/OutputsTab";
import DependenciesTab from "@/features/workflows-xyflow/node-editor/tabs/DependenciesTab";
import AdminTab from "@/features/workflows-xyflow/node-editor/tabs/AdminTab";
import MetadataTab from "@/features/workflows-xyflow/node-editor/tabs/MetadataTab";
import RegisteredFunctionTab from "@/features/workflows-xyflow/node-editor/tabs/RegisteredFunctionTab";
import RawDataTab from "@/features/workflows-xyflow/node-editor/tabs/RawDataTab";
import NodeDefinitionTab from "@/features/workflows-xyflow/node-editor/tabs/NodeDefinitionTab";
import SampleResultsTab from "@/features/workflows-xyflow/node-editor/tabs/SampleResultsTab";

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

const FlexibleNodeEditor: React.FC<FlexibleNodeEditorProps> = ({
  nodeId,
  isOpen,
  onOpenChange,
  children,
}) => {
  const tabs: TabConfig[] = React.Children.map(children, (child) => ({
    id: child.props.id,
    label: child.props.label,
    component: React.createElement(child.props.component, { nodeId: "" }),
  }));

  return (
    <DynamicNodeEditor
      nodeId={nodeId}
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      tabs={tabs}
    />
  );
};

export const NodeEditorOne = ({
  nodeId,
  isOpen,
  onOpenChange,
}: {
  nodeId: string;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}) => {
  return (
    <FlexibleNodeEditor
      nodeId={nodeId}
      isOpen={isOpen}
      onOpenChange={onOpenChange}
    >
      <Tab id="overview" label="Overview" component={OverviewTab} />
      <Tab id="inputs" label="Inputs" component={InputsTab} />
      <Tab id="outputs" label="Outputs" component={OutputsTab} />
      <Tab id="dependencies" label="Dependencies" component={DependenciesTab} />
      <Tab
        id="definition"
        label="Node Definition"
        component={NodeDefinitionTab}
      />
      <Tab
        id="sample-results"
        label="Sample Results"
        component={SampleResultsTab}
      />
      <Tab id="admin" label="Admin" component={AdminTab} />
      <Tab id="metadata" label="Metadata" component={MetadataTab} />
      <Tab id="rawdata" label="Raw Data" component={RawDataTab} />
    </FlexibleNodeEditor>
  );
};
