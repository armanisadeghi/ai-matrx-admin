import React, { useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from "@/lib/utils";

interface DataItemProps {
  label: string;
  value: any;
  className?: string;
}

const DataItem = ({ label, value, className }: DataItemProps) => {
  const [hasCopied, setHasCopied] = useState(false);
  
  const handleCopy = async () => {
    const stringValue = typeof value === 'object' 
      ? JSON.stringify(value, null, 2) 
      : String(value);
      
    await navigator.clipboard.writeText(stringValue);
    setHasCopied(true);
    
    setTimeout(() => {
      setHasCopied(false);
    }, 450);
  };

  return (
    <div className={cn("p-2 bg-background rounded-lg relative group", className)}>
      <div className="flex justify-between items-start">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        <button
          type="button"
          onClick={handleCopy}
          className="p-1 hover:bg-muted rounded-md transition-colors opacity-0 group-hover:opacity-100"
          aria-label="Copy to clipboard"
        >
          {hasCopied ? (
            <motion.div
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.8 }}
              className="text-green-500"
            >
              <Check className="h-4 w-4" />
            </motion.div>
          ) : (
            <Copy className="h-4 w-4 text-muted-foreground hover:text-foreground" />
          )}
        </button>
      </div>
      <pre className="mt-1 text-sm whitespace-pre-wrap break-all">
        {typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value)}
      </pre>
    </div>
  );
};

export default DataItem;