// utils.ts
import { ChipData, TextStyle } from './types';

export const generateChipData = (): ChipData => ({
    id: `chip-${Date.now()}`,
    name: `Chip ${Math.floor(Math.random() * 1000)}`
});

export const normalizeEditorContent = (editor: HTMLDivElement) => {
    const walker = document.createTreeWalker(editor, NodeFilter.SHOW_TEXT, null);
    let node;
    while ((node = walker.nextNode())) {
        if (node.parentNode === editor) {
            const span = document.createElement('span');
            node.parentNode.insertBefore(span, node);
            span.appendChild(node);
        }
    }
};

export const createChipElement = (chipData: ChipData): HTMLSpanElement => {
    const chipWrapper = document.createElement('span');
    chipWrapper.className = 'chip-wrapper';
    
    const chip = document.createElement('span');
    chip.contentEditable = 'false';
    chip.className = 'inline-flex items-center px-2 py-1 mx-1 bg-blue-100 dark:bg-blue-800 text-blue-800 dark:text-blue-100 rounded-md cursor-pointer hover:bg-blue-200 dark:hover:bg-blue-700 transition-colors duration-200';
    chip.setAttribute('data-chip', 'true');
    chip.setAttribute('data-chip-id', chipData.id);
    chip.textContent = chipData.name;
    
    const trailingSpace = document.createTextNode('\u00A0');
    
    chipWrapper.appendChild(chip);
    chipWrapper.appendChild(trailingSpace);
    
    return chipWrapper;
};

export const insertNodeAtSelection = (node: Node): void => {
    const selection = window.getSelection();
    if (!selection) return;
    
    const range = selection.getRangeAt(0);
    range.insertNode(node);
    
    // Move cursor after the inserted node
    const newRange = document.createRange();
    newRange.setStartAfter(node);
    newRange.setEndAfter(node);
    selection.removeAllRanges();
    selection.addRange(newRange);
};

export const applyTextStyle = (style: TextStyle): void => {
    document.execCommand(style.command, false, style.value || null);
};

export const getFormattedContent = (editor: HTMLDivElement): string => {
    const clone = editor.cloneNode(true) as HTMLDivElement;
    const chips = clone.querySelectorAll('[data-chip="true"]');
    
    chips.forEach(chip => {
        const chipName = chip.textContent;
        chip.replaceWith(`{${chipName}}!`);
    });
    
    return clone.textContent || '';
};

