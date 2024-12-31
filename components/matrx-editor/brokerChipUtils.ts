// brokerChipUtils.ts
import { Broker } from "./useBrokersStore";
import { renderBrokerChipInContainer } from "./BrokerChipRender";
import { getSelectionInfo } from "./utils/selection";

export const createChipContainer = (broker: Broker) => {
  const chipContainer = document.createElement("span");
  chipContainer.setAttribute("data-chip-id", broker.id);
  chipContainer.setAttribute("data-chip-displayname", broker.displayName);
  chipContainer.setAttribute("data-chip", "");
  chipContainer.setAttribute("data-chip-content", broker.displayName);
  chipContainer.setAttribute("data-original-text", broker.value);
  chipContainer.contentEditable = "false";
  return chipContainer;
};

export interface BrokerChipCreationOptions {
  broker: Broker;
  editorRef: React.RefObject<HTMLDivElement>;
  onProcessContent: () => void;
}

export const insertBrokerChipAtSelection = async ({
  broker,
  editorRef,
  onProcessContent,
}: BrokerChipCreationOptions) => {
  if (!editorRef.current) return;

  const selection = window.getSelection();
  if (!selection || !selection.rangeCount) return;

  const range = selection.getRangeAt(0);
  let node = range.startContainer;
  while (node && node !== editorRef.current) {
    node = node.parentNode;
  }
  if (!node) return;

  Promise.resolve().then(() => {
    const chipContainer = createChipContainer(broker);
    range.deleteContents();
    range.insertNode(chipContainer);

    renderBrokerChipInContainer(chipContainer, broker, onProcessContent);

    setTimeout(() => onProcessContent(), 0);
  });
};
