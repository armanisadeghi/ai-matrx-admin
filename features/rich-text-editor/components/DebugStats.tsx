import { forwardRef, useEffect, useState } from "react";
import { inspectEditorHTML } from "../utils/debugUtils";

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

DebugStats.displayName = 'DebugStats';
