import React, { useEffect, useRef, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { cn } from "@/lib/utils";

interface DataChangeCounterProps {
  data: any;
  label?: string;
  className?: string;
}

const DataChangeCounter = ({ data, label, className }: DataChangeCounterProps) => {
  const changeCount = useRef(0);
  const previousData = useRef<any>(undefined);
  const [isHighlighted, setIsHighlighted] = useState(false);
  const [isReset, setIsReset] = useState(false);

  const handleReset = () => {
    changeCount.current = 0;
    previousData.current = JSON.parse(JSON.stringify(data));
    // Trigger success animation
    setIsReset(true);
    setTimeout(() => {
      setIsReset(false);
    }, 1000);
  };

  useEffect(() => {
    // Initialize on first render
    if (previousData.current === undefined) {
      changeCount.current = 1;
    } else {
      // Deep compare for objects and arrays, direct compare for primitives
      const hasChanged = JSON.stringify(previousData.current) !== JSON.stringify(data);
      if (hasChanged) {
        changeCount.current += 1;
        // Trigger highlight animation
        setIsHighlighted(true);
        setTimeout(() => {
          setIsHighlighted(false);
        }, 1000);
      }
    }
    previousData.current = JSON.parse(JSON.stringify(data));
  }, [data]);

  return (
    <div 
      className={cn(
        "inline-flex items-center gap-2 px-2 py-1 rounded border text-xs transition-colors duration-150",
        isReset 
          ? "bg-green-500/10 text-green-700 border-green-500/50" 
          : isHighlighted 
            ? "bg-destructive/10 text-destructive border-destructive/50" 
            : "bg-background border-border",
        className
      )}
    >
      {label && (
        <span className={cn(
          "transition-colors duration-150",
          isReset ? "text-green-700" : isHighlighted ? "text-destructive" : "text-muted-foreground"
        )}>
          {label}:
        </span>
      )}
      <span className={cn(
        "font-mono font-medium transition-colors duration-150",
        isReset ? "text-green-700" : isHighlighted ? "text-destructive" : ""
      )}>
        {changeCount.current}
      </span>
      <button
        type="button"
        onClick={handleReset}
        className="p-1 hover:bg-muted rounded-md transition-colors"
        aria-label="Reset counter"
      >
        <RefreshCw className="h-3 w-3 text-muted-foreground hover:text-foreground" />
      </button>
    </div>
  );
};

export default DataChangeCounter;