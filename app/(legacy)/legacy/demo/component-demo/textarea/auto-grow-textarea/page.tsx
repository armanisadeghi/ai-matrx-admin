'use client';

import React, { useRef } from 'react';
import { Textarea } from '@/components/ui/textarea';

const AutoGrowingTextarea = React.forwardRef<HTMLTextAreaElement, {
  className?: string;
  onChange?: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  searchParams?: any;
  [key: string]: any;
}>(({ 
  className,
  onChange,
  searchParams,
  ...domProps
}, forwardedRef) => {
  const textareaRef = useRef(null);
  
  const handleInput = (e) => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${textarea.scrollHeight}px`;
    }
    // Call the original onChange if provided
    onChange?.(e);
  };

  return (
    <Textarea
      {...domProps}
      ref={(element) => {
        textareaRef.current = element;
        if (typeof forwardedRef === 'function') {
          forwardedRef(element);
        } else if (forwardedRef) {
          forwardedRef.current = element;
        }
      }}
      onChange={onChange}
      onInput={handleInput}
      rows={1}
      className={`min-h-[80px] ${className || ''}`}
    />
  );
});

AutoGrowingTextarea.displayName = 'AutoGrowingTextarea';

export default AutoGrowingTextarea;