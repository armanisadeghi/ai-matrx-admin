// chipService.ts

import { cn } from '@/utils';
import { getColorClassName } from './colorUitls';
import { CHIP_BASE_CLASS } from '../constants';
import { BrokerMetaData, DOMSnapshot } from '../types/editor.types';
import { ChipMenuContextValue } from '../components/ChipContextMenu';

// export interface ChipHandlers {
//     onDragStart?: (event: MouseEvent) => void;
//     onDragEnd?: (event: MouseEvent) => void;
//     onClick?: (event: MouseEvent) => void;
//     onDoubleClick?: (event: MouseEvent) => void;
//     onMouseEnter?: (event: MouseEvent) => void;
//     onMouseLeave?: (event: MouseEvent) => void;
//     onContextMenu?: (event: MouseEvent) => void;
//     onNewChip?: (brokerMetadata: BrokerMetaData) => void;

// }

// type ChipHandlerOptions = {
//     showMenu: ChipMenuContextValue['showMenu'];
//     editorId: string;
//     handlers?: ChipHandlers;
// };

// export const createChipHandlers = ({ handlers }: ChipHandlerOptions): ChipHandlers => {
//     // Simply pass through the handlers as they are
//     return {
//         onDragStart: handlers?.onDragStart,
//         onDragEnd: handlers?.onDragEnd,
//         onClick: handlers?.onClick,
//         onDoubleClick: handlers?.onDoubleClick,
//         onMouseEnter: handlers?.onMouseEnter,
//         onMouseLeave: handlers?.onMouseLeave,
//         onContextMenu: handlers?.onContextMenu,
//         onNewChip: handlers?.onNewChip
//     };
// };




// export const createChipElement = (
//     brokerMetadata: BrokerMetaData,
//     handlers: Partial<ChipHandlers>
// ): HTMLSpanElement => {
//     const {
//         onDragStart,
//         onDragEnd,
//         onClick,
//         onDoubleClick,
//         onMouseEnter,
//         onMouseLeave,
//         onContextMenu,
//     } = handlers;

//     // Create the outer container that will be draggable and hold spaces
//     const chipContainer = document.createElement('span');
//     chipContainer.contentEditable = 'false';
//     chipContainer.setAttribute('draggable', 'true');
//     chipContainer.setAttribute('data-chip-container', 'true');

//     // Create the actual chip with its styling and data
//     const chip = document.createElement('span');
//     const colorClassName = getColorClassName(brokerMetadata.color);
//     chip.className = cn(CHIP_BASE_CLASS, colorClassName);
//     chip.setAttribute('data-chip', 'true');
//     chip.setAttribute('data-chip-id', brokerMetadata.id);
//     chip.setAttribute('data-chip-matrxRecordId', brokerMetadata.matrxRecordId);
//     chip.setAttribute('data-chip-name', brokerMetadata.name);
//     chip.setAttribute('data-chip-defaultValue', brokerMetadata.defaultValue);
//     chip.setAttribute('data-chip-color', brokerMetadata.color);
//     chip.setAttribute('data-chip-status', brokerMetadata.status);
//     chip.setAttribute('data-chip-defaultComponent', brokerMetadata.defaultComponent);
//     chip.setAttribute('data-chip-dataType', brokerMetadata.defaultComponent);
//     chip.setAttribute('data-chip-label', brokerMetadata.name);
//     chip.setAttribute('data-chip-original-content', brokerMetadata.defaultComponent);
//     chip.setAttribute('data-broker-id', brokerMetadata.matrxRecordId);
//     chip.textContent = brokerMetadata.name;

//     // Attach event handlers to the container
//     if (onDragStart) chipContainer.addEventListener('dragstart', onDragStart);
//     if (onDragEnd) chipContainer.addEventListener('dragend', onDragEnd);
//     if (onClick) chipContainer.addEventListener('click', onClick);
//     if (onDoubleClick) chipContainer.addEventListener('dblclick', onDoubleClick);
//     if (onMouseEnter) chipContainer.addEventListener('mouseenter', onMouseEnter);
//     if (onMouseLeave) chipContainer.addEventListener('mouseleave', onMouseLeave);
//     if (onContextMenu) chipContainer.addEventListener('contextmenu', onContextMenu);

//     // Assemble the structure with spaces
//     chipContainer.appendChild(document.createTextNode('\u00A0\u00A0')); // Two spaces before
//     chipContainer.appendChild(chip);
//     chipContainer.appendChild(document.createTextNode('\u00A0\u00A0')); // Two spaces after

//     return chipContainer;
// };

// export function createCompleteChipStructure(
//     brokerMetadata: BrokerMetaData,
//     dragConfig,
//     chipHandlers: {
//         onDragStart?: (event: DragEvent) => void;
//         onDragEnd?: (event: DragEvent) => void;
//         onClick?: (event: MouseEvent) => void;
//         onDoubleClick?: (event: MouseEvent) => void;
//         onMouseEnter?: (event: MouseEvent) => void;
//         onMouseLeave?: (event: MouseEvent) => void;
//     } = {}
// ) {
//     // Create wrapper
//     console.log('--Creating chip structure:', brokerMetadata);
//     const chipWrapper = document.createElement('span');
//     chipWrapper.setAttribute('data-chip-wrapper', 'true');

//     // Create chip with drag handlers and optional additional handlers
//     const chip = createChipElement(brokerMetadata, { ...dragConfig, ...chipHandlers });

//     // Create unique identifier for this structure
//     const structureId = `chip-structure-${brokerMetadata.matrxRecordId}`;

//     // Create spacing node wrappers
//     const leadingSpaceWrapper = document.createElement('span');
//     const trailingSpaceWrapper = document.createElement('span');

//     // Add identifying attributes
//     leadingSpaceWrapper.setAttribute('data-chip-space', 'true');
//     leadingSpaceWrapper.setAttribute('data-space-type', 'leading');
//     leadingSpaceWrapper.setAttribute('data-structure-id', structureId);

//     trailingSpaceWrapper.setAttribute('data-chip-space', 'true');
//     trailingSpaceWrapper.setAttribute('data-space-type', 'trailing');
//     trailingSpaceWrapper.setAttribute('data-structure-id', structureId);

//     // Create anchor wrapper
//     const anchorWrapper = document.createElement('span');
//     anchorWrapper.setAttribute('data-chip-anchor', 'true');
//     anchorWrapper.setAttribute('data-structure-id', structureId);

//     // Create and append the actual nodes
//     leadingSpaceWrapper.appendChild(document.createTextNode('\u00A0'));
//     trailingSpaceWrapper.appendChild(document.createTextNode('\u00A0'));
//     anchorWrapper.appendChild(document.createTextNode('\u200B'));

//     // Assemble the structure
//     const insertionWrapper = document.createElement('span');
//     insertionWrapper.setAttribute('data-chip-container', 'true');
//     insertionWrapper.setAttribute('data-structure-id', structureId);

//     insertionWrapper.appendChild(leadingSpaceWrapper);
//     insertionWrapper.appendChild(chipWrapper);
//     chipWrapper.appendChild(chip);
//     insertionWrapper.appendChild(trailingSpaceWrapper);
//     insertionWrapper.appendChild(anchorWrapper);

//     return {
//         insertionWrapper,
//         chipWrapper,
//         chip,
//         anchorNode: anchorWrapper.firstChild as Text,
//     };
// }


// export const createFragmentChipStructureXXXXX = (
//     brokerMetadata: BrokerMetaData,
//     { onDragStart, onDragEnd }
// ): { elements: HTMLSpanElement[], cursorTargetId: string } => {
//     const cursorTargetId = `cursor-target-${Math.random().toString(36).substr(2, 9)}`;
    
//     const beforeBuffer = document.createElement('span');
//     beforeBuffer.appendChild(document.createTextNode('\u200B'));
    
//     const chip = createChipElement(brokerMetadata, { onDragStart, onDragEnd });
    
//     const afterBuffer = document.createElement('span');
//     afterBuffer.setAttribute('data-cursor-target', cursorTargetId);
//     afterBuffer.appendChild(document.createTextNode('\u200B'));

//     return { 
//         elements: [beforeBuffer, chip, afterBuffer],
//         cursorTargetId 
//     };
// };


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



// export const createChipWithStructure = (
//     brokerMetadata: BrokerMetaData,
//     { onDragStart, onDragEnd }
// ): { beforeBuffer: HTMLSpanElement; chip: HTMLSpanElement; afterBuffer: HTMLSpanElement } => {
//     // Create our chip with its spaces and styling
//     const chip = createChipElement(brokerMetadata, { onDragStart, onDragEnd });

//     // Create independent buffer spans
//     const beforeBuffer = document.createElement('span');
//     beforeBuffer.appendChild(document.createTextNode('\u200B'));

//     const afterBuffer = document.createElement('span');
//     afterBuffer.appendChild(document.createTextNode('\u200B'));

//     return {
//         beforeBuffer,
//         chip,
//         afterBuffer,
//     };
// };





// export const createChipElementWorking = (brokerMetadata: BrokerMetaData ): HTMLSpanElement => {
//     const chip = document.createElement('span');
//     const colorClassName = getColorClassName(brokerMetadata.color);
//     chip.contentEditable = 'false';
//     chip.className = cn(CHIP_BASE_CLASS, colorClassName);
//     chip.setAttribute('data-chip', 'true');
//     chip.setAttribute('data-chip-id', brokerMetadata.matrxRecordId);
//     chip.setAttribute('data-chip-label', brokerMetadata.name);
//     chip.setAttribute('data-chip-original-content', brokerMetadata.defaultValue);
//     chip.setAttribute('data-broker-id', brokerMetadata.matrxRecordId);
//     chip.setAttribute('draggable', 'true');
//     chip.textContent = brokerMetadata.name;
//     return chip;
// };

// export const createChipElements = (
//     brokerMetadata: BrokerMetaData,
//     debugMode: boolean,
//     eventHandlers: {
//         onDragStart: (e: DragEvent) => void;
//         onDragEnd: (e: DragEvent) => void;
//     }
// ) => {
//     const chipWrapper = document.createElement('span');
//     chipWrapper.className = debugMode ? `chip-wrapper border border-${brokerMetadata.color}-500` : 'chip-wrapper';

//     const chip = createChipElementWorking(brokerMetadata);
//     chip.addEventListener('dragstart', eventHandlers.onDragStart);
//     chip.addEventListener('dragend', eventHandlers.onDragEnd);

//     const leadingSpace = document.createTextNode('\u00A0');
//     const trailingSpace = document.createTextNode('\u00A0');
//     const anchorNode = document.createTextNode('\u200B');

//     const insertionWrapper = document.createElement('span');
//     insertionWrapper.appendChild(leadingSpace);
//     insertionWrapper.appendChild(chipWrapper);
//     chipWrapper.appendChild(chip);
//     insertionWrapper.appendChild(trailingSpace);
//     insertionWrapper.appendChild(anchorNode);

//     return {
//         insertionWrapper,
//         anchorNode,
//     };
// };

export const getSelectedTextFromSnapshot = (
    snapshot: DOMSnapshot
): { text: string; range: Range } => {
    const range = document.createRange();
    range.setStart(snapshot.range.startContainer, snapshot.range.startOffset);
    range.setEnd(snapshot.range.endContainer, snapshot.range.endOffset);
    
    return {
        text: range.toString().trim(),
        range
    };
};
