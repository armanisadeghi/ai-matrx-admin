// components\matrx-editor\utils\convertSelectionToBrokerChip.ts
import { useBrokersStore, Broker } from "../useBrokersStore";
import { renderBrokerChipInContainer } from "../BrokerChipRender";
import {
  BrokerChipCreationOptions,
  createChipContainer,
} from "../brokerChipUtils";
import { analyzeSelection } from "./selection";

export const convertSelectionToBrokerChip = async ({
  editorRef,
  broker,
  onProcessContent,
}: Omit<BrokerChipCreationOptions, "content">) => {
  if (!editorRef.current) return;

  const selectionResult = analyzeSelection(editorRef);
  if (!selectionResult) return;

  const { type, content, range, insertionInfo } = selectionResult;

  // Get the brokers store
  const updateBroker = useBrokersStore.getState().updateBroker;

  try {
    // First, attempt to update the broker with the selected content
    try {
      await updateBroker(broker.id, {
        value: content,
      });
    } catch (error) {
      console.error("Failed to update broker value:", error);
      return; // Exit early if we can't update the broker
    }

    // Now that the broker is updated, proceed with DOM manipulation
    const renderChip = (chipContainer: HTMLElement) => {
      renderBrokerChipInContainer(
        chipContainer,
        {
          ...broker,
          value: content, // Use the content we just saved
        },
        onProcessContent
      );
    };

    if (type === "line") {
      const chipContainer = createChipContainer(broker);
      const lineDiv = insertionInfo.container as HTMLElement;

      // Store the original content in case we need to rollback
      const originalContent = lineDiv.innerHTML;

      try {
        lineDiv.innerHTML = "";
        lineDiv.appendChild(chipContainer);
        renderChip(chipContainer);
      } catch (error) {
        // Rollback if DOM manipulation fails
        lineDiv.innerHTML = originalContent;
        throw error;
      }
    } else if (type === "multi") {
      const chipContainer = createChipContainer(broker);
      const beforeNode = document.createTextNode(" ");
      const afterNode = document.createTextNode(" ");

      // Store nodes for potential rollback
      const originalNodes = Array.from(range.cloneContents().childNodes);

      try {
        range.deleteContents();

        if (insertionInfo.isTextNode) {
          const parent = insertionInfo.container.parentNode;
          parent.insertBefore(beforeNode, insertionInfo.container);
          parent.insertBefore(chipContainer, insertionInfo.container);
          parent.insertBefore(afterNode, insertionInfo.container);
          parent.removeChild(insertionInfo.container);
        } else {
          insertionInfo.container.appendChild(beforeNode);
          insertionInfo.container.appendChild(chipContainer);
          insertionInfo.container.appendChild(afterNode);
        }

        renderChip(chipContainer);
      } catch (error) {
        // Rollback if DOM manipulation fails
        try {
          range.deleteContents();
          originalNodes.forEach((node) =>
            range.insertNode(node.cloneNode(true))
          );
        } catch (rollbackError) {
          console.error("Failed to rollback DOM changes:", rollbackError);
        }
        throw error;
      }
    } else {
      // Single node
      const chipContainer = createChipContainer(broker);
      const beforeNode = document.createTextNode(insertionInfo.beforeText);
      const afterNode = document.createTextNode(insertionInfo.afterText);

      // Store original node for potential rollback
      const originalNode = insertionInfo.container.cloneNode(true);

      try {
        insertionInfo.container.parentNode.replaceChild(
          beforeNode,
          insertionInfo.container
        );
        beforeNode.parentNode.insertBefore(
          chipContainer,
          beforeNode.nextSibling
        );
        chipContainer.parentNode.insertBefore(
          afterNode,
          chipContainer.nextSibling
        );

        renderChip(chipContainer);
      } catch (error) {
        // Rollback if DOM manipulation fails
        try {
          beforeNode.parentNode?.replaceChild(originalNode, beforeNode);
          chipContainer.remove();
          afterNode.remove();
        } catch (rollbackError) {
          console.error("Failed to rollback DOM changes:", rollbackError);
        }
        throw error;
      }
    }

    // Only process content if everything succeeded
    setTimeout(() => onProcessContent(), 0);
  } catch (error) {
    console.error("Error converting selection to broker chip:", error);
    // Attempt to revert broker update if DOM manipulation failed
    try {
      updateBroker(broker.id, {
        value: broker.value, // Revert to original value
      });
    } catch (revertError) {
      console.error("Failed to revert broker update:", revertError);
    }
  }
};
