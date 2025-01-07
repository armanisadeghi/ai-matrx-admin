import React, { useEffect, forwardRef } from 'react';
import { useEditor } from './useEditor';

interface RichTextEditorProps {
  onChange?: (content: string) => void;
  className?: string;
  onDragOver?: (e: React.DragEvent<HTMLElement>) => void;
  onDrop?: (e: React.DragEvent<HTMLElement>) => void;
}

const RichTextEditor = forwardRef<HTMLDivElement, RichTextEditorProps>(({ 
  onChange,
  className = '',
  onDragOver,
  onDrop
}, ref) => {
  const {
    updatePlainTextContent,
    normalizeContent
  } = useEditor(ref as React.RefObject<HTMLDivElement>);

  useEffect(() => {
    const editor = (ref as React.RefObject<HTMLDivElement>).current;
    if (!editor) return;

    editor.setAttribute('role', 'textbox');
    editor.setAttribute('aria-multiline', 'true');
    editor.setAttribute('spellcheck', 'true');
    
    const handlePaste = (e: ClipboardEvent) => {
      e.preventDefault();
      const text = e.clipboardData?.getData('text/plain');
      if (text) {
        document.execCommand('insertText', false, text);
      }
    };
    
    editor.addEventListener('paste', handlePaste);
    
    return () => {
      editor.removeEventListener('paste', handlePaste);
    };
  }, [ref]);

  useEffect(() => {
    const editor = (ref as React.RefObject<HTMLDivElement>).current;
    onChange?.(editor?.textContent || '');
  }, [onChange, ref]);

  return (
    <div
      ref={ref}
      className={`min-h-48 p-4 focus:outline-none text-neutral-950 dark:text-neutral-50 whitespace-pre-wrap ${className}`}
      contentEditable
      onInput={updatePlainTextContent}
      onBlur={normalizeContent}
      onDragOver={onDragOver}
      onDrop={onDrop}
    />
  );
});

RichTextEditor.displayName = 'RichTextEditor';

export default RichTextEditor;