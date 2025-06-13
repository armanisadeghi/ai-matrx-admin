'use client';

import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Copy, RefreshCw } from "lucide-react";
import { TabComponentProps } from '@/features/workflows/types';
import {
    NodeObjectState,
    initializeJsonFromNode,
    handleJsonChange,
    formatAndValidateJson,
    applyChanges,
    resetChanges,
    copyToClipboard,
} from "./utils/node-object-utils";

const NodeObjectTab: React.FC<TabComponentProps> = ({ nodeData, onNodeUpdate }) => {
    const [state, setState] = useState<NodeObjectState>({
        jsonString: '',
        error: null,
        warnings: [],
        hasChanges: false
    });

    const updateState = (updates: Partial<NodeObjectState>) => {
        setState(prev => ({ ...prev, ...updates }));
    };

    useEffect(() => {
        const jsonString = initializeJsonFromNode(nodeData);
        setState({
            jsonString,
            hasChanges: false,
            error: null,
            warnings: []
        });
    }, [nodeData]);

    const handleJsonChangeWrapper = (value: string) => {
        handleJsonChange(value, updateState);
    };

    const formatAndValidateJsonWrapper = () => {
        formatAndValidateJson(state.jsonString, updateState);
    };

    const applyChangesWrapper = () => {
        applyChanges(state.jsonString, onNodeUpdate, updateState);
    };

    const resetChangesWrapper = () => {
        resetChanges(nodeData, updateState);
    };

    const copyToClipboardWrapper = async () => {
        await copyToClipboard(state.jsonString);
    };

    return (
        <div className="flex flex-col h-full">
            <Card className="flex-1 flex flex-col">
                <CardHeader className="pb-4">
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">Node Object (JSON)</CardTitle>
                        <div className="flex gap-2">
                            <Button onClick={copyToClipboardWrapper} size="sm" variant="outline">
                                <Copy className="h-4 w-4 mr-2" />
                                Copy
                            </Button>
                            <Button onClick={formatAndValidateJsonWrapper} size="sm" variant="outline">
                                <RefreshCw className="h-4 w-4 mr-2" />
                                Format
                            </Button>
                            {state.hasChanges && (
                                <>
                                    <Button onClick={resetChangesWrapper} size="sm" variant="outline">
                                        Reset
                                    </Button>
                                    <Button 
                                        onClick={applyChangesWrapper} 
                                        size="sm"
                                    >
                                        Apply Changes
                                    </Button>
                                </>
                            )}
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col space-y-4">
                    {state.error && (
                        <Alert variant="destructive">
                            <AlertDescription>
                                {state.error}
                            </AlertDescription>
                        </Alert>
                    )}
                    
                    {state.warnings.length > 0 && (
                        <Alert>
                            <AlertDescription>
                                <div className="space-y-1">
                                    <div className="font-medium">Applied automatic fixes:</div>
                                    {state.warnings.map((warning, index) => (
                                        <div key={index} className="text-sm">• {warning}</div>
                                    ))}
                                </div>
                            </AlertDescription>
                        </Alert>
                    )}

                    <div className="flex-1 flex flex-col">
                        <textarea
                            value={state.jsonString}
                            onChange={(e) => handleJsonChangeWrapper(e.target.value)}
                            className="flex-1 w-full p-4 font-mono text-sm bg-muted border border-border rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
                            placeholder="Node JSON will appear here..."
                            spellCheck={false}
                            style={{ minHeight: '800px' }}
                        />
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

export default NodeObjectTab;
