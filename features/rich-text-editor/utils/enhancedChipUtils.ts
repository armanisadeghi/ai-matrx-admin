import { cn } from '@/utils';
import { COLOR_STYLES, getColorClassesForMode, MODE_CLASSES, TAILWIND_COLORS, TailwindColor } from '../constants';
import { BrokerMetaData, ContentMode } from '../types/editor.types';
import { ChipMenuContextValue } from '../components/ChipContextMenu';
import { encodeMatrxMetadata, parseMatrxMetadata } from './patternUtils';

const getDisplayContent = (brokerMetadata: BrokerMetaData, mode: ContentMode): string => {
    switch (mode) {
        case 'encodeChips':
        case 'name':
            return brokerMetadata.name;
        case 'defaultValue':
            return brokerMetadata.defaultValue;
        case 'recordKey':
            return brokerMetadata.matrxRecordId;
        case 'encodeVisible':
            return encodeMatrxMetadata(brokerMetadata);
        default:
            return brokerMetadata.name;
    }
};

const addEditableHandlers = (chip: HTMLElement, mode: ContentMode) => {
    chip.addEventListener('input', (e: InputEvent) => {
        const content = chip.textContent || '';
        if (content.trim() === '') {
            chip.classList.add('opacity-25');
        } else {
            chip.classList.remove('opacity-25');
            chip.setAttribute(mode === 'name' ? 'data-chip-name' : 'data-chip-defaultValue', content);
        }
    });

    chip.addEventListener('keydown', (e: KeyboardEvent) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            chip.blur();
        }
    });
};

const addDragHandlers = (container: HTMLElement, setDraggedChip: (chip: HTMLElement | null) => void) => {
    container.addEventListener('dragstart', (e: DragEvent) => {
        const chip = e.target as HTMLElement;
        setDraggedChip(chip);

        const minWidth = Math.max(chip.getBoundingClientRect().width, 100);
        chip.style.minWidth = `${minWidth}px`;

        const ghostText = chip.textContent || 'Untitled';
        e.dataTransfer?.setData('text/plain', ghostText);
        e.dataTransfer?.setDragImage(chip, 0, 0);

        chip.classList.add('opacity-25');
        e.stopPropagation();
    });

    container.addEventListener('dragend', (e: DragEvent) => {
        const chip = e.target as HTMLElement;
        chip.classList.remove('opacity-25');
        setDraggedChip(null);
    });
};

export interface ChipHandlers {
    onDragStart?: (event: MouseEvent) => void;
    onDragEnd?: (event: MouseEvent) => void;
    onClick?: (event: MouseEvent) => void;
    onDoubleClick?: (event: MouseEvent, metadata: BrokerMetaData) => void;
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

const EVENT_MAPPINGS = {
    click: 'onClick',
    openChipDialog: 'onDoubleClick',
    mouseenter: 'onMouseEnter',
    mouseleave: 'onMouseLeave',
    contextmenu: 'onContextMenu',
    dragstart: 'onDragStart',
    dragend: 'onDragEnd',
} as const;

export function createChipHandlers({ handlers = {} }: ChipHandlerOptions): ChipHandlers {
    return {
        ...handlers,
        onNewChip: handlers.onNewChip,
    };
}

export function attachEventHandlers(chipContainer: HTMLSpanElement, handlers: Partial<ChipHandlers>): () => void {
    const attachedHandlers = new Map<string, (event: Event) => void>();

    Object.entries(EVENT_MAPPINGS).forEach(([eventName, handlerName]) => {
        const handler = handlers[handlerName as keyof ChipHandlers];
        if (handler) {
            const wrappedHandler = (event: Event) => {
                if (handlerName === 'onDoubleClick') {
                    const chip = (event.target as HTMLElement).closest('[data-chip="true"]');
                    if (chip) {
                        const metadata = extractBrokerMetadata(chip as HTMLElement);
                        (handler as (e: MouseEvent, m: BrokerMetaData) => void)(event as MouseEvent, metadata);
                    }
                } else {
                    (handler as EventListener)(event);
                }
            };
            
            chipContainer.addEventListener(eventName, wrappedHandler);
            attachedHandlers.set(eventName, wrappedHandler);
        }
    });

    return () => {
        attachedHandlers.forEach((handler, eventName) => {
            chipContainer.removeEventListener(eventName, handler);
        });
        attachedHandlers.clear();
    };
}

export const createEnhancedChipStructure = (
    brokerMetadata: BrokerMetaData,
    setDraggedChip: (chip: HTMLElement | null) => void,
    handlers: Partial<ChipHandlers> = {},
    mode: ContentMode = 'encodeChips'
) => {
    const structureId = `chip-structure-${brokerMetadata.matrxRecordId}`;

    // Create base structure
    const insertionWrapper = document.createElement('span');
    insertionWrapper.setAttribute('data-chip-container', 'true');
    insertionWrapper.setAttribute('data-structure-id', structureId);
    insertionWrapper.setAttribute('data-display-mode', mode);

    // Leading space wrapper
    const leadingSpaceWrapper = document.createElement('span');
    leadingSpaceWrapper.setAttribute('data-chip-space', 'true');
    leadingSpaceWrapper.setAttribute('data-space-type', 'leading');
    leadingSpaceWrapper.setAttribute('data-structure-id', structureId);
    leadingSpaceWrapper.appendChild(document.createTextNode('\u00A0'));
    insertionWrapper.appendChild(leadingSpaceWrapper);

    // Chip wrapper
    const chipWrapper = document.createElement('span');
    chipWrapper.setAttribute('data-chip-wrapper', 'true');
    insertionWrapper.appendChild(chipWrapper);

    // Chip container
    const chipContainer = document.createElement('span');
    chipContainer.setAttribute('data-chip-container', 'true');

    // Only make draggable in chip mode
    if (mode === 'encodeChips') {
        chipContainer.setAttribute('draggable', 'true');
        chipContainer.classList.add('cursor-move');
    }

    chipContainer.contentEditable = mode === 'name' || mode === 'defaultValue' ? 'true' : 'false';
    chipWrapper.appendChild(chipContainer);

    // Add leading spaces to container
    chipContainer.appendChild(document.createTextNode('\u00A0\u00A0'));

    // The chip itself
    const chip = document.createElement('span');
    const colorClasses = getColorClassesForMode(brokerMetadata.color as TailwindColor, mode);
    const modeClasses = MODE_CLASSES[mode];
    chip.className = cn(modeClasses, colorClasses);

    const encodedString = encodeMatrxMetadata(brokerMetadata);

    // Set all data attributes
    const dataAttributes = {
        'data-chip': 'true',
        'data-chip-encoding': encodedString,
        'data-chip-id': brokerMetadata.id,
        'data-chip-matrxRecordId': brokerMetadata.matrxRecordId,
        'data-chip-name': brokerMetadata.name,
        'data-chip-defaultValue': brokerMetadata.defaultValue,
        'data-chip-color': brokerMetadata.color,
        'data-chip-status': brokerMetadata.status,
        'data-chip-defaultComponent': brokerMetadata.defaultComponent,
        'data-chip-dataType': brokerMetadata.defaultComponent,
        'data-chip-label': brokerMetadata.name,
        'data-chip-original-content': brokerMetadata.defaultComponent,
        'data-broker-id': brokerMetadata.matrxRecordId,
        'data-display-mode': mode,
    };

    Object.entries(dataAttributes).forEach(([key, value]) => {
        chip.setAttribute(key, value);
    });

    // Set content based on mode
    chip.textContent = getDisplayContent(brokerMetadata, mode);
    chipContainer.appendChild(chip);

    // Add trailing spaces to container
    chipContainer.appendChild(document.createTextNode('\u00A0\u00A0'));

    // Add event handlers based on mode
    configureChipMode(chip, chipContainer, brokerMetadata, mode);

    // Add event handlers
    if (mode === 'encodeChips') {
        addDragHandlers(chipContainer, setDraggedChip);
    }

    if (mode === 'name' || mode === 'defaultValue') {
        addEditableHandlers(chip, mode);
    }

    // Add other handlers to container
    if (handlers.onClick) chipContainer.addEventListener('click', handlers.onClick);
    if (handlers.onDoubleClick) chipContainer.addEventListener('openChipDialog', (event: MouseEvent) => handlers.onDoubleClick!(event, brokerMetadata));
    if (handlers.onMouseEnter) chipContainer.addEventListener('mouseenter', handlers.onMouseEnter);
    if (handlers.onMouseLeave) chipContainer.addEventListener('mouseleave', handlers.onMouseLeave);

    // Add trailing space and anchor wrappers
    const trailingSpaceWrapper = document.createElement('span');
    trailingSpaceWrapper.setAttribute('data-chip-space', 'true');
    trailingSpaceWrapper.setAttribute('data-space-type', 'trailing');
    trailingSpaceWrapper.setAttribute('data-structure-id', structureId);
    trailingSpaceWrapper.appendChild(document.createTextNode('\u00A0'));
    insertionWrapper.appendChild(trailingSpaceWrapper);

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
        // chipCleanup,
    };
};

// Create a WeakMap to store observers for each chip element
const chipObservers = new WeakMap<HTMLElement, MutationObserver>();

const configureChipMode = (chip: HTMLElement, container: HTMLElement, brokerMetadata: BrokerMetaData, mode: ContentMode) => {
    // Clean up any existing observer
    const existingObserver = chipObservers.get(chip);
    if (existingObserver) {
        existingObserver.disconnect();
        chipObservers.delete(chip);
    }

    // Update display mode attributes
    chip.setAttribute('data-display-mode', mode);
    container.setAttribute('data-display-mode', mode);

    // Initial color setup
    updateChipColorClasses(chip, mode);

    // Create a mutation observer to watch for color changes
    const colorObserver = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.attributeName === 'data-chip-color') {
                updateChipColorClasses(chip, mode);
            }
        });
    });

    colorObserver.observe(chip, { 
        attributes: true,
        attributeFilter: ['data-chip-color'] 
    });

    // Store observer reference
    chipObservers.set(chip, colorObserver);

    // Update content
    chip.textContent = getDisplayContent(brokerMetadata, mode);

    // Configure editability and draggability
    configureInteractivity(container, mode);
};



const updateChipColorClasses = (chip: HTMLElement, mode: ContentMode) => {
    const color = chip.getAttribute('data-chip-color') as TailwindColor;
    if (!color) return;

    const modeClasses = MODE_CLASSES[mode];
    const colorClasses = getColorClassesForMode(color, mode);

    // Remove all existing color-related classes
    const classesToRemove = TAILWIND_COLORS.flatMap((c) => [
        `bg-${c}-300`,
        `dark:bg-${c}-800`,
        `text-${c}-900`,
        `dark:text-${c}-100`,
        `hover:bg-${c}-400`,
        `dark:hover:bg-${c}-700`,
        `border-${c}-200`,
        `border-${c}-300`,
        `border-${c}-700`,
        `border-${c}-800`,
    ]);

    chip.classList.remove(...classesToRemove);

    // Add new classes
    chip.className = cn(
        modeClasses,
        colorClasses,
        // Preserve non-color related utility classes
        chip.className
            .split(' ')
            .filter((cls) => !classesToRemove.includes(cls) && !MODE_CLASSES[mode].split(' ').includes(cls))
            .join(' ')
    );
};

const configureInteractivity = (container: HTMLElement, mode: ContentMode) => {
    if (mode === 'name' || mode === 'defaultValue' || mode === 'encodeVisible') {
        container.contentEditable = 'true';
        container.removeAttribute('draggable');
        container.classList.remove('cursor-move');
    } else if (mode === 'encodeChips') {
        container.contentEditable = 'false';
        container.setAttribute('draggable', 'true');
        container.classList.add('cursor-move');
    } else {
        container.contentEditable = 'false';
        container.removeAttribute('draggable');
        container.classList.remove('cursor-move');
    }
};

export function updateChipMode(chipElement: HTMLElement, mode: ContentMode) {
    const brokerMetadata = extractBrokerMetadata(chipElement);
    const container = chipElement.closest('[data-chip-container]') as HTMLElement;
    if (!container) return;

    configureChipMode(chipElement, container, brokerMetadata, mode);
}

function extractBrokerMetadata(chipElement: HTMLElement): BrokerMetaData {
    return {
        id: chipElement.getAttribute('data-chip-id') || '',
        matrxRecordId: chipElement.getAttribute('data-chip-matrxRecordId') || '',
        name: chipElement.getAttribute('data-chip-name') || '',
        defaultValue: chipElement.getAttribute('data-chip-defaultValue') || '',
        color: chipElement.getAttribute('data-chip-color') || '',
        status: chipElement.getAttribute('data-chip-status') || '',
        defaultComponent: chipElement.getAttribute('data-chip-defaultComponent') || '',
    };
}

export interface ChipUpdateEvent extends CustomEvent {
    detail: {
        previousMetadata: BrokerMetaData;
        currentMetadata: BrokerMetaData;
        mode?: ContentMode;
    };
}

export function updateChipMetadata(
    recordId: string,
    updates: Partial<{
        name: string;
        label: string;
        defaultValue: string;
        stringValue: string;
        color: string;
        status: string;
        defaultComponent: string;
        dataType: string;
        id: string;
    }>,
    editorId?: string
) {
    const chips = editorId
        ? document.getElementById(editorId)?.querySelectorAll(`[data-chip-matrxrecordid="${recordId}"]`)
        : document.querySelectorAll(`[data-chip-matrxrecordid="${recordId}"]`);

    if (!chips?.length) {
        console.error(`No chips found with record ID ${recordId}`);
        return null;
    }

    const results = Array.from(chips).map((chipElement) => {
        if (!(chipElement instanceof HTMLElement)) return null;

        // Update only the specific attributes that changed
        if (updates.name || updates.label) {
            const newName = updates.name || updates.label;
            chipElement.setAttribute('data-chip-name', newName);
            chipElement.setAttribute('data-chip-label', newName);
            chipElement.textContent = newName;
        }
        if (updates.defaultValue || updates.stringValue) {
            const newValue = updates.defaultValue || updates.stringValue;
            chipElement.setAttribute('data-chip-defaultValue', newValue);
        }
        if (updates.color) {
            const prevColor = chipElement.getAttribute('data-chip-color');
            chipElement.setAttribute('data-chip-color', updates.color);
            const currentMode = chipElement.getAttribute('data-display-mode') as ContentMode;
            updateChipColorClasses(chipElement, currentMode);
        }

        if (updates.status) {
            chipElement.setAttribute('data-chip-status', updates.status);
        }
        if (updates.defaultComponent) {
            chipElement.setAttribute('data-chip-defaultComponent', updates.defaultComponent);
            chipElement.setAttribute('data-chip-original-content', updates.defaultComponent);
        }
        if (updates.dataType) {
            chipElement.setAttribute('data-chip-dataType', updates.dataType);
        }
        if (updates.id) {
            chipElement.setAttribute('data-chip-id', updates.id);
        }

        // Update the encoding after the specific changes
        const updatedMetadata = extractBrokerMetadata(chipElement);
        const encodedString = encodeMatrxMetadata(updatedMetadata);
        chipElement.setAttribute('data-chip-encoding', encodedString);

        return {
            encoding: encodedString,
            metadata: updatedMetadata,
        };
    });

    return results.filter(Boolean);
}
