// chipService.ts

import { cn } from "@/utils";
import { ChipData } from "../types";
import { getColorClassName } from "./colorUitls";

export const createChipElements = (
    chipData: ChipData,
    debugMode: boolean,
    eventHandlers: {
        onDragStart: (e: DragEvent) => void;
        onDragEnd: (e: DragEvent) => void;
    }
) => {
    const chipWrapper = document.createElement('span');
    chipWrapper.className = debugMode 
        ? `chip-wrapper border border-${chipData.color}-500` 
        : 'chip-wrapper';

    const chip = createChipElement(chipData);
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
        anchorNode
    };
};



export const createChipElement = (chipData: ChipData): HTMLSpanElement => {
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
