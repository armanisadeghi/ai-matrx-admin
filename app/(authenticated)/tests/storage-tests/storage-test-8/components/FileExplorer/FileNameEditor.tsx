// FileNameEditor.tsx
import React, { useState, useRef, useEffect } from 'react';
import { Check, X, AlertTriangle } from 'lucide-react';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from '@/lib/utils';

interface FileNameEditorProps {
  name: string;
  extension: string;  // Using the actual file extension from node
  isEditing: boolean;
  onRename: (newName: string) => void;
  onCancel: () => void;
  className?: string;
}

export function FileNameEditor({
  name,
  extension,
  isEditing,
  onRename,
  onCancel,
  className
}: FileNameEditorProps) {
  const [editValue, setEditValue] = useState(name);
  const [showExtensionWarning, setShowExtensionWarning] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  
  // Get new extension from edited value
  const getNewExtension = (filename: string) => {
    const parts = filename.split('.');
    return parts.length > 1 ? parts.pop()! : '';
  };
  
  const newExt = getNewExtension(editValue);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      
      if (extension) {
        const nameLength = name.length - extension.length - 1;
        inputRef.current.setSelectionRange(0, nameLength);
      } else {
        inputRef.current.select();
      }
    }
  }, [isEditing, name, extension]);

  const validateAndRename = () => {
    if (editValue.trim() === '') {
      onCancel();
      return;
    }

    if (editValue === name) {
      onCancel();
      return;
    }

    // Check if extension changed
    if (extension && newExt !== extension) {
      setShowExtensionWarning(true);
      return;
    }

    // If we get here, no warnings needed, proceed with rename
    onRename(editValue);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      validateAndRename();
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      onCancel();
    }
  };

  if (!isEditing) {
    return <span className={cn("text-sm truncate max-w-[300px] inline-block", className)}>
      {name}
    </span>;
  }

  return (
    <>
      <div className="flex items-center gap-1 max-w-[300px] relative">
        <input
          ref={inputRef}
          type="text"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={(e) => {
            if (!showExtensionWarning && (!e.relatedTarget || !e.relatedTarget.closest('.filename-editor-controls'))) {
              onCancel();
            }
          }}
          className="bg-transparent border-none p-0 text-sm focus:outline-none focus:ring-0 w-full"
          autoComplete="off"
          data-form-type="other"
          data-lpignore="true"
          data-form-autofill="off"
        />
        <div className="filename-editor-controls flex gap-1">
          <button
            onClick={validateAndRename}
            className="p-1 hover:bg-accent rounded-sm"
          >
            <Check className="h-4 w-4 text-green-500" />
          </button>
          <button
            onClick={onCancel}
            className="p-1 hover:bg-accent rounded-sm"
          >
            <X className="h-4 w-4 text-red-500" />
          </button>
        </div>
      </div>

      <AlertDialog 
        open={showExtensionWarning} 
        onOpenChange={(open) => {
          if (!open) {
            onCancel();
          }
          setShowExtensionWarning(open);
        }}
      >
        <AlertDialogContent className="z-50">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              Extension Change Detected
            </AlertDialogTitle>
            <div className="space-y-4">
              <AlertDialogDescription>
                Changing a file's extension may make it unusable.
              </AlertDialogDescription>
              
              <div className="flex items-center justify-center gap-4 my-4">
                <div className="text-center">
                  <div className="text-sm text-muted-foreground mb-1">Current</div>
                  <div className="bg-secondary px-3 py-2 rounded-md font-mono text-lg">
                    .{extension}
                  </div>
                </div>
                <div className="text-2xl text-muted-foreground">→</div>
                <div className="text-center">
                  <div className="text-sm text-muted-foreground mb-1">New</div>
                  <div className="bg-secondary px-3 py-2 rounded-md font-mono text-lg text-yellow-500">
                    .{newExt}
                  </div>
                </div>
              </div>
            </div>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={onCancel}>Keep Original</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => {
                onRename(editValue);
                setShowExtensionWarning(false);
              }}
              className="bg-yellow-500 hover:bg-yellow-600"
            >
              Change Extension
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}