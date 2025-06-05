'use client';

import React from 'react';
import { cloneDeep } from 'lodash';
import { WorkflowDependency, TabComponentProps } from '@/features/workflows/types';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Trash2 } from "lucide-react";


const Dependencies: React.FC<TabComponentProps> = ({ node, onNodeUpdate }) => {
  const addWorkflowDependency = () => {
    const updated = cloneDeep(node);
    if (!updated.additional_dependencies) updated.additional_dependencies = [];
    updated.additional_dependencies.push({
      source_broker_id: '',
      target_broker_id: ''
    });
    onNodeUpdate(updated);
  };

  const updateWorkflowDependency = (index: number, field: keyof WorkflowDependency, value: string) => {
    const updated = cloneDeep(node);
    if (!updated.additional_dependencies) return;
    updated.additional_dependencies[index] = {
      ...updated.additional_dependencies[index],
      [field]: value
    };
    onNodeUpdate(updated);
  };

  const removeWorkflowDependency = (index: number) => {
    const updated = cloneDeep(node);
    if (!updated.additional_dependencies) return;
    updated.additional_dependencies.splice(index, 1);
    onNodeUpdate(updated);
  };

  return (
    <div className="mt-4 space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Workflow Dependencies</CardTitle>
            <Button onClick={addWorkflowDependency} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add Dependency
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {node.additional_dependencies && node.additional_dependencies.length > 0 ? (
            <div className="space-y-3">
              {node.additional_dependencies.map((dependency, index) => (
                <Card key={index} className="border-border">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      <div className="flex-1 space-y-2">
                        <Label>Source Broker ID</Label>
                        <Input
                          value={dependency.source_broker_id}
                          onChange={(e) => updateWorkflowDependency(index, 'source_broker_id', e.target.value)}
                          placeholder="Enter source broker ID"
                        />
                      </div>
                      <div className="flex-1 space-y-2">
                        <Label>Target Broker ID (Optional)</Label>
                        <Input
                          value={dependency.target_broker_id || ''}
                          onChange={(e) => updateWorkflowDependency(index, 'target_broker_id', e.target.value)}
                          placeholder="Enter target broker ID"
                        />
                      </div>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => removeWorkflowDependency(index)}
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
              No workflow dependencies configured. Click "Add Dependency" to get started.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Dependencies;
