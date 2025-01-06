"use client";

import React, { useCallback } from "react";
import { X, Edit2, Link } from "lucide-react";
import { EditorBroker } from "../types";
import { useBrokerSync } from "@/providers/brokerSync/BrokerSyncProvider";
import { useRefManager } from "@/lib/refs";

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
  const { updateBrokerName } = useBrokerSync();
  const refManager = useRefManager();

  // Simple name edit
  const handleEdit = useCallback(() => {
    // Later we can replace this with a proper dialog
    const newName = prompt("Enter new name:", broker.displayName);
    if (newName && newName !== broker.displayName) {
      updateBrokerName(broker.id, newName);
    }
  }, [broker.id, broker.displayName, updateBrokerName]);

  // Remove chip
  const handleRemove = useCallback(() => {
    onRemoveRequest();
  }, [onRemoveRequest]);

  // For more complex actions, let the editor handle it
  const handleRelationshipClick = useCallback(() => {
    // Let the editor show the relationship dialog
    refManager.call(broker.editorId, 'showBrokerDialog', {
      type: 'relationship',
      brokerId: broker.id
    });
  }, [broker.id, broker.editorId, refManager]);

  const chipColor = broker.color || 'red'; // Fallback color

  return (
    <span
      contentEditable={false}
      className={`inline-flex items-center gap-1 px-2 py-1 m-1 text-sm rounded-full 
                bg-${chipColor}-100 dark:bg-${chipColor}-900 
                text-${chipColor}-900 dark:text-${chipColor}-100
                select-none cursor-default ${className}`}
      data-chip
      data-broker-id={broker.id}
      data-editor-id={broker.editorId}
      data-progress-step={broker.progressStep}
    >
      <span className="chip-content flex items-center gap-1">
        {broker.displayName}
        {!broker.isConnected && (
          <Link 
            size={12} 
            className="text-gray-400 cursor-pointer"
            onClick={handleRelationshipClick}
          />
        )}
      </span>
      <div className="flex gap-1">
        <button
          onClick={handleEdit}
          className="inline-flex items-center p-0.5 hover:bg-black/10 dark:hover:bg-white/10
                     focus:outline-none focus:ring-2 focus:ring-gray-500 rounded-full"
          type="button"
          aria-label="Edit name"
        >
          <Edit2 size={12} />
        </button>
        <button
          onClick={handleRemove}
          className="inline-flex items-center p-0.5 hover:bg-black/10 dark:hover:bg-white/10
                     focus:outline-none focus:ring-2 focus:ring-gray-500 rounded-full"
          type="button"
          aria-label="Remove"
        >
          <X size={12} />
        </button>
      </div>
    </span>
  );
};

export default BrokerChip;