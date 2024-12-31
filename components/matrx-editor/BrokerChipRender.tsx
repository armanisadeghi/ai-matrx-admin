"use client";

import { createRoot } from "react-dom/client";
import { Broker } from "./useBrokersStore";
import { BrokerChip } from "./BrokerChip";

export const renderBrokerChipInContainer = (
    container: HTMLElement,
    broker: Broker,
    onProcessContent: () => void
) => {
  const root = createRoot(container);

  const handleRemove = () => {
    Promise.resolve().then(() => {
      root.unmount();
      container.remove();
      setTimeout(() => onProcessContent(), 0);
    });
  };

  root.render(<BrokerChip broker={broker} onRemoveRequest={handleRemove} />);

  const cursorNode = document.createTextNode("\u200B");
  container.after(cursorNode);

  return root;
};
