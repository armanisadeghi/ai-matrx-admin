'use client';

import React, { useState, useEffect } from 'react';
import { BrokerRelayData } from './BrokerRelayNode';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowRightLeft, Plus, Trash2, Copy } from "lucide-react";

interface BrokerRelayEditorProps {
  node: BrokerRelayData | null;
  onSave: (updatedNode: BrokerRelayData) => void;
  onClose: () => void;
  open: boolean;
  readOnly?: boolean;
}

const BrokerRelayEditor: React.FC<BrokerRelayEditorProps> = ({ 
  node, 
  onSave, 
  onClose,
  open,
  readOnly = false
}) => {
  const [editingNode, setEditingNode] = useState<BrokerRelayData | null>(node);
  const [cancelClicked, setCancelClicked] = useState(false);

  useEffect(() => {
    setEditingNode(node);
    setCancelClicked(false); // Reset cancel flag when dialog opens
  }, [node]);

  if (!editingNode) return null;

  const handleSave = () => {
    if (editingNode) {
      onSave(editingNode);
      onClose();
    }
  };

  const handleCancel = () => {
    setCancelClicked(true);
    onClose();
  };

  const handleDialogClose = (open: boolean) => {
    if (!open) {
      // If dialog is closing and user didn't click cancel, auto-save
      if (!cancelClicked && editingNode) {
        onSave(editingNode);
      }
      onClose();
    }
  };

  const addTarget = () => {
    setEditingNode({
      ...editingNode,
      targets: [...editingNode.targets, '']
    });
  };

  const updateTarget = (index: number, value: string) => {
    const newTargets = [...editingNode.targets];
    newTargets[index] = value;
    setEditingNode({
      ...editingNode,
      targets: newTargets
    });
  };

  const removeTarget = (index: number) => {
    const newTargets = editingNode.targets.filter((_, i) => i !== index);
    setEditingNode({
      ...editingNode,
      targets: newTargets
    });
  };

  const copyAllTargets = () => {
    const targetsText = editingNode.targets.join('\n');
    navigator.clipboard.writeText(targetsText);
  };

  return (
    <Dialog open={open} onOpenChange={handleDialogClose}>
      <DialogContent className="max-w-3xl h-[85vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <ArrowRightLeft className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            Edit Broker Relay: {editingNode.label || 'Unnamed Relay'}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-y-auto space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Relay Configuration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="relay-label">Label</Label>
                <Input
                  id="relay-label"
                  value={editingNode.label || ''}
                  onChange={(e) => setEditingNode({ ...editingNode, label: e.target.value })}
                  placeholder="Enter relay label"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="source-broker">Source Broker ID</Label>
                <Input
                  id="source-broker"
                  value={editingNode.source}
                  onChange={(e) => setEditingNode({ ...editingNode, source: e.target.value })}
                  placeholder="Enter source broker ID"
                  className="font-mono"
                />
                <p className="text-xs text-muted-foreground">
                  The broker ID that provides data to this relay
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Target Brokers</CardTitle>
                <div className="flex gap-2">
                  <Button onClick={copyAllTargets} variant="outline" size="sm">
                    <Copy className="h-4 w-4 mr-2" />
                    Copy All
                  </Button>
                  <Button onClick={addTarget} size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Target
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {editingNode.targets.length > 0 ? (
                <div className="space-y-3">
                  {editingNode.targets.map((target, index) => (
                    <Card key={index} className="border-border">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-4">
                          <div className="flex-1 space-y-2">
                            <Label>Target {index + 1}</Label>
                            <Input
                              value={target}
                              onChange={(e) => updateTarget(index, e.target.value)}
                              placeholder="Enter target broker ID"
                              className="font-mono"
                            />
                          </div>
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => removeTarget(index)}
                            className="mt-6"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No target brokers configured. Click "Add Target" to get started.
                </div>
              )}
            </CardContent>
          </Card>

          {/* Data Flow Visualization */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Data Flow Preview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-muted p-4 rounded-md">
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="bg-blue-100 dark:bg-blue-900/50 px-3 py-2 rounded text-sm font-mono">
                      {editingNode.source || 'source_broker_id'}
                    </div>
                    <ArrowRightLeft className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    <div className="text-sm font-medium">
                      {editingNode.label || 'Relay'}
                    </div>
                    <ArrowRightLeft className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    <div className="text-sm text-muted-foreground">
                      {editingNode.targets.length} target{editingNode.targets.length !== 1 ? 's' : ''}
                    </div>
                  </div>
                  
                  {editingNode.targets.length > 0 && (
                    <div className="ml-8 space-y-1">
                      {editingNode.targets.slice(0, 5).map((target, index) => (
                        <div key={index} className="bg-green-100 dark:bg-green-900/50 px-2 py-1 rounded text-xs font-mono">
                          → {target || `target_${index + 1}`}
                        </div>
                      ))}
                      {editingNode.targets.length > 5 && (
                        <div className="text-xs text-muted-foreground px-2">
                          +{editingNode.targets.length - 5} more targets...
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Label</p>
                  <p className="font-medium">{editingNode.label || 'Unnamed Relay'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Source</p>
                  <p className="font-mono text-xs">{editingNode.source || 'Not set'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Target Count</p>
                  <p className="font-medium">{editingNode.targets.length}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Valid Targets</p>
                  <p className="font-medium">{editingNode.targets.filter(t => t.trim()).length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <DialogFooter className="flex-shrink-0">
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default BrokerRelayEditor; 