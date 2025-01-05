"use client";

import React, { useCallback, useState } from "react";
import { X, Edit2 } from "lucide-react";
import { EditorBroker } from "../types";
import { useBrokerSync } from "@/providers/brokerSync/BrokerSyncProvider";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface BrokerChipProps {
  broker: EditorBroker;
  onRemoveRequest: () => void;
  className?: string;
}

export const BrokerChip: React.FC<BrokerChipProps> = ({
  broker,
  onRemoveRequest,
  className = "",
}) => {
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editValue, setEditValue] = useState(broker.displayName);
  
  const { 
    handleChipEvent,
    getConnectionStatus 
  } = useBrokerSync();

  // Get connection status to ensure proper color syncing
  const connectionStatus = getConnectionStatus(broker.id);
  const chipColor = connectionStatus?.color || 'blue';

  const handleEdit = useCallback(() => {
    setIsEditDialogOpen(true);
  }, []);

  const handleEditSubmit = useCallback(() => {
    if (editValue && editValue !== broker.displayName) {
      handleChipEvent({
        type: "edit",
        brokerId: broker.id,
        content: editValue
      }, broker.editorId || '');
    }
    setIsEditDialogOpen(false);
  }, [broker.id, broker.editorId, editValue, handleChipEvent]);

  const handleRemove = useCallback(() => {
    handleChipEvent({
      type: "remove",
      brokerId: broker.id
    }, broker.editorId || '');
    onRemoveRequest();
  }, [broker.id, broker.editorId, handleChipEvent, onRemoveRequest]);

  const colorClasses = {
    blue: 'bg-blue-100 dark:bg-blue-900',
    green: 'bg-green-100 dark:bg-green-900',
    yellow: 'bg-yellow-100 dark:bg-yellow-900',
    red: 'bg-red-100 dark:bg-red-900',
    purple: 'bg-purple-100 dark:bg-purple-900',
    pink: 'bg-pink-100 dark:bg-pink-900',
    indigo: 'bg-indigo-100 dark:bg-indigo-900',
    teal: 'bg-teal-100 dark:bg-teal-900'
  };

  return (
    <>
      <span
        contentEditable={false}
        className={`inline-flex items-center gap-1 px-2 py-1 m-1 text-sm rounded-full 
                   ${colorClasses[chipColor as keyof typeof colorClasses]}
                   text-gray-900 dark:text-gray-100
                   select-none cursor-default hover:ring-2 hover:ring-offset-1
                   hover:ring-${chipColor}-500/50 
                   transition-all duration-200 ${className}`}
        data-chip
        data-broker-id={broker.id}
        data-editor-id={broker.editorId}
        data-color={chipColor}
      >
        <span 
          className="chip-content truncate max-w-[200px]" 
          onDoubleClick={handleEdit}
          title={broker.displayName}
        >
          {broker.displayName}
        </span>
        <div className="flex gap-1 items-center">
          <button
            onClick={handleEdit}
            className="inline-flex items-center p-0.5 hover:bg-black/10 dark:hover:bg-white/10
                       focus:outline-none focus:ring-2 focus:ring-offset-1 
                       focus:ring-gray-500 rounded-full transition-colors"
            type="button"
            aria-label="Edit name"
          >
            <Edit2 size={12} />
          </button>
          <button
            onClick={handleRemove}
            className="inline-flex items-center p-0.5 hover:bg-black/10 dark:hover:bg-white/10
                       focus:outline-none focus:ring-2 focus:ring-offset-1 
                       focus:ring-gray-500 rounded-full transition-colors"
            type="button"
            aria-label="Remove"
          >
            <X size={12} />
          </button>
        </div>
      </span>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Broker Name</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <Input
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleEditSubmit();
                }
              }}
              autoFocus
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button 
              variant="outline" 
              onClick={() => setIsEditDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleEditSubmit}>Save</Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default BrokerChip;