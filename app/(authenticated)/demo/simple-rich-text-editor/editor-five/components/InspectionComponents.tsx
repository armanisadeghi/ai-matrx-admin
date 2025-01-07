import React, { forwardRef, useState, useEffect } from 'react';
import { Copy } from 'lucide-react';
import { inspectEditorHTML } from '../utils/debugUtils';
import { formatHTML } from '../utils/htmlFormatter';

export const cleanHTML = (html: string) => {
    // Remove chip-related classes and data attributes
    return html
        .replace(/class="[^"]*"/g, '')
        .replace(/data-[^=]*="[^"]*"/g, '')
        .replace(/contenteditable="[^"]*"/g, '')
        .replace(/draggable="[^"]*"/g, '')
        .trim();
};

export const structureHTML = (html: string) => {
    // First clean up excessive spaces in tags
    let cleanedHtml = html.replace(/<(\/?)(\w+)\s+>/g, '<$1$2>');

    // Split into lines and prepare for processing
    const lines = cleanedHtml.split(/(<\/?(?:div|span)[^>]*>)/);
    let indentLevel = 0;
    let result = [];

    for (let line of lines) {
        line = line.trim();
        if (!line) continue;

        // Handle closing tags
        if (line.match(/<\//)) {
            indentLevel = Math.max(0, indentLevel - 1);
            if (line) result.push('  '.repeat(indentLevel) + line);
            continue;
        }

        // Handle opening tags
        if (line.match(/<(?!\/)(?:div|span)/)) {
            if (line) result.push('  '.repeat(indentLevel) + line);
            indentLevel++;
            continue;
        }

        // Handle content
        if (line) {
            // Clean up multiple spaces and normalize &nbsp;
            line = line.replace(/\s+/g, ' ').replace(/(&nbsp;)+/g, ' ');
            result.push('  '.repeat(indentLevel) + line);
        }
    }

    return result.join('\n');
};

export const InspectHtmlUtil = forwardRef<HTMLDivElement, { editorId: string }>(({ editorId }, ref) => {
    const [viewMode, setViewMode] = useState<'original' | 'cleaned' | 'structured' | 'formatted'>('original');
    const [html, setHtml] = useState({
        original: '',
        cleaned: '',
        structured: '',
        formatted: '',
    });
    const [copyStatus, setCopyStatus] = useState('Copy');

    const updateHTML = () => {
        if (!ref || !('current' in ref) || !ref.current) return;
        const originalHtml = ref.current.innerHTML;
        const cleanedHtml = cleanHTML(originalHtml);
        const structuredHtml = structureHTML(cleanedHtml);
        const formattedHtml = formatHTML(cleanedHtml, {
            indentSize: 4,
            showLineNumbers: true,
            showNodeTypes: true,
            highlightChips: true,
        });

        setHtml({
            original: originalHtml,
            cleaned: cleanedHtml,
            structured: structuredHtml,
            formatted: formattedHtml,
        });
    };

    useEffect(() => {
        updateHTML();
        const interval = setInterval(updateHTML, 500);
        return () => clearInterval(interval);
    }, [ref]);

    const handleCopy = async () => {
        const textToCopy = html[viewMode];

        try {
            await navigator.clipboard.writeText(textToCopy);
            setCopyStatus('Copied!');
            setTimeout(() => setCopyStatus('Copy'), 2000);
        } catch (err) {
            setCopyStatus('Failed to copy');
            setTimeout(() => setCopyStatus('Copy'), 2000);
        }
    };

    const ViewButton = ({ mode, label }: { mode: typeof viewMode; label: string }) => (
        <button
            className={`px-3 py-1 text-sm rounded-md transition-colors duration-200 ${
                viewMode === mode ? 'bg-blue-500 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
            }`}
            onClick={() => setViewMode(mode)}
        >
            {label}
        </button>
    );

    return (
        <div className='flex flex-col h-full'>
            {/* Header with controls - fixed height */}
            <div className='flex justify-between items-center p-2 border-b border-gray-300 dark:border-gray-700'>
                <label className='block text-sm font-medium text-gray-700 dark:text-gray-300'>HTML Inspector</label>
                <div className='flex space-x-2'>
                    <ViewButton
                        mode='original'
                        label='Original'
                    />
                    <ViewButton
                        mode='cleaned'
                        label='Cleaned'
                    />
                    <ViewButton
                        mode='structured'
                        label='Structured'
                    />
                    <ViewButton
                        mode='formatted'
                        label='Debug View'
                    />
                    <button
                        className='px-3 py-1 text-sm bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors duration-200'
                        onClick={updateHTML}
                    >
                        Refresh
                    </button>
                    <button
                        className='inline-flex items-center px-3 py-1 text-sm bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors duration-200 space-x-1'
                        onClick={handleCopy}
                    >
                        <Copy className='w-4 h-4' />
                        <span>{copyStatus}</span>
                    </button>
                </div>
            </div>

            {/* Textarea container - fills remaining height */}
            <div className='flex-1 min-h-0 p-2'>
                <textarea
                    className='w-full h-full font-mono text-sm border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 p-2'
                    value={html[viewMode]}
                    readOnly
                    style={{
                        fontFamily: viewMode === 'formatted' ? 'Consolas, Monaco, "Courier New", monospace' : 'inherit',
                        whiteSpace: 'pre',
                        resize: 'none',
                    }}
                />
            </div>
        </div>
    );
});

export const DebugStats = forwardRef<HTMLDivElement, { editorId: string }>(({ editorId }, ref) => {
    const [stats, setStats] = useState({
        nestedSpans: 0,
        emptySpans: 0,
        totalSpans: 0,
        chipCount: 0,
        divCount: 0,
        textNodes: 0,
        depth: 0,
    });

    const calculateStats = () => {
        if (!ref || !('current' in ref) || !ref.current) return;

        const editor = ref.current;
        const analysis = inspectEditorHTML(editor);

        // Calculate maximum nesting depth
        const calculateDepth = (element: Element): number => {
            let maxChildDepth = 0;
            for (const child of element.children) {
                maxChildDepth = Math.max(maxChildDepth, calculateDepth(child));
            }
            return 1 + maxChildDepth;
        };

        setStats({
            nestedSpans: analysis.diffSummary.nestedSpans,
            emptySpans: analysis.diffSummary.emptySpans,
            totalSpans: editor.getElementsByTagName('span').length,
            chipCount: editor.querySelectorAll('[data-chip="true"]').length,
            divCount: editor.getElementsByTagName('div').length,
            textNodes: document.evaluate('.//text()', editor, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null).snapshotLength,
            depth: calculateDepth(editor),
        });
    };

    useEffect(() => {
        calculateStats();
        const interval = setInterval(calculateStats, 500);
        return () => clearInterval(interval);
    }, [ref]);

    return (
        <div className='space-y-2'>
            <div className='flex justify-between items-center'>
                <label className='block text-sm font-medium text-gray-700 dark:text-gray-300'>Debug Statistics</label>
                <button
                    className='px-3 py-1 text-sm bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors duration-200'
                    onClick={calculateStats}
                >
                    Refresh
                </button>
            </div>
            <div className='grid grid-cols-2 gap-4 p-4 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800'>
                {Object.entries(stats).map(([key, value]) => (
                    <div
                        key={key}
                        className='flex justify-between items-center'
                    >
                        <span className='text-sm text-gray-600 dark:text-gray-400'>{key.replace(/([A-Z])/g, ' $1').trim()}:</span>
                        <span
                            className={`font-mono ${
                                value > 0 && ['nestedSpans', 'emptySpans'].includes(key) ? 'text-red-500' : 'text-gray-900 dark:text-gray-100'
                            }`}
                        >
                            {value}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
});

InspectHtmlUtil.displayName = 'InspectHtmlUtil';
DebugStats.displayName = 'DebugStats';
