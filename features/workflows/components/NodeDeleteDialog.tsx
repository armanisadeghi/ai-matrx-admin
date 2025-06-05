"use client";

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Trash2, Unlink, AlertTriangle } from "lucide-react";
import { Node } from "reactflow";

interface NodeDeleteDialogProps {
  node: Node | null;
  isOpen: boolean;
  onClose: () => void;
  onRemoveFromWorkflow: (nodeId: string) => void;
  onPermanentDelete: (nodeId: string) => void;
  isProcessing: boolean;
}

export const NodeDeleteDialog: React.FC<NodeDeleteDialogProps> = ({
  node,
  isOpen,
  onClose,
  onRemoveFromWorkflow,
  onPermanentDelete,
  isProcessing,
}) => {
  if (!node) return null;

  const getNodeTypeName = (node: Node) => {
    const data = node.data;
    if (data.type === 'userInput') return 'User Input';
    if (data.type === 'brokerRelay') return 'Broker Relay';
    return 'Workflow Step';
  };

  const getNodeDisplayName = (node: Node) => {
    const data = node.data;
    if (data.step_name) return data.step_name;
    if (data.label) return data.label;
    return `${getNodeTypeName(node)} (${node.id.slice(0, 8)}...)`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Delete {getNodeTypeName(node)}
          </DialogTitle>
          <DialogDescription>
            Choose how you want to remove "{getNodeDisplayName(node)}" from this workflow.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              This action cannot be undone. Choose carefully based on whether you want to reuse this node elsewhere.
            </AlertDescription>
          </Alert>

          <div className="space-y-3">
            {/* Remove from workflow option */}
            <div className="p-4 border rounded-lg border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-900/20">
              <h4 className="font-medium text-yellow-800 dark:text-yellow-200 flex items-center gap-2 mb-2">
                <Unlink className="h-4 w-4" />
                Remove from Workflow
              </h4>
              <p className="text-sm text-yellow-700 dark:text-yellow-300 mb-3">
                Removes this node from the current workflow but keeps it in the database. 
                You can add it to other workflows later.
              </p>
              <Button
                variant="outline"
                onClick={() => onRemoveFromWorkflow(node.id)}
                disabled={isProcessing}
                className="w-full border-yellow-300 text-yellow-800 hover:bg-yellow-100 dark:border-yellow-700 dark:text-yellow-200 dark:hover:bg-yellow-900/30"
              >
                <Unlink className="h-4 w-4 mr-2" />
                Remove from Workflow
              </Button>
            </div>

            {/* Permanent delete option */}
            <div className="p-4 border rounded-lg border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20">
              <h4 className="font-medium text-red-800 dark:text-red-200 flex items-center gap-2 mb-2">
                <Trash2 className="h-4 w-4" />
                Delete Permanently
              </h4>
              <p className="text-sm text-red-700 dark:text-red-300 mb-3">
                Permanently deletes this node from the database. This will remove it from ALL workflows 
                that use this node.
              </p>
              <Button
                variant="destructive"
                onClick={() => onPermanentDelete(node.id)}
                disabled={isProcessing}
                className="w-full"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Permanently
              </Button>
            </div>
          </div>

          <div className="flex justify-end">
            <Button
              variant="ghost"
              onClick={onClose}
              disabled={isProcessing}
            >
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}; 