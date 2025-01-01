// components/matrx-editor/broker/BrokerChipRender.tsx
"use client";

import { createRoot } from "react-dom/client";

import { BrokerChip } from "./BrokerChip";
import { createBrokerNode, createCursorNode } from "../utils/core-dom-utils";
import { useBrokers, BrokersProvider, type Broker } from '@/providers/brokers/BrokersProvider';

export const renderBrokerChipInContainer = (
  container: HTMLElement,
  broker: Broker,
  onProcessContent: () => void
) => {
  console.log('🎯 Starting renderBrokerChipInContainer', {
    containerId: container.getAttribute('data-id'),
    brokerName: broker.displayName
  });

  const root = createRoot(container);

  const handleRemove = () => {
    console.log('🗑️ Handling chip removal');
    Promise.resolve().then(() => {
      root.unmount();
      container.remove();
      console.log('🔄 Scheduling content processing after removal');
      setTimeout(() => onProcessContent(), 0);
    });
  };

  root.render(<BrokerChip broker={broker} onRemoveRequest={handleRemove} />);

  const cursorNode = createCursorNode();
  container.after(cursorNode);
  console.log('➡️ Added cursor node after chip');

  // Process content once after chip is fully rendered
  setTimeout(() => {
    console.log('🔄 Processing content after chip render');
    onProcessContent();
  }, 0);

  return root;
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
  console.log('🎬 Starting chip insertion', {
    brokerName: broker.displayName,
    hasEditor: !!editorRef.current
  });

  if (!editorRef.current) return;

  const selection = window.getSelection();
  if (!selection || !selection.rangeCount) {
    console.warn('⚠️ No selection found for chip insertion');
    return;
  }

  const range = selection.getRangeAt(0);
  console.log('📍 Initial range', {
    startContainer: range.startContainer.nodeType,
    startOffset: range.startOffset,
    endContainer: range.endContainer.nodeType,
    endOffset: range.endOffset
  });

  let node = range.startContainer;
  while (node && node !== editorRef.current) {
    node = node.parentNode;
  }
  if (!node) {
    console.warn('⚠️ Selection outside editor');
    return;
  }

  Promise.resolve().then(() => {
    console.log('🏗️ Creating chip container');
    const { node: chipContainer } = createBrokerNode(broker);
    
    console.log('🗑️ Deleting range contents');
    range.deleteContents();
    
    console.log('📥 Inserting chip node');
    range.insertNode(chipContainer);

    console.log('🎨 Starting chip render');
    renderBrokerChipInContainer(chipContainer, broker, onProcessContent);

    // Move cursor after the chip
    const newRange = document.createRange();
    newRange.setStartAfter(chipContainer.nextSibling || chipContainer);
    newRange.collapse(true);
    selection.removeAllRanges();
    selection.addRange(newRange);
  });
};