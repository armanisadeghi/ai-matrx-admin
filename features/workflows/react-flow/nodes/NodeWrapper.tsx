"use client";
import React, { useEffect } from "react";
import { NodeProps, Handle, Position, useUpdateNodeInternals, Connection } from "reactflow";
import WorkflowNode from "@/features/workflows/react-flow/nodes/WorkflowNode";
import UserInputNode from "@/features/workflows/react-flow/nodes/UserInputNode";
import BrokerRelayNode from "@/features/workflows/react-flow/nodes/BrokerRelayNode";
import NodeFloatingIcon from "@/features/workflows/react-flow/nodes/NodeFloatingIcon";
import { EnrichedBroker } from "@/features/workflows/utils/data-flow-manager";
import { DataBrokerData } from "@/types/AutomationSchemaTypes";
import { DbNodeData, DbUserInput, DbBrokerRelayData, DbFunctionNode } from "@/features/workflows/types";
import { getNodePotentialInputsAndOutputs, parseEdge } from "../../utils/node-utils";
import { useTheme } from "@/styles/themes";

// TypeScript declaration for window object
declare global {
    interface Window {
        workflowSystemRef?: {
            deleteNode: (nodeId: string) => void;
            editNode: (nodeData: any) => void;
            editNodeWithTab?: (nodeData: any, tabId: string) => void;
            getUserInputs: () => { broker_id: string; default_value: string }[];
            duplicateNode: (nodeId: string) => void;
            handleConnection: (matrxEdge: any) => void;
            onConnectionMade?: (sourceNode: any, targetNode: any, matrxEdge: any) => void;
        };
        workflowEnrichedBrokers?: EnrichedBroker[];
        workflowAllKnownBrokers?: DataBrokerData[];
    }
}

interface NodeWrapperProps extends NodeProps {
    data: DbNodeData;
}

export const NodeWrapper: React.FC<NodeWrapperProps> = ({ data, selected, id, type }) => {
    const updateNodeInternals = useUpdateNodeInternals();
    const { mode } = useTheme();
    const inputsAndOutputs = getNodePotentialInputsAndOutputs(data, type);
    
    const enrichedBrokers = window.workflowEnrichedBrokers || [];

    const handleDelete = (nodeId: string) => {
        window.workflowSystemRef?.deleteNode?.(nodeId);
    };

    const handleEdit = (nodeData: any) => {
        window.workflowSystemRef?.editNode?.(nodeData);
    };

    const handleShowResults = (nodeData: any) => {
        window.workflowSystemRef?.editNodeWithTab?.(nodeData, 'results');
        window.workflowSystemRef?.editNode?.(nodeData);
    };

    const handleDuplicate = (nodeId: string) => {
        window.workflowSystemRef?.duplicateNode?.(nodeId);
    };

    const userInputs = window.workflowSystemRef?.getUserInputs?.() || [];

    // Update node internals when component mounts or when handles change
    useEffect(() => {
        updateNodeInternals(id);
    }, [id, updateNodeInternals, type]);

    const borderColorHandles = () => {
        if (mode === "dark") {
            return "0.5px solid white";
        }
        return "0.5px solid black";
    };

    const handleOnConnect = (connection: Connection) => {
        const matrxEdge = parseEdge(connection);
        console.log("matrxEdge", JSON.stringify(matrxEdge, null, 2));
        
        // Call the connection handler from the workflow system
        window.workflowSystemRef?.handleConnection?.(matrxEdge);
    };

    if (type === "userInput") {
        const userInputData = data as DbUserInput;
        return (
            <div className="relative">
                <UserInputNode
                    data={userInputData}
                    selected={selected}
                    onDelete={handleDelete}
                    onEdit={handleEdit}
                    onDuplicate={handleDuplicate}
                />
                <NodeFloatingIcon nodeData={userInputData} type={type} selected={selected} />
                {/* Output handle for user inputs */}

                {inputsAndOutputs.outputs.length > 0 && (
                    <Handle
                        key={inputsAndOutputs.outputs[0].handleId}
                        type="source"
                        position={Position.Right}
                        id={inputsAndOutputs.outputs[0].handleId}
                        isConnectableEnd={false}
                        isConnectableStart={true}
                        onConnect={handleOnConnect}
                        style={{
                            width: "8px",
                            height: "8px",
                            backgroundColor: "#22c55e",
                            border: borderColorHandles(),
                            right: -4,
                        }}
                    />
                )}
            </div>
        );
    }

    if (type === "brokerRelay") {
        const brokerRelayData = data as DbBrokerRelayData;
        return (
            <div className="relative">
                <BrokerRelayNode
                    data={brokerRelayData}
                    inputsAndOutputs={inputsAndOutputs}
                    selected={selected}
                    onDelete={handleDelete}
                    onEdit={handleEdit}
                    onDuplicate={handleDuplicate}
                    onConnect={handleOnConnect}
                />
                <NodeFloatingIcon nodeData={brokerRelayData} type={type} selected={selected} />
            </div>
        );
    }

    if (type === "workflowNode") {
        const functionNodeData = data as DbFunctionNode;
        return (
            <div className="relative">
                <WorkflowNode
                    data={functionNodeData}
                    inputsAndOutputs={inputsAndOutputs}
                    selected={selected}
                    onDelete={handleDelete}
                    onEdit={handleEdit}
                    onDuplicate={handleDuplicate}
                    userInputs={userInputs}
                    onConnect={handleOnConnect}
                    onShowResults={handleShowResults}
                />
                <NodeFloatingIcon nodeData={functionNodeData} type={type} selected={selected} />
            </div>
        );
    }

    // Default to workflow node for registered functions
    const functionNodeData = data as DbFunctionNode;
    return (
        <div className="relative">
            <WorkflowNode
                data={functionNodeData}
                inputsAndOutputs={inputsAndOutputs}
                selected={selected}
                onDelete={handleDelete}
                onEdit={handleEdit}
                onDuplicate={handleDuplicate}
                userInputs={userInputs}
                onConnect={handleOnConnect}
                onShowResults={handleShowResults}
            />
            <NodeFloatingIcon nodeData={functionNodeData} type={type} selected={selected} />
        </div>
    );
};
