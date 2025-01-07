// debugUtils.ts


export const inspectEditorHTML = (editor: HTMLDivElement) => {
    // Get current HTML
    const currentHTML = editor.innerHTML;
    
    // Create cleaned version by:
    // 1. Remove empty spans
    // 2. Consolidate nested spans
    // 3. Fix malformed structures
    const cleanHTML = currentHTML
        .replace(/<span>\s*<\/span>/g, '') // Remove empty spans
        .replace(/<span><span>/g, '<span>') // Consolidate nested spans
        .replace(/<\/span><\/span>/g, '</span>') // Fix closing tags
        .replace(/(&nbsp;){2,}/g, '&nbsp;') // Consolidate multiple spaces
        .replace(/<div>\s*<br\s*\/?>\s*<\/div>/g, '<div><br /></div>') // Normalize empty lines
        .replace(/<span>(\s*)<\/span>/g, '$1'); // Remove spans around whitespace

    return {
        original: currentHTML,
        cleaned: cleanHTML,
        diffSummary: {
            originalLength: currentHTML.length,
            cleanedLength: cleanHTML.length,
            nestedSpans: (currentHTML.match(/<span><span>/g) || []).length,
            emptySpans: (currentHTML.match(/<span>\s*<\/span>/g) || []).length
        }
    };
};

export const debugEditorState = (editor: HTMLDivElement) => {
    const state = inspectEditorHTML(editor);
    console.log('Editor HTML Analysis:', {
        currentLength: state.original.length,
        cleanedLength: state.cleaned.length,
        nestedSpans: state.diffSummary.nestedSpans,
        emptySpans: state.diffSummary.emptySpans
    });
    return state;
};


export interface DebugSnapshot {
    timestamp: string;
    operation: string;
    html: string;
    selection: {
        start: number;
        end: number;
        collapsed: boolean;
    } | null;
    error?: {
        message: string;
        stack: string;
    };
    context?: Record<string, any>;
}

export class EditorDebugger {
    private snapshots: DebugSnapshot[] = [];
    private editor: HTMLDivElement;
    private onSnapshotUpdate: (snapshots: DebugSnapshot[]) => void;
    
    constructor(editor: HTMLDivElement, onSnapshotUpdate: (snapshots: DebugSnapshot[]) => void) {
        this.editor = editor;
        this.onSnapshotUpdate = onSnapshotUpdate;
    }

    takeSnapshot(operation: string, context?: Record<string, any>) {
        const selection = window.getSelection();
        const range = selection?.getRangeAt(0);
        
        // Create debug markers for the current operation
        this.markOperationPoints(operation);
        
        const snapshot: DebugSnapshot = {
            timestamp: new Date().toISOString(),
            operation,
            html: this.getFormattedHTML(),
            selection: range ? {
                start: this.getNodeOffset(range.startContainer),
                end: this.getNodeOffset(range.endContainer),
                collapsed: range.collapsed
            } : null,
            context
        };
        
        this.snapshots.push(snapshot);
        this.onSnapshotUpdate([...this.snapshots]);
        
        return snapshot;
    }

    logError(error: Error, operation: string, context?: Record<string, any>) {
        const snapshot = this.takeSnapshot(operation, context);
        snapshot.error = {
            message: error.message,
            stack: error.stack || ''
        };
        
        this.onSnapshotUpdate([...this.snapshots]);
        return snapshot;
    }

    private markOperationPoints(operation: string) {
        const selection = window.getSelection();
        if (!selection?.rangeCount) return;
        
        const range = selection.getRangeAt(0);
        
        const startMarker = document.createElement('span');
        startMarker.className = 'debug-marker debug-start';
        startMarker.setAttribute('data-operation', operation);
        startMarker.style.display = 'none';
        
        const endMarker = startMarker.cloneNode() as HTMLSpanElement;
        endMarker.className = 'debug-marker debug-end';
        
        try {
            const rangeClone = range.cloneRange();
            rangeClone.insertNode(startMarker);
            rangeClone.collapse(false);
            rangeClone.insertNode(endMarker);
        } catch (e) {
            console.warn('Failed to insert debug markers:', e);
        }
    }

    private removeDebugMarkers() {
        const markers = this.editor.querySelectorAll('.debug-marker');
        markers.forEach(marker => marker.remove());
    }

    private getFormattedHTML(): string {
        const clone = this.editor.cloneNode(true) as HTMLDivElement;
        
        // Highlight debug markers in the output
        clone.querySelectorAll('.debug-marker').forEach(marker => {
            marker.removeAttribute('style');
            (marker as HTMLElement).style.backgroundColor = 'yellow';
        });
        
        // Add indentation and line breaks
        return this.formatHTML(clone.innerHTML);
    }

    private formatHTML(html: string): string {
        let formatted = '';
        let indent = 0;
        
        html = html.replace(/>([^<]*)</g, '>\n$1<');
        
        const lines = html.split('\n');
        
        lines.forEach(line => {
            line = line.trim();
            if (line.match(/<\/\w/)) indent--;
            formatted += '    '.repeat(indent) + line + '\n';
            if (line.match(/<\w[^>]*[^\/]>$/)) indent++;
        });
        
        return formatted;
    }

    private getNodeOffset(node: Node): number {
        const walker = document.createTreeWalker(
            this.editor,
            NodeFilter.SHOW_ALL,
            null
        );
        
        let offset = 0;
        while (walker.nextNode()) {
            if (walker.currentNode === node) {
                return offset;
            }
            offset++;
        }
        return -1;
    }

    getSnapshots() {
        return this.snapshots;
    }

    clearSnapshots() {
        this.snapshots = [];
        this.onSnapshotUpdate([]);
    }
}

export const wrapWithErrorHandling = (
    operation: string,
    editorDebugger: EditorDebugger,
    fn: (...args: any[]) => any
) => {
    return (...args: any[]) => {
        try {
            editorDebugger.takeSnapshot(`${operation}-start`, { args });
            const result = fn(...args);
            editorDebugger.takeSnapshot(`${operation}-end`);
            return result;
        } catch (error) {
            editorDebugger.logError(error as Error, operation, { args });
            throw error;
        }
    };
};