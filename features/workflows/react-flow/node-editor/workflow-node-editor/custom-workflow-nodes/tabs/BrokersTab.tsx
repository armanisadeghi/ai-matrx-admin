'use client';

import React from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Trash2 } from "lucide-react";
import { BaseNode } from '@/features/workflows/types';

interface BrokersTabProps {
  node: BaseNode;
  onNodeUpdate: (updatedNode: BaseNode) => void;
}

const BrokersTab: React.FC<BrokersTabProps> = ({ node, onNodeUpdate }) => {
  const returnBrokerOverrides = node.return_broker_overrides || [];

  const addReturnBrokerOverride = () => {
    const updated = {
      ...node,
      return_broker_overrides: [...returnBrokerOverrides, '']
    };
    onNodeUpdate(updated);
  };

  const updateReturnBrokerOverride = (index: number, value: string) => {
    const overrides = [...returnBrokerOverrides];
    overrides[index] = value;
    const updated = { ...node, return_broker_overrides: overrides };
    onNodeUpdate(updated);
  };

  const removeReturnBrokerOverride = (index: number) => {
    const overrides = returnBrokerOverrides.filter((_, i) => i !== index);
    const updated = { ...node, return_broker_overrides: overrides };
    onNodeUpdate(updated);
  };

  return (
    <div className="mt-4 space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Return Broker Overrides</CardTitle>
            <Button onClick={addReturnBrokerOverride} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add Override
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {returnBrokerOverrides.length > 0 ? (
            <div className="space-y-3">
              {returnBrokerOverrides.map((brokerId, index) => (
                <Card key={index} className="border-border">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      <div className="flex-1 space-y-2">
                        <Label>Broker ID</Label>
                        <Input
                          value={brokerId}
                          onChange={(e) => updateReturnBrokerOverride(index, e.target.value)}
                          placeholder="Enter broker ID"
                        />
                      </div>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => removeReturnBrokerOverride(index)}
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
              No return broker overrides configured. Click "Add Override" to get started.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default BrokersTab; 