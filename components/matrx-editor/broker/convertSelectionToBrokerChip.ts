// convertSelectionToBrokerChip.ts

import { BrokerChipCreationOptions, renderBrokerChipInContainer } from "../broker/BrokerChipRender";
import { analyzeSelection } from "../utils/selection";
import {
  createBrokerNode,
  createTextNode,
  insertNodesWithRollback,
  InsertNodesOptions
} from "../utils/core-dom-utils";
import { useBrokers, BrokersProvider, type Broker } from '@/providers/brokers/BrokersProvider';

export const convertSelectionToBrokerChip = async ({
  editorRef,
  broker,
  onProcessContent,
}: BrokerChipCreationOptions) => {
  if (!editorRef.current) return;

  const selectionResult = analyzeSelection(editorRef);
  if (!selectionResult) return;

  const { type, content, range, insertionInfo } = selectionResult;
  const { updateBroker } = useBrokers();

  try {
    // Update broker with selected content
    try {
      await updateBroker(broker.id, { value: content });
    } catch (error) {
      console.error("Failed to update broker value:", error);
      return;
    }

    const updatedBroker = { ...broker, value: content };
    
    // Create broker node using our utility
    const { node: chipContainer } = createBrokerNode(updatedBroker);

    // Handle different selection types
    if (type === "line") {
      const lineDiv = insertionInfo.container as HTMLElement;
      const originalContent = lineDiv.innerHTML;

      try {
        const success = insertNodesWithRollback({
          nodes: [chipContainer],
          target: lineDiv,
          position: 'append',
          rollbackNodes: Array.from(lineDiv.childNodes) as HTMLElement[]
        });

        if (!success) throw new Error("Failed to insert chip");

        renderBrokerChipInContainer(chipContainer, updatedBroker, onProcessContent);
      } catch (error) {
        lineDiv.innerHTML = originalContent;
        throw error;
      }
    } else if (type === "multi") {
      const { node: beforeNode } = createTextNode(" ");
      const { node: afterNode } = createTextNode(" ");
      const originalNodes = Array.from(range.cloneContents().childNodes);

      try {
        range.deleteContents();

        const nodes = [beforeNode, chipContainer, afterNode];
        const insertOptions: InsertNodesOptions = {
          nodes,
          target: insertionInfo.isTextNode 
            ? insertionInfo.container.parentElement as HTMLElement 
            : insertionInfo.container as HTMLElement,
          position: insertionInfo.isTextNode ? 'replaceWith' : 'append'
        };

        const success = insertNodesWithRollback(insertOptions);
        if (!success) throw new Error("Failed to insert nodes");

        renderBrokerChipInContainer(chipContainer, updatedBroker, onProcessContent);
      } catch (error) {
        try {
          range.deleteContents();
          originalNodes.forEach(node => range.insertNode(node.cloneNode(true)));
        } catch (rollbackError) {
          console.error("Failed to rollback DOM changes:", rollbackError);
        }
        throw error;
      }
    } else {
      // Single node case
      const { node: beforeNode } = createTextNode(insertionInfo.beforeText || "");
      const { node: afterNode } = createTextNode(insertionInfo.afterText || "");
      const container = insertionInfo.container as HTMLElement;
      const originalNode = container.cloneNode(true);

      try {
        const nodes = [beforeNode, chipContainer, afterNode];
        const success = insertNodesWithRollback({
          nodes,
          target: container,
          position: 'replaceWith',
          rollbackNodes: [originalNode as HTMLElement]
        });

        if (!success) throw new Error("Failed to insert nodes");

        renderBrokerChipInContainer(chipContainer, updatedBroker, onProcessContent);
      } catch (error) {
        try {
          beforeNode.parentElement?.replaceChild(originalNode, beforeNode);
          chipContainer.remove();
          afterNode.remove();
        } catch (rollbackError) {
          console.error("Failed to rollback DOM changes:", rollbackError);
        }
        throw error;
      }
    }

    setTimeout(() => onProcessContent(), 0);
  } catch (error) {
    console.error("Error converting selection to broker chip:", error);
    try {
      updateBroker(broker.id, { value: broker.value });
    } catch (revertError) {
      console.error("Failed to revert broker update:", revertError);
    }
  }
};