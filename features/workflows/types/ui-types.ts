import { BaseNode } from "./backendTypes";

export interface TabComponentProps {
    node: BaseNode;
    onNodeUpdate: (updatedNode: BaseNode) => void;
}

export interface BrokerRelayData {
    id: string;
    type: "brokerRelay";
    source: string;
    targets: string[];
    label?: string;
}

export interface UserInputData {
    id: string;
    type: "userInput";
    broker_id: string;
    value: any;
    label?: string;
    data_type?: "int" | "float" | "str" | "bool" | "list" | "tuple" | "dict" | "set";
}

