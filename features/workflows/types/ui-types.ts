import { BaseNode } from "./backendTypes";

export interface TabComponentProps {
    node: BaseNode;
    onNodeUpdate: (updatedNode: BaseNode) => void;
}
