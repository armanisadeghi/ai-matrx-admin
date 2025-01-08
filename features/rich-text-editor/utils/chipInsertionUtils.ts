// insertionUtils.ts

import { ChipData } from "../_dev/types";
import { createChipElement } from "./chipService";

export interface InsertionContext {
    editor: HTMLDivElement;
    selection: Selection;
    chipData: ChipData;
    debugMode?: boolean;
    handlers: {
        dragStart: (e: DragEvent) => void;
        dragEnd: (e: DragEvent) => void;
    };
}

export interface InsertionElements {
    chipWrapper: HTMLSpanElement;
    insertionWrapper: HTMLSpanElement;
    anchorNode: Text;
}

/**
 * Creates the DOM elements needed for chip insertion
 * @param context The context containing editor, selection, and chip data
 * @returns Object containing all created elements
 */
export const createInsertionElements = (context: InsertionContext): InsertionElements => {
    const { chipData, debugMode, handlers } = context;
    const debugWrapperClass = `chip-wrapper border-8 border-${chipData.color}-500`;

    const chipWrapper = document.createElement('span');
    chipWrapper.className = debugMode ? debugWrapperClass : 'chip-wrapper';

    const chip = createChipElement(chipData);
    chip.addEventListener('dragstart', handlers.dragStart);
    chip.addEventListener('dragend', handlers.dragEnd);

    const leadingSpace = document.createTextNode('\u00A0');
    const trailingSpace = document.createTextNode('\u00A0');
    const anchorNode = document.createTextNode('\u200B');

    const insertionWrapper = document.createElement('span');
    insertionWrapper.appendChild(leadingSpace);
    insertionWrapper.appendChild(chipWrapper);
    chipWrapper.appendChild(chip);
    insertionWrapper.appendChild(trailingSpace);
    insertionWrapper.appendChild(anchorNode);

    return {
        chipWrapper,
        insertionWrapper,
        anchorNode
    };
};

interface InsertionOperationContext {
    range: Range;
    editor: HTMLDivElement;
    selection: Selection;
}

/**
 * Performs the actual insertion of chip elements into the editor
 * @param elements The pre-created DOM elements to insert
 * @param context The context containing range and selection information
 */
export const performInsertion = (
    elements: InsertionElements,
    context: InsertionOperationContext
): void => {
    const { range, selection } = context;
    const { insertionWrapper, anchorNode } = elements;

    try {
        if (range.collapsed) {
            const insertPosition = range.startContainer;
            const parent = range.endContainer.parentNode;
            
            if (!parent) {
                throw new Error('No parent node found for insertion point');
            }

            if (insertPosition.nodeType === Node.TEXT_NODE) {
                const textNode = insertPosition as Text;
                const afterText = textNode.splitText(range.startOffset);
                const actualParent = afterText.parentNode;
                
                if (!actualParent?.parentNode) {
                    throw new Error('Invalid DOM hierarchy for text node insertion');
                }
                
                // Insert after the current text node's parent
                actualParent.parentNode.insertBefore(
                    insertionWrapper, 
                    actualParent.nextSibling
                );
            } else {
                const container = insertPosition.parentNode;
                if (!container) {
                    throw new Error('No container found for element insertion');
                }
                parent.insertBefore(insertionWrapper, container.nextSibling);
            }
        } else {
            // Handle selection range
            range.deleteContents();
            range.insertNode(insertionWrapper);
        }

        // Set cursor position after insertion
        const finalRange = document.createRange();
        finalRange.setStart(anchorNode, 0);
        finalRange.setEnd(anchorNode, 0);
        selection.removeAllRanges();
        selection.addRange(finalRange);
    } catch (error) {
        // Add context to any errors that occur during insertion
        throw new Error(`Insertion failed: ${error.message}
            StartContainer: ${range.startContainer.nodeType}
            EndContainer: ${range.endContainer.nodeType}
            Collapsed: ${range.collapsed}`);
    }
};

/**
 * Validates the insertion operation before it occurs
 * @param context The context for the insertion operation
 * @returns true if the operation can proceed
 */
export const validateInsertionContext = (
    context: InsertionOperationContext
): boolean => {
    const { range, editor } = context;

    if (!range || !editor.contains(range.commonAncestorContainer)) {
        return false;
    }

    // Ensure we're not trying to insert inside a chip
    let container = range.commonAncestorContainer;
    while (container && container !== editor) {
        if (container instanceof Element && container.hasAttribute('data-chip')) {
            return false;
        }
        container = container.parentNode;
    }

    return true;
};