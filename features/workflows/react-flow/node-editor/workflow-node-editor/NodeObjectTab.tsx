'use client';

import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Copy, RefreshCw } from "lucide-react";
import { BaseNode, TabComponentProps } from '@/features/workflows/types';
import { flexibleJsonParse, formatJson, JsonConversionResult } from '@/utils/json-utils';
import { toast } from 'sonner';
import { validateNodeUpdate } from '@/features/workflows/utils/node-utils';

const NodeObjectTab: React.FC<TabComponentProps> = ({ node, onNodeUpdate }) => {
  const [jsonString, setJsonString] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    setJsonString(JSON.stringify(node, null, 2));
    setHasChanges(false);
    setError(null);
    setWarnings([]);
  }, [node]);

  const handleJsonChange = (value: string) => {
    setJsonString(value);
    setHasChanges(true);
    // Don't validate while editing - admins hate that!
    setError(null);
    setWarnings([]);
  };

  const formatAndValidateJson = () => {
    const result: JsonConversionResult = formatJson(jsonString);
    
    if (result.success && result.formattedJson) {
      setJsonString(result.formattedJson);
      setError(null);
      setWarnings(result.warnings || []);
      
      if (result.warnings?.length) {
        toast.info(`JSON formatted with ${result.warnings.length} automatic fixes applied`);
      } else {
        toast.success('JSON formatted successfully');
      }
    } else {
      setError(result.error || 'Failed to format JSON');
      setWarnings(result.warnings || []);
      toast.error('Unable to format JSON: ' + (result.error || 'Unknown error'));
    }
  };

  const applyChanges = () => {
    // First, try to parse the JSON using our flexible parser
    const parseResult = flexibleJsonParse(jsonString);
    
    if (!parseResult.success) {
      setError(parseResult.error || 'Invalid JSON');
      setWarnings(parseResult.warnings || []);
      toast.error('Cannot apply changes: ' + (parseResult.error || 'Invalid JSON'));
      return;
    }

    try {
      const parsedNode = parseResult.data as BaseNode;
      
      // Validate using our custom node validation
      validateNodeUpdate(parsedNode);
      
      // Apply the changes
      onNodeUpdate(parsedNode);
      setHasChanges(false);
      setError(null);
      setWarnings(parseResult.warnings || []);
      
      toast.success('Node updated successfully');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Validation failed';
      setError(errorMessage);
      toast.error('Validation failed: ' + errorMessage);
    }
  };

  const resetChanges = () => {
    setJsonString(JSON.stringify(node, null, 2));
    setHasChanges(false);
    setError(null);
    setWarnings([]);
    toast.info('Changes reset');
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(jsonString);
      toast.success('JSON copied to clipboard');
    } catch (err) {
      toast.error('Failed to copy to clipboard');
    }
  };

  return (
    <div className="flex flex-col h-full">
      <Card className="flex-1 flex flex-col">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Node Object (JSON)</CardTitle>
            <div className="flex gap-2">
              <Button onClick={copyToClipboard} size="sm" variant="outline">
                <Copy className="h-4 w-4 mr-2" />
                Copy
              </Button>
              <Button onClick={formatAndValidateJson} size="sm" variant="outline">
                <RefreshCw className="h-4 w-4 mr-2" />
                Format
              </Button>
              {hasChanges && (
                <>
                  <Button onClick={resetChanges} size="sm" variant="outline">
                    Reset
                  </Button>
                  <Button 
                    onClick={applyChanges} 
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
          {error && (
            <Alert variant="destructive">
              <AlertDescription>
                {error}
              </AlertDescription>
            </Alert>
          )}
          
          {warnings.length > 0 && (
            <Alert>
              <AlertDescription>
                <div className="space-y-1">
                  <div className="font-medium">Applied automatic fixes:</div>
                  {warnings.map((warning, index) => (
                    <div key={index} className="text-sm">• {warning}</div>
                  ))}
                </div>
              </AlertDescription>
            </Alert>
          )}

          <div className="flex-1 flex flex-col">
            <textarea
              value={jsonString}
              onChange={(e) => handleJsonChange(e.target.value)}
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
