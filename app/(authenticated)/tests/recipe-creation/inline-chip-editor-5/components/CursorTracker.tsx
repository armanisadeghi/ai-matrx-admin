import React, { useState, useEffect } from 'react';
import { Switch } from '@/components/ui/switch';
import { getCursorPosition } from '../utils/commonUtils';

const CursorTracker = ({ editorRef }) => {
  const [isTracking, setIsTracking] = useState(false);
  const [cursorPosition, setCursorPosition] = useState(0);

  useEffect(() => {
    let intervalId: NodeJS.Timeout | null = null;

    if (isTracking && editorRef.current) {
      // Set up the interval when tracking is enabled
      intervalId = setInterval(() => {
        const position = getCursorPosition(editorRef.current);
        setCursorPosition(position);
      }, 100);
    }

    // Cleanup function
    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [isTracking, editorRef]); // Only re-run if tracking state or editor reference changes

  return (
    <div className="flex items-center gap-2">
      <Switch
        checked={isTracking}
        onCheckedChange={setIsTracking}
        className="mt-0.5"
        aria-label="Toggle cursor tracking"
      />
      <span className="text-sm mr-2">Track</span>
      {isTracking && (
        <div className="px-3 py-1 bg-pink-100 dark:bg-pink-700 rounded-md text-sm">
          {cursorPosition}
        </div>
      )}
    </div>
  );
};

export default CursorTracker;