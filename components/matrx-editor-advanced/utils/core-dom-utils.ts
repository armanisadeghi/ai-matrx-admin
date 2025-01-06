// core-dom-utils.ts
import { EditorBroker, TextStyle } from '../types';

export const generateId = () => Math.random().toString(36).substring(2, 11);

export interface DOMNodeCreationResult {
    node: HTMLElement;
    id: string;
}

export const createTextNode = (content: string, id?: string, style?: TextStyle): DOMNodeCreationResult => {
    const span = document.createElement('span');
    span.setAttribute('data-id', id || generateId());
    span.setAttribute('data-type', 'text');

    if (style) {
        if (style.bold) span.style.fontWeight = 'bold';
        if (style.italic) span.style.fontStyle = 'italic';
        if (style.underline) span.style.textDecoration = 'underline';
        if (style.color) span.style.color = style.color;
        if (style.backgroundColor) span.style.backgroundColor = style.backgroundColor;

        // Store style data for state reconstruction
        span.setAttribute('data-style', JSON.stringify(style));
    }

    const textNode = document.createTextNode(content);
    span.appendChild(textNode);

    return {
        node: span,
        id: span.getAttribute('data-id')!,
    };
};

export const createBrokerNode = (broker: EditorBroker): DOMNodeCreationResult => {
    const chipContainer = document.createElement('span');

    // Essential attributes (keep existing ones)
    chipContainer.setAttribute('data-id', broker.id);
    chipContainer.setAttribute('data-type', 'chip');
    chipContainer.setAttribute('data-chip', '');
    chipContainer.setAttribute('data-chip-content', broker.displayName);
    chipContainer.setAttribute('data-original-text', broker.stringValue);
    chipContainer.setAttribute('data-editor-id', broker.editorId);
    chipContainer.setAttribute('data-progress-step', broker.progressStep);
    chipContainer.contentEditable = 'false';

    return {
        node: chipContainer,
        id: broker.id,
    };
};

export const createLineBreakNode = (): DOMNodeCreationResult => {
    const div = document.createElement('div');
    const id = generateId();
    div.setAttribute('data-id', id);
    div.setAttribute('data-type', 'lineBreak');

    return {
        node: div,
        id,
    };
};

export const createCursorNode = (): Text => {
    return document.createTextNode(' '); // Real space
};

// Helper for safely inserting nodes with rollback capability
export interface InsertNodesOptions {
    nodes: HTMLElement[];
    target: HTMLElement;
    position: 'before' | 'after' | 'replaceWith' | 'append';
    rollbackNodes?: HTMLElement[];
}

export const insertNodesWithRollback = ({ nodes, target, position, rollbackNodes }: InsertNodesOptions): boolean => {
    const originalNodes = rollbackNodes || [target.cloneNode(true) as HTMLElement];

    try {
        switch (position) {
            case 'before':
                nodes.forEach((node) => target.parentNode?.insertBefore(node, target));
                break;
            case 'after':
                nodes.reverse().forEach((node) => target.parentNode?.insertBefore(node, target.nextSibling));
                break;
            case 'replaceWith':
                nodes.forEach((node) => target.parentNode?.insertBefore(node, target));
                target.parentNode?.removeChild(target);
                break;
            case 'append':
                nodes.forEach((node) => target.appendChild(node));
                break;
        }
        return true;
    } catch (error) {
        console.error('Error inserting nodes:', error);
        // Rollback
        try {
            nodes.forEach((node) => node.parentNode?.removeChild(node));
            if (position === 'replaceWith') {
                originalNodes.forEach((node) => target.parentNode?.insertBefore(node.cloneNode(true) as HTMLElement, target));
            }
        } catch (rollbackError) {
            console.error('Failed to rollback node insertion:', rollbackError);
        }
        return false;
    }
};
