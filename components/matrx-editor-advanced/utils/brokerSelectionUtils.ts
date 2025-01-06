// brokerSelectionUtils.ts
import { renderBrokerChipInContainer } from "../broker/BrokerChipRender";
import { EditorBroker } from "../types";
import { createTextNode, InsertNodesOptions, insertNodesWithRollback } from "./core-dom-utils";

interface HandleSelectionBaseParams {
    chipContainer: HTMLElement;
    broker: EditorBroker;
    editorId: string;
    onProcessContent: () => void;
}

interface HandleLineSelectionParams extends HandleSelectionBaseParams {
    insertionInfo: { container: Node };
}

export const handleLineSelection = ({ 
    chipContainer, 
    insertionInfo, 
    broker, 
    editorId,
    onProcessContent 
}: HandleLineSelectionParams): void => {
    const lineDiv = insertionInfo.container as HTMLElement;
    const originalContent = lineDiv.innerHTML;

    try {
        const success = insertNodesWithRollback({
            nodes: [chipContainer],
            target: lineDiv,
            position: 'append',
            rollbackNodes: Array.from(lineDiv.childNodes) as HTMLElement[],
        });

        if (!success) throw new Error('Failed to insert chip');

        renderBrokerChipInContainer(chipContainer, broker, onProcessContent);
    } catch (error) {
        lineDiv.innerHTML = originalContent;
        throw error;
    }
};

interface HandleMultiSelectionParams extends HandleSelectionBaseParams {
    range: Range;
    insertionInfo: { 
        container: Node; 
        isTextNode: boolean;
    };
}

export const handleMultiSelection = ({
    chipContainer,
    range,
    insertionInfo,
    broker,
    editorId,
    onProcessContent
}: HandleMultiSelectionParams): void => {
    const { node: beforeNode } = createTextNode(' ');
    const { node: afterNode } = createTextNode(' ');
    const originalNodes = Array.from(range.cloneContents().childNodes);

    try {
        range.deleteContents();

        const nodes = [beforeNode, chipContainer, afterNode];
        const insertOptions: InsertNodesOptions = {
            nodes,
            target: insertionInfo.isTextNode
                ? (insertionInfo.container.parentElement as HTMLElement)
                : (insertionInfo.container as HTMLElement),
            position: insertionInfo.isTextNode ? 'replaceWith' : 'append',
        };

        const success = insertNodesWithRollback(insertOptions);
        if (!success) throw new Error('Failed to insert nodes');

        renderBrokerChipInContainer(chipContainer, broker, onProcessContent);
    } catch (error) {
        try {
            range.deleteContents();
            originalNodes.forEach((node) => range.insertNode(node.cloneNode(true)));
        } catch (rollbackError) {
            console.error('Failed to rollback DOM changes:', rollbackError);
        }
        throw error;
    }
};

interface HandleSingleNodeSelectionParams extends HandleSelectionBaseParams {
    insertionInfo: {
        container: Node;
        beforeText?: string;
        afterText?: string;
    };
}

export const handleSingleNodeSelection = ({
    chipContainer,
    insertionInfo,
    broker,
    editorId,
    onProcessContent
}: HandleSingleNodeSelectionParams): void => {
    const { node: beforeNode } = createTextNode(insertionInfo.beforeText || '');
    const { node: afterNode } = createTextNode(insertionInfo.afterText || '');
    const container = insertionInfo.container as HTMLElement;
    const originalNode = container.cloneNode(true);

    try {
        const nodes = [beforeNode, chipContainer, afterNode];
        const success = insertNodesWithRollback({
            nodes,
            target: container,
            position: 'replaceWith',
            rollbackNodes: [originalNode as HTMLElement],
        });

        if (!success) throw new Error('Failed to insert nodes');

        renderBrokerChipInContainer(chipContainer, broker, onProcessContent);
    } catch (error) {
        try {
            beforeNode.parentElement?.replaceChild(originalNode, beforeNode);
            chipContainer.remove();
            afterNode.remove();
        } catch (rollbackError) {
            console.error('Failed to rollback DOM changes:', rollbackError);
        }
        throw error;
    }
};