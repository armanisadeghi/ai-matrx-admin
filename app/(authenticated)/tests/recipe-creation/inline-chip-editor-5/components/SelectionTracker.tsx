import React, { useState, useEffect } from 'react';
import { Switch } from '@/components/ui/switch';

interface SelectionInfo {
  text: string;
  length: number;
  startNode: {
    type: string;
    content: string;
    parentType: string;
  };
  endNode: {
    type: string;
    content: string;
    parentType: string;
  };
  offsets: {
    start: number;
    end: number;
  };
  isSingleNode: boolean;
}

const SelectionTracker = ({ editorRef }) => {
  const [isTracking, setIsTracking] = useState(false);
  const [selection, setSelection] = useState<SelectionInfo | null>(null);

  useEffect(() => {
    let intervalId: NodeJS.Timeout | null = null;

    if (isTracking && editorRef.current) {
      const checkSelection = () => {
        const windowSelection = window.getSelection();
        if (windowSelection && editorRef.current?.contains(windowSelection.anchorNode)) {
          const range = windowSelection.getRangeAt(0);
          const selectedText = windowSelection.toString();
          
          if (selectedText.length === 0) {
            setSelection(null);
            return;
          }

          const getNodeInfo = (node: Node) => ({
            type: node.nodeType === Node.TEXT_NODE ? 'TEXT_NODE' : (node as Element).tagName || 'UNKNOWN',
            content: node.nodeType === Node.TEXT_NODE ? 
              `"${node.textContent?.slice(0, 20)}${node.textContent?.length > 20 ? '...' : ''}"` : 
              'NON-TEXT',
            parentType: node.parentElement?.tagName || 'NO_PARENT'
          });

          const startNodeInfo = getNodeInfo(range.startContainer);
          const endNodeInfo = getNodeInfo(range.endContainer);

          setSelection({
            text: selectedText.slice(0, 20) + (selectedText.length > 20 ? '...' : ''),
            length: selectedText.length,
            startNode: startNodeInfo,
            endNode: endNodeInfo,
            offsets: {
              start: range.startOffset,
              end: range.endOffset
            },
            isSingleNode: range.startContainer === range.endContainer
          });
        } else {
          setSelection(null);
        }
      };

      intervalId = setInterval(checkSelection, 100);

      document.addEventListener('selectionchange', checkSelection);

      return () => {
        if (intervalId) {
          clearInterval(intervalId);
        }
        document.removeEventListener('selectionchange', checkSelection);
      };
    }

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [isTracking, editorRef]);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <Switch
          checked={isTracking}
          onCheckedChange={setIsTracking}
          className="mt-0.5"
          aria-label="Toggle selection tracking"
        />
        <span className="text-sm mr-2">Selection Debug</span>
      </div>
      {isTracking && selection && (
        <div className="space-y-1 text-xs font-mono bg-gray-100 dark:bg-gray-800 p-2 rounded-md max-w-xl">
          <div>Text: {selection.text} ({selection.length} chars)</div>
          <div>Single Node: {selection.isSingleNode ? 'Yes' : 'No'}</div>
          <div className="text-blue-600 dark:text-blue-400">
            Start: {selection.startNode.type} ({selection.offsets.start})
            <div className="ml-2">Content: {selection.startNode.content}</div>
            <div className="ml-2">Parent: {selection.startNode.parentType}</div>
          </div>
          <div className="text-green-600 dark:text-green-400">
            End: {selection.endNode.type} ({selection.offsets.end})
            <div className="ml-2">Content: {selection.endNode.content}</div>
            <div className="ml-2">Parent: {selection.endNode.parentType}</div>
          </div>
        </div>
      )}
      {isTracking && !selection && (
        <div className="text-sm text-gray-500">No selection</div>
      )}
    </div>
  );
};

export default SelectionTracker;