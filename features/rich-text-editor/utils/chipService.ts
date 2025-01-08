// chipService.ts

import { cn } from '@/utils';
import { ChipData } from '../_dev/types';
import { getColorClassName } from './colorUitls';

export const createChipElementWorkingTwo = (chipData: ChipData, { onDragStart, onDragEnd }): HTMLSpanElement => {
    const chip = document.createElement('span');
    const colorClassName = getColorClassName(chipData.color);

    chip.contentEditable = 'false';
    chip.className = cn('inline-flex items-center px-2 py-1 mx-1 rounded-md cursor-move', colorClassName);
    chip.setAttribute('data-chip', 'true');
    chip.setAttribute('data-chip-id', chipData.id);
    chip.setAttribute('data-chip-label', chipData.label);
    chip.setAttribute('data-chip-original-content', chipData.stringValue);
    chip.setAttribute('data-broker-id', chipData.brokerId);
    chip.setAttribute('draggable', 'true');
    chip.textContent = chipData.label;

    if (onDragStart) chip.addEventListener('dragstart', onDragStart);
    if (onDragEnd) chip.addEventListener('dragend', onDragEnd);

    return chip;
};

export const createChipElement = (chipData: ChipData, { onDragStart, onDragEnd }): HTMLSpanElement => {
    // Create the outer container that will be draggable and hold spaces
    const chipContainer = document.createElement('span');
    chipContainer.contentEditable = 'false';
    chipContainer.setAttribute('draggable', 'true');
    chipContainer.setAttribute('data-chip-container', 'true');

    // Create the actual chip with its styling and data
    const chip = document.createElement('span');
    const colorClassName = getColorClassName(chipData.color);
    chip.className = cn('inline-flex items-center px-2 py-1 mx-1 rounded-md cursor-move', colorClassName);
    chip.setAttribute('data-chip', 'true');
    chip.setAttribute('data-chip-id', chipData.id);
    chip.setAttribute('data-chip-label', chipData.label);
    chip.setAttribute('data-chip-original-content', chipData.stringValue);
    chip.setAttribute('data-broker-id', chipData.brokerId);
    chip.textContent = chipData.label;

    // Add drag handlers to the container
    if (onDragStart) chipContainer.addEventListener('dragstart', onDragStart);
    if (onDragEnd) chipContainer.addEventListener('dragend', onDragEnd);

    // Assemble the structure with spaces
    chipContainer.appendChild(document.createTextNode('\u00A0\u00A0')); // Two spaces before
    chipContainer.appendChild(chip);
    chipContainer.appendChild(document.createTextNode('\u00A0\u00A0')); // Two spaces after

    return chipContainer;
};

export const createFragmentChipStructure = (
    chipData: ChipData,
    { onDragStart, onDragEnd }
): { elements: HTMLSpanElement[], cursorTargetId: string } => {
    const cursorTargetId = `cursor-target-${Math.random().toString(36).substr(2, 9)}`;
    
    const beforeBuffer = document.createElement('span');
    beforeBuffer.appendChild(document.createTextNode('\u200B'));
    
    const chip = createChipElement(chipData, { onDragStart, onDragEnd });
    
    const afterBuffer = document.createElement('span');
    afterBuffer.setAttribute('data-cursor-target', cursorTargetId);
    afterBuffer.appendChild(document.createTextNode('\u200B'));

    return { 
        elements: [beforeBuffer, chip, afterBuffer],
        cursorTargetId 
    };
};


export function positionCursorInTargetSpan(cursorTargetId: string, selection: Selection) {
    const targetSpan = document.querySelector(`[data-cursor-target="${cursorTargetId}"]`);
    if (!targetSpan || !targetSpan.firstChild) return;

    const range = document.createRange();
    range.selectNodeContents(targetSpan);
    range.collapse(true);
    
    selection.removeAllRanges();
    selection.addRange(range);
}

export function insertElementsWithoutNesting(
    elements: HTMLSpanElement[],
    parent: Node,
    referenceNode: Node | null
) {
    if (parent.nodeName === 'SPAN') {
        const parentSpan = parent as HTMLSpanElement;
        const afterSpan = parentSpan.cloneNode(false);
        
        let currentNode = referenceNode?.nextSibling;
        while (currentNode) {
            const nextNode = currentNode.nextSibling;
            afterSpan.appendChild(currentNode);
            currentNode = nextNode;
        }

        // Insert each element in sequence
        elements.forEach(element => {
            parentSpan.parentNode?.insertBefore(element, parentSpan.nextSibling);
        });
        
        // Insert the after span last
        elements[elements.length - 1].after(afterSpan);
    } else {
        let insertionPoint = referenceNode?.nextSibling || null;
        elements.forEach(element => {
            parent.insertBefore(element, insertionPoint);
            insertionPoint = element.nextSibling;
        });
    }
}


function findSafeInsertionPoint(startNode: Node | null): { parent: Node, referenceNode: Node | null } {
    let currentNode = startNode;
    let lastSpanInDiv: Node | null = null;

    while (currentNode) {
        // Track the last span we see in case we need to fall back
        if (currentNode.nodeName === 'SPAN') {
            lastSpanInDiv = currentNode;
        }

        // Check if we've reached the end of a div
        if (currentNode.nodeName === 'DIV' && !currentNode.nextSibling) {
            if (lastSpanInDiv) {
                return {
                    parent: lastSpanInDiv.parentNode!,
                    referenceNode: lastSpanInDiv
                };
            }
            // If no spans found, insert at the end of the div
            return {
                parent: currentNode,
                referenceNode: null
            };
        }

        // Check if this is a safe node
        if (currentNode.nodeName === 'SPAN') {
            const span = currentNode as HTMLSpanElement;
            const isSafe = span.contentEditable !== 'false' &&
                          !span.hasAttribute('data-chip-container') &&
                          !span.hasAttribute('data-chip');
            
            if (isSafe) {
                return {
                    parent: span.parentNode!,
                    referenceNode: span
                };
            }
        }

        currentNode = currentNode.nextSibling;
    }

    // If we've reached the end of the document
    if (lastSpanInDiv) {
        return {
            parent: lastSpanInDiv.parentNode!,
            referenceNode: lastSpanInDiv
        };
    }

    // Final fallback - return the original position
    return {
        parent: startNode?.parentNode!,
        referenceNode: startNode
    };
}




export function positionCursorInBuffer(fragment: DocumentFragment) {
    // Get the trailing buffer span (the last span in our fragment)
    const bufferSpan = fragment.lastElementChild;
    if (!bufferSpan) return;

    const range = document.createRange();
    range.selectNodeContents(bufferSpan);
    range.collapse(true); // Collapse to start of buffer

    const selection = window.getSelection();
    if (selection) {
        selection.removeAllRanges();
        selection.addRange(range);
    }
}

// function insertWithStructurePreservation(content: DocumentFragment, currentRange: Range, parent: Node | null | undefined, container: Node): boolean {
//     try {
//         const isRangeCollapsed = currentRange.collapsed;
//         const insertPosition = currentRange.startContainer;
//         const isTextNode = insertPosition.nodeType === Node.TEXT_NODE;

//         if (isRangeCollapsed && isTextNode) {
//             const textNode = insertPosition as Text;
//             const afterText = textNode.splitText(currentRange.startOffset);
//             insertFragmentWithoutNesting(content, parent!, afterText);
//         } else {
//             currentRange.deleteContents();
//             insertFragmentWithoutNesting(content, container, null);
//         }

//         positionCursorInBuffer(content);
//         return true;
//     } catch (error) {
//         return false;
//     }
// }

export const createChipWithStructure = (
    chipData: ChipData,
    { onDragStart, onDragEnd }
): { beforeBuffer: HTMLSpanElement; chip: HTMLSpanElement; afterBuffer: HTMLSpanElement } => {
    // Create our chip with its spaces and styling
    const chip = createChipElement(chipData, { onDragStart, onDragEnd });

    // Create independent buffer spans
    const beforeBuffer = document.createElement('span');
    beforeBuffer.appendChild(document.createTextNode('\u200B'));

    const afterBuffer = document.createElement('span');
    afterBuffer.appendChild(document.createTextNode('\u200B'));

    return {
        beforeBuffer,
        chip,
        afterBuffer,
    };
};

export function createCompleteChipStructure(chipData: ChipData, dragConfig, debugMode = false) {
    // Create wrapper
    const chipWrapper = document.createElement('span');
    const debbugWrapperClass = `chip-wrapper border border-${chipData.color}-500`;
    chipWrapper.className = debugMode ? debbugWrapperClass : 'chip-wrapper';
    chipWrapper.setAttribute('data-chip-wrapper', 'true');

    // Create chip with drag handlers
    const chip = createChipElement(chipData, dragConfig);

    // Create unique identifier for this structure
    const structureId = `chip-structure-${chipData.id}`;

    // Create spacing node wrappers
    const leadingSpaceWrapper = document.createElement('span');
    const trailingSpaceWrapper = document.createElement('span');

    // Add identifying attributes
    leadingSpaceWrapper.setAttribute('data-chip-space', 'true');
    leadingSpaceWrapper.setAttribute('data-space-type', 'leading');
    leadingSpaceWrapper.setAttribute('data-structure-id', structureId);

    trailingSpaceWrapper.setAttribute('data-chip-space', 'true');
    trailingSpaceWrapper.setAttribute('data-space-type', 'trailing');
    trailingSpaceWrapper.setAttribute('data-structure-id', structureId);

    // Create anchor wrapper
    const anchorWrapper = document.createElement('span');
    anchorWrapper.setAttribute('data-chip-anchor', 'true');
    anchorWrapper.setAttribute('data-structure-id', structureId);

    // Create and append the actual nodes
    leadingSpaceWrapper.appendChild(document.createTextNode('\u00A0'));
    trailingSpaceWrapper.appendChild(document.createTextNode('\u00A0'));
    anchorWrapper.appendChild(document.createTextNode('\u200B'));

    // Assemble the structure
    const insertionWrapper = document.createElement('span');
    insertionWrapper.setAttribute('data-chip-container', 'true');
    insertionWrapper.setAttribute('data-structure-id', structureId);

    insertionWrapper.appendChild(leadingSpaceWrapper);
    insertionWrapper.appendChild(chipWrapper);
    chipWrapper.appendChild(chip);
    insertionWrapper.appendChild(trailingSpaceWrapper);
    insertionWrapper.appendChild(anchorWrapper);

    return {
        insertionWrapper,
        chipWrapper,
        chip,
        anchorNode: anchorWrapper.firstChild as Text,
    };
}

export const createChipElementWorking = (chipData: ChipData): HTMLSpanElement => {
    const chip = document.createElement('span');
    const colorClassName = getColorClassName(chipData.color);
    chip.contentEditable = 'false';
    chip.className = cn('inline-flex items-center px-2 py-1 mx-1 rounded-md cursor-move', colorClassName);
    chip.setAttribute('data-chip', 'true');
    chip.setAttribute('data-chip-id', chipData.id);
    chip.setAttribute('data-chip-label', chipData.label);
    chip.setAttribute('data-chip-original-content', chipData.stringValue);
    chip.setAttribute('data-broker-id', chipData.brokerId);
    chip.setAttribute('draggable', 'true');
    chip.textContent = chipData.label;
    return chip;
};

export const createChipElements = (
    chipData: ChipData,
    debugMode: boolean,
    eventHandlers: {
        onDragStart: (e: DragEvent) => void;
        onDragEnd: (e: DragEvent) => void;
    }
) => {
    const chipWrapper = document.createElement('span');
    chipWrapper.className = debugMode ? `chip-wrapper border border-${chipData.color}-500` : 'chip-wrapper';

    const chip = createChipElementWorking(chipData);
    chip.addEventListener('dragstart', eventHandlers.onDragStart);
    chip.addEventListener('dragend', eventHandlers.onDragEnd);

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
        insertionWrapper,
        anchorNode,
    };
};
