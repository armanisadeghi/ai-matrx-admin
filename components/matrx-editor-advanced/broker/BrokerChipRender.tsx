// components/matrx-editor/broker/BrokerChipRender.tsx
'use client';

import { createRoot } from 'react-dom/client';
import { BrokerChip } from './BrokerChip';
import { createBrokerNode, createCursorNode } from '../utils/core-dom-utils';
import { EditorBroker } from '../types';
import { BrokerSyncProvider } from '@/providers/brokerSync/BrokerSyncProvider';

export const renderBrokerChipInContainer = (container: HTMLElement, broker: EditorBroker, onProcessContent: () => void) => {
    const root = createRoot(container);

    // Check if we already have a provider context
    const hasProviderContext = container.closest('[data-broker-sync-provider]');

    const handleRemove = () => {
        Promise.resolve().then(() => {
            root.unmount();
            container.remove();
            console.log('🔄 Scheduling content processing after removal');
            setTimeout(() => onProcessContent(), 0);
        });
    };

    const ChipContent = (
        <BrokerChip
            broker={broker}
            onRemoveRequest={handleRemove}
        />
    );

    root.render(hasProviderContext ? ChipContent : <BrokerSyncProvider>{ChipContent}</BrokerSyncProvider>);

    const cursorNode = createCursorNode();
    container.after(cursorNode);

    // Process content once after chip is fully rendered
    setTimeout(() => {
        console.log('🔄 Processing content after chip render');
        onProcessContent();
    }, 0);

    return root;
};

export interface BrokerChipCreationOptions {
    broker: EditorBroker;
    editorRef: React.RefObject<HTMLDivElement>;
    onProcessContent: () => void;
    updateBroker?: (id: string, data: Partial<EditorBroker>) => void;
}

export const insertBrokerChipAtSelection = async ({ broker, editorRef, onProcessContent }: BrokerChipCreationOptions) => {
    if (!editorRef.current) return;

    const selection = window.getSelection();
    if (!selection || !selection.rangeCount) {
        console.warn('⚠️ No selection found for chip insertion');
        return;
    }

    const range = selection.getRangeAt(0);

    let node = range.startContainer;
    while (node && node !== editorRef.current) {
        node = node.parentNode;
    }
    if (!node) {
        console.warn('⚠️ Selection outside editor');
        return;
    }

    Promise.resolve().then(() => {
        const { node: chipContainer } = createBrokerNode(broker);
        range.deleteContents();
        range.insertNode(chipContainer);

        renderBrokerChipInContainer(chipContainer, broker, onProcessContent);

        console.log('🔄 Moving cursor after chip');
        // Move cursor after the chip
        const newRange = document.createRange();
        newRange.setStartAfter(chipContainer.nextSibling || chipContainer);
        newRange.collapse(true);
        selection.removeAllRanges();
        selection.addRange(newRange);
    });
};
