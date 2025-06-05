'use client';

import React from 'react';
import { cloneDeep } from 'lodash';
import { getRegisteredFunctions } from '@/features/workflows/constants';
import { TabComponentProps, ArgumentMapping } from '@/features/workflows/types';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Trash2 } from "lucide-react";

const MappingsTab: React.FC<TabComponentProps> = ({ node, onNodeUpdate }) => {
  const functionData = getRegisteredFunctions().find(f => f.id === node.function_id);

  const addArgumentMapping = () => {
    const updated = cloneDeep(node);
    if (!updated.arg_mapping) updated.arg_mapping = [];
    updated.arg_mapping.push({
      source_broker_id: '',
      target_arg_name: ''
    });
    onNodeUpdate(updated);
  };

  const updateArgumentMapping = (index: number, field: keyof ArgumentMapping, value: string) => {
    const updated = cloneDeep(node);
    if (!updated.arg_mapping) return;
    updated.arg_mapping[index] = {
      ...updated.arg_mapping[index],
      [field]: value
    };
    onNodeUpdate(updated);
  };

  const removeArgumentMapping = (index: number) => {
    const updated = cloneDeep(node);
    if (!updated.arg_mapping) return;
    updated.arg_mapping.splice(index, 1);
    onNodeUpdate(updated);
  };

  return (
    <div className="mt-4 space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Argument Mappings</CardTitle>
            <Button onClick={addArgumentMapping} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add Mapping
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {node.arg_mapping && node.arg_mapping.length > 0 ? (
            <div className="space-y-3">
              {node.arg_mapping.map((mapping, index) => (
                <Card key={index} className="border-border">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      <div className="flex-1 space-y-2">
                        <Label>Source Broker ID</Label>
                        <Input
                          value={mapping.source_broker_id}
                          onChange={(e) => updateArgumentMapping(index, 'source_broker_id', e.target.value)}
                          placeholder="Enter broker ID"
                        />
                      </div>
                      <div className="flex-1 space-y-2">
                        <Label>Target Argument</Label>
                        <Select 
                          value={mapping.target_arg_name} 
                          onValueChange={(value) => updateArgumentMapping(index, 'target_arg_name', value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select argument" />
                          </SelectTrigger>
                          <SelectContent>
                            {functionData?.args.map((arg) => (
                              <SelectItem key={arg.name} value={arg.name}>
                                {arg.name} ({arg.data_type})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => removeArgumentMapping(index)}
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
              No argument mappings configured. Click "Add Mapping" to get started.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default MappingsTab;
