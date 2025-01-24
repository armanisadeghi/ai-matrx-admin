import { cn } from '@/utils';
import { getColorClassName } from './colorUitls';
import { CHIP_BASE_CLASS } from '../constants';
import { BrokerMetaData } from '../types/editor.types';
import { ChipMenuContextValue } from '../components/ChipContextMenu';

export interface ChipHandlers {
    onDragStart?: (event: MouseEvent) => void;
    onDragEnd?: (event: MouseEvent) => void;
    onClick?: (event: MouseEvent) => void;
    onDoubleClick?: (event: MouseEvent) => void;
    onMouseEnter?: (event: MouseEvent) => void;
    onMouseLeave?: (event: MouseEvent) => void;
    onContextMenu?: (event: MouseEvent) => void;
    onNewChip?: (brokerMetadata: BrokerMetaData) => void;

}

type ChipHandlerOptions = {
    showMenu: ChipMenuContextValue['showMenu'];
    editorId: string;
    handlers?: ChipHandlers;
};

export const createChipHandlers = ({ handlers }: ChipHandlerOptions): ChipHandlers => {
    // Simply pass through the handlers as they are
    return {
        onDragStart: handlers?.onDragStart,
        onDragEnd: handlers?.onDragEnd,
        onClick: handlers?.onClick,
        onDoubleClick: handlers?.onDoubleClick,
        onMouseEnter: handlers?.onMouseEnter,
        onMouseLeave: handlers?.onMouseLeave,
        onContextMenu: handlers?.onContextMenu,
        onNewChip: handlers?.onNewChip
    };
};


export const createChipStructure = (
    brokerMetadata: BrokerMetaData,
    setDraggedChip: (chip: HTMLElement | null) => void,
    handlers: Partial<{
        onClick?: (event: MouseEvent) => void;
        onDoubleClick?: (event: MouseEvent) => void;
        onMouseEnter?: (event: MouseEvent) => void;
        onMouseLeave?: (event: MouseEvent) => void;
        onContextMenu?: (event: MouseEvent) => void;
    }> = {}
) => {
    const structureId = `chip-structure-${brokerMetadata.matrxRecordId}`;

    // DOM Structure (indentation shows hierarchy):
    // insertionWrapper
    //   leadingSpaceWrapper
    //     \u00A0
    //   chipWrapper
    //     chipContainer
    //       \u00A0\u00A0
    //       chip
    //       \u00A0\u00A0
    //   trailingSpaceWrapper
    //     \u00A0
    //   anchorWrapper
    //     \u200B

    // Level 1: Root insertion wrapper
    const insertionWrapper = document.createElement('span');
    insertionWrapper.setAttribute('data-chip-container', 'true');
    insertionWrapper.setAttribute('data-structure-id', structureId);

    // Level 2a: Leading space wrapper
    const leadingSpaceWrapper = document.createElement('span');
    leadingSpaceWrapper.setAttribute('data-chip-space', 'true');
    leadingSpaceWrapper.setAttribute('data-space-type', 'leading');
    leadingSpaceWrapper.setAttribute('data-structure-id', structureId);
    leadingSpaceWrapper.appendChild(document.createTextNode('\u00A0'));
    insertionWrapper.appendChild(leadingSpaceWrapper);

    // Level 2b: Chip wrapper
    const chipWrapper = document.createElement('span');
    chipWrapper.setAttribute('data-chip-wrapper', 'true');
    insertionWrapper.appendChild(chipWrapper);

    // Level 3: Chip container (draggable element)
    const chipContainer = document.createElement('span');
    chipContainer.contentEditable = 'false';
    chipContainer.setAttribute('draggable', 'true');
    chipContainer.setAttribute('data-chip-container', 'true');
    chipWrapper.appendChild(chipContainer);

    // Add leading spaces to container
    chipContainer.appendChild(document.createTextNode('\u00A0\u00A0'));

    // Level 4: The chip itself
    const chip = document.createElement('span');
    const colorClassName = getColorClassName(brokerMetadata.color);
    chip.className = cn(CHIP_BASE_CLASS, colorClassName);
    chip.setAttribute('data-chip', 'true');
    chip.setAttribute('data-chip-id', brokerMetadata.id);
    chip.setAttribute('data-chip-matrxRecordId', brokerMetadata.matrxRecordId);
    chip.setAttribute('data-chip-name', brokerMetadata.name);
    chip.setAttribute('data-chip-defaultValue', brokerMetadata.defaultValue);
    chip.setAttribute('data-chip-color', brokerMetadata.color);
    chip.setAttribute('data-chip-status', brokerMetadata.status);
    chip.setAttribute('data-chip-defaultComponent', brokerMetadata.defaultComponent);
    chip.setAttribute('data-chip-dataType', brokerMetadata.defaultComponent);
    chip.setAttribute('data-chip-label', brokerMetadata.name);
    chip.setAttribute('data-chip-original-content', brokerMetadata.defaultComponent);
    chip.setAttribute('data-broker-id', brokerMetadata.matrxRecordId);
    chip.textContent = brokerMetadata.name;
    chipContainer.appendChild(chip);

    // Add trailing spaces to container
    chipContainer.appendChild(document.createTextNode('\u00A0\u00A0'));

    // Add drag handlers to container
    chipContainer.addEventListener('dragstart', (e: DragEvent) => {
        const chip = e.target as HTMLElement;
        setDraggedChip(chip);
        
        const minWidth = Math.max(
            chip.getBoundingClientRect().width,
            100
        );
        chip.style.minWidth = `${minWidth}px`;
        
        // Create a more visible ghost image
        const ghostText = chip.textContent || 'Untitled';
        e.dataTransfer?.setData('text/plain', ghostText);
        e.dataTransfer?.setDragImage(chip, 0, 0);
        
        chip.classList.add('opacity-25');
        e.stopPropagation();
    });

    chipContainer.addEventListener('dragend', (e: DragEvent) => {
        const chip = e.target as HTMLElement;
        chip.classList.remove('opacity-25');
        setDraggedChip(null);
    });

    // Add other handlers to container
    if (handlers.onClick) chipContainer.addEventListener('click', handlers.onClick);
    if (handlers.onDoubleClick) chipContainer.addEventListener('dblclick', handlers.onDoubleClick);
    if (handlers.onMouseEnter) chipContainer.addEventListener('mouseenter', handlers.onMouseEnter);
    if (handlers.onMouseLeave) chipContainer.addEventListener('mouseleave', handlers.onMouseLeave);
    if (handlers.onContextMenu) chipContainer.addEventListener('contextmenu', handlers.onContextMenu);

    // Level 2c: Trailing space wrapper
    const trailingSpaceWrapper = document.createElement('span');
    trailingSpaceWrapper.setAttribute('data-chip-space', 'true');
    trailingSpaceWrapper.setAttribute('data-space-type', 'trailing');
    trailingSpaceWrapper.setAttribute('data-structure-id', structureId);
    trailingSpaceWrapper.appendChild(document.createTextNode('\u00A0'));
    insertionWrapper.appendChild(trailingSpaceWrapper);

    // Level 2d: Anchor wrapper
    const anchorWrapper = document.createElement('span');
    anchorWrapper.setAttribute('data-chip-anchor', 'true');
    anchorWrapper.setAttribute('data-structure-id', structureId);
    anchorWrapper.appendChild(document.createTextNode('\u200B'));
    insertionWrapper.appendChild(anchorWrapper);

    return {
        insertionWrapper,
        chipWrapper,
        chip,
        anchorNode: anchorWrapper.firstChild as Text,
    };
};