'use client';

import React from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Trash2 } from "lucide-react";
import { TabComponentProps } from '@/features/workflows/types';
import {
    addReturnBrokerOverride,
    updateReturnBrokerOverride,
    removeReturnBrokerOverride,
    hasReturnBrokerOverrides,
} from "./utils/broker-utils";

const BrokersTab: React.FC<TabComponentProps> = ({ node, onNodeUpdate }) => {
    return (
        <div className="mt-4 space-y-6">
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">Return Broker Overrides</CardTitle>
                        <Button onClick={() => addReturnBrokerOverride(node, onNodeUpdate)} size="sm">
                            <Plus className="h-4 w-4 mr-2" />
                            Add Override
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    {hasReturnBrokerOverrides(node) ? (
                        <div className="space-y-3">
                            {node.return_broker_overrides.map((brokerId: string, index: number) => (
                                <Card key={index} className="border-border">
                                    <CardContent className="p-4">
                                        <div className="flex items-center gap-4">
                                            <div className="flex-1 space-y-2">
                                                <Label>Broker ID</Label>
                                                <Input
                                                    value={brokerId}
                                                    onChange={(e) => updateReturnBrokerOverride(node, onNodeUpdate, index, e.target.value)}
                                                    placeholder="Enter broker ID"
                                                />
                                            </div>
                                            <Button
                                                variant="outline"
                                                size="icon"
                                                onClick={() => removeReturnBrokerOverride(node, onNodeUpdate, index)}
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
