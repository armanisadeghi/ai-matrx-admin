'use client';

import React, { useState, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Settings } from "lucide-react";
import { CustomNodeEditorProps } from './types';
import { BaseNode } from '@/features/workflows/types';

/**
 * Save button component that handles save logic
 */
const SaveButton: React.FC<{ 
  node: BaseNode; 
  onSave: (node: any) => void; 
  onClose: () => void;
  validationErrors?: string[];
}> = ({ node, onSave, onClose, validationErrors = [] }) => {
  
  const handleSave = () => {
    try {
      onSave(node);
      onClose();
    } catch (error) {
      console.error('Save error:', error);
    }
  };

  return (
    <Button 
      onClick={handleSave} 
      disabled={validationErrors.length > 0}
    >
      Save Changes
    </Button>
  );
};

/**
 * Main CustomNodeEditor component that provides dialog structure
 */
const CustomNodeEditor: React.FC<CustomNodeEditorProps> = ({
  node,
  onSave,
  onClose,
  open,
  component: Component,
  autoSave = false,
  validation = 'permissive',
  title,
  width = 'max-w-6xl',
  height = 'h-[85vh]'
}) => {
  const [cancelClicked, setCancelClicked] = useState(false);
  const [editingNode, setEditingNode] = useState<BaseNode>(node);

  const handleCancel = useCallback(() => {
    setCancelClicked(true);
    onClose();
  }, [onClose]);

  const handleDialogClose = useCallback((open: boolean) => {
    if (!open) {
      setCancelClicked(false);
      onClose();
    }
  }, [onClose, cancelClicked]);

  if (!node) return null;

  return (
    <Dialog open={open} onOpenChange={handleDialogClose}>
      <DialogContent className={`${width} ${height} flex flex-col`}>
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            {title || `Edit Node: ${node.step_name || 'Unnamed Step'}`}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-hidden">
          <Component node={editingNode} onNodeUpdate={setEditingNode} />
        </div>
        
        {!autoSave && (
          <DialogFooter className="flex-shrink-0">
            <Button variant="outline" onClick={handleCancel}>
              Cancel
            </Button>
            <SaveButton 
              node={editingNode} 
              onSave={onSave} 
              onClose={onClose}
              validationErrors={[]}
            />
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default CustomNodeEditor; 