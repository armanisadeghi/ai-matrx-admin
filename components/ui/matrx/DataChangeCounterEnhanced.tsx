import React, { useEffect, useRef, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { cn } from "@/lib/utils";

interface DataChangeCounterProps {
  data: any;
  label?: string;
  className?: string;
}

type AlertLevel = 'none' | 'warning' | 'alert' | 'critical';

const DataChangeCounterEnhanced = ({ data, label, className }: DataChangeCounterProps) => {
  const changeCount = useRef(0);
  const previousData = useRef<any>(undefined);
  const [isReset, setIsReset] = useState(false);
  const [alertLevel, setAlertLevel] = useState<AlertLevel>('none');
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const changesWithinWindow = useRef(0);

  const getAlertStyles = (level: AlertLevel) => {
    switch (level) {
      case 'warning':
        return 'bg-yellow-500/10 text-yellow-700 border-yellow-500/50';
      case 'alert':
        return 'bg-orange-500/10 text-orange-700 border-orange-500/50';
      case 'critical':
        return 'bg-destructive/10 text-destructive border-destructive/50';
      case 'none':
      default:
        return 'bg-background border-border';
    }
  };

  const handleChange = () => {
    changesWithinWindow.current += 1;
    
    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Set alert level based on changes within window
    if (changesWithinWindow.current >= 3) {
      setAlertLevel('critical');
    } else if (changesWithinWindow.current === 2) {
      setAlertLevel('alert');
    } else {
      setAlertLevel('warning');
    }

    // Set timeout to step down
    timeoutRef.current = setTimeout(() => {
      changesWithinWindow.current = 0;
      setAlertLevel('none');
    }, 1000);
  };

  const handleReset = () => {
    changeCount.current = 0;
    previousData.current = JSON.parse(JSON.stringify(data));
    changesWithinWindow.current = 0;
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setAlertLevel('none');
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
        handleChange();
      }
    }
    previousData.current = JSON.parse(JSON.stringify(data));
  }, [data]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return (
    <div 
      className={cn(
        "inline-flex items-center gap-2 px-2 py-1 rounded border text-xs transition-colors duration-150",
        isReset 
          ? "bg-green-500/10 text-green-700 border-green-500/50" 
          : getAlertStyles(alertLevel),
        className
      )}
    >
      {label && (
        <span className={cn(
          "transition-colors duration-150",
          isReset 
            ? "text-green-700" 
            : alertLevel !== 'none' 
              ? cn(alertLevel === 'warning' && "text-yellow-700",
                   alertLevel === 'alert' && "text-orange-700",
                   alertLevel === 'critical' && "text-destructive")
              : "text-muted-foreground"
        )}>
          {label}:
        </span>
      )}
      <span className={cn(
        "font-mono font-medium transition-colors duration-150",
        isReset 
          ? "text-green-700" 
          : alertLevel !== 'none' 
            ? cn(alertLevel === 'warning' && "text-yellow-700",
                 alertLevel === 'alert' && "text-orange-700",
                 alertLevel === 'critical' && "text-destructive")
            : ""
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

export default DataChangeCounterEnhanced;