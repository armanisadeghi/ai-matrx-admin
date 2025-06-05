'use client';

import React, { useState, useEffect } from 'react';
import { UserInputData } from '@/features/workflows/types';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { User } from "lucide-react";

interface UserInputEditorProps {
  node: UserInputData | null;
  onSave: (updatedNode: UserInputData) => void;
  onClose: () => void;
  open: boolean;
  readOnly?: boolean;
}

const UserInputEditor: React.FC<UserInputEditorProps> = ({ 
  node, 
  onSave, 
  onClose,
  open,
  readOnly = false
}) => {
  const [editingNode, setEditingNode] = useState<UserInputData | null>(node);
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

  const handleValueChange = (value: string) => {
    let processedValue: any = value;
    
    // Convert value based on data type
    if (editingNode.data_type === 'int') {
      processedValue = value ? parseInt(value) || 0 : null;
    } else if (editingNode.data_type === 'float') {
      processedValue = value ? parseFloat(value) || 0 : null;
    } else if (editingNode.data_type === 'bool') {
      processedValue = value.toLowerCase() === 'true';
    } else if (editingNode.data_type === 'dict' || editingNode.data_type === 'list') {
      try {
        processedValue = value ? JSON.parse(value) : null;
      } catch (e) {
        // Keep as string if not valid JSON
        processedValue = value;
      }
    }
    
    setEditingNode({
      ...editingNode,
      value: processedValue
    });
  };

  const getValueAsString = () => {
    if (editingNode.value === null || editingNode.value === undefined) return '';
    if ((editingNode.data_type === 'dict' || editingNode.data_type === 'list') && typeof editingNode.value === 'object') {
      return JSON.stringify(editingNode.value, null, 2);
    }
    return String(editingNode.value);
  };

  return (
    <Dialog open={open} onOpenChange={handleDialogClose}>
      <DialogContent className="max-w-2xl h-[85vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            Edit User Input: {editingNode.label || 'Unnamed Input'}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-y-auto space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Input Configuration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="input-label">Label</Label>
                  <Input
                    id="input-label"
                    value={editingNode.label || ''}
                    onChange={(e) => setEditingNode({ ...editingNode, label: e.target.value })}
                    placeholder="Enter input label"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="data-type">Data Type</Label>
                  <Select 
                    value={editingNode.data_type || 'str'} 
                    onValueChange={(value: any) => setEditingNode({ ...editingNode, data_type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="str">String (str)</SelectItem>
                      <SelectItem value="int">Integer (int)</SelectItem>
                      <SelectItem value="float">Float (float)</SelectItem>
                      <SelectItem value="bool">Boolean (bool)</SelectItem>
                      <SelectItem value="list">List (list)</SelectItem>
                      <SelectItem value="dict">Dictionary (dict)</SelectItem>
                      <SelectItem value="tuple">Tuple (tuple)</SelectItem>
                      <SelectItem value="set">Set (set)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="broker-id">Broker ID</Label>
                <Input
                  id="broker-id"
                  value={editingNode.broker_id}
                  onChange={(e) => setEditingNode({ ...editingNode, broker_id: e.target.value })}
                  placeholder="Enter unique broker ID"
                  className="font-mono"
                />
                <p className="text-xs text-muted-foreground">
                  This ID will be used to reference this input in other nodes
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Default Value</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {editingNode.data_type === 'bool' ? (
                <Select 
                  value={String(editingNode.value)} 
                  onValueChange={(value) => handleValueChange(value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="true">True</SelectItem>
                    <SelectItem value="false">False</SelectItem>
                  </SelectContent>
                </Select>
              ) : (editingNode.data_type === 'dict' || editingNode.data_type === 'list') ? (
                <div className="space-y-2">
                  <Textarea
                    value={getValueAsString()}
                    onChange={(e) => handleValueChange(e.target.value)}
                    placeholder="Enter JSON data"
                    className="font-mono min-h-24"
                  />
                  <p className="text-xs text-muted-foreground">
                    Enter valid JSON format
                  </p>
                </div>
              ) : (
                <Input
                  type={(editingNode.data_type === 'int' || editingNode.data_type === 'float') ? 'number' : 'text'}
                  value={getValueAsString()}
                  onChange={(e) => handleValueChange(e.target.value)}
                  placeholder={`Enter ${editingNode.data_type} value`}
                />
              )}
            </CardContent>
          </Card>

          {/* Preview */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Preview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-muted p-3 rounded-md">
                <p className="text-sm text-muted-foreground">
                  <strong>Label:</strong> {editingNode.label || 'Unnamed Input'}
                </p>
                <p className="text-sm text-muted-foreground">
                  <strong>Broker ID:</strong> <code className="bg-background px-1 py-0.5 rounded text-xs">{editingNode.broker_id}</code>
                </p>
                <p className="text-sm text-muted-foreground">
                  <strong>Type:</strong> {editingNode.data_type}
                </p>
                <p className="text-sm text-muted-foreground">
                  <strong>Value:</strong> <code className="bg-background px-1 py-0.5 rounded text-xs">{getValueAsString() || 'null'}</code>
                </p>
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

export default UserInputEditor; 