'use client';

import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Copy, RefreshCw } from "lucide-react";
import { flexibleJsonParse, formatJson, JsonConversionResult } from '@/utils/json/json-utils';
import { toast } from 'sonner';
import { DbFunctionNode } from '@/features/workflows/types';
import { EnrichedBroker } from '@/features/workflows/utils/data-flow-manager';

interface AdminTabProps {
  nodeData: DbFunctionNode;
  onNodeUpdate: (nodeData: DbFunctionNode) => void;
  validationErrors?: string[];
  enrichedBrokers: EnrichedBroker[];
}

const AdminTab: React.FC<AdminTabProps> = ({ nodeData, onNodeUpdate, validationErrors = [], enrichedBrokers }) => {
  const [jsonString, setJsonString] = useState('');
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [jsonWarnings, setJsonWarnings] = useState<string[]>([]);
  const [hasJsonChanges, setHasJsonChanges] = useState(false);

  useEffect(() => {
    setJsonString(JSON.stringify(nodeData, null, 2));
    setHasJsonChanges(false);
    setJsonError(null);
    setJsonWarnings([]);
  }, [nodeData]);

  const handleJsonChange = (value: string) => {
    setJsonString(value);
    setHasJsonChanges(true);
    // Don't validate while editing - admins hate that!
    setJsonError(null);
    setJsonWarnings([]);
  };

  const formatAndValidateJson = () => {
    const result: JsonConversionResult = formatJson(jsonString);
    
    if (result.success && result.formattedJson) {
      setJsonString(result.formattedJson);
      setJsonError(null);
      setJsonWarnings(result.warnings || []);
      
      if (result.warnings?.length) {
        toast.info(`JSON formatted with ${result.warnings.length} automatic fixes applied`);
      } else {
        toast.success('JSON formatted successfully');
      }
    } else {
      setJsonError(result.error || 'Failed to format JSON');
      setJsonWarnings(result.warnings || []);
      toast.error('Unable to format JSON: ' + (result.error || 'Unknown error'));
    }
  };

  const applyChanges = () => {
    // First, try to parse the JSON using our flexible parser
    const parseResult = flexibleJsonParse(jsonString);
    
    if (!parseResult.success) {
      setJsonError(parseResult.error || 'Invalid JSON');
      setJsonWarnings(parseResult.warnings || []);
      toast.error('Cannot apply changes: ' + (parseResult.error || 'Invalid JSON'));
      return;
    }

    try {
      const parsedNode = parseResult.data;
      
      // Apply the parsed node data
      onNodeUpdate(parsedNode);
      setHasJsonChanges(false);
      setJsonError(null);
      setJsonWarnings(parseResult.warnings || []);
      
      toast.success('Node updated successfully');
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Validation failed';
      setJsonError(errorMessage);
      toast.error('Validation failed: ' + errorMessage);
    }
  };

  const resetChanges = () => {
    setJsonString(JSON.stringify(nodeData, null, 2));
    setHasJsonChanges(false);
    setJsonError(null);
    setJsonWarnings([]);
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
              {hasJsonChanges && (
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
          {/* Show validation errors from the main system */}
          {validationErrors.length > 0 && (
            <Alert variant="destructive">
              <AlertDescription>
                <div className="space-y-1">
                  <div className="font-medium">Node validation errors:</div>
                  {validationErrors.map((error, index) => (
                    <div key={index} className="text-sm">• {error}</div>
                  ))}
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Show JSON-specific errors */}
          {jsonError && (
            <Alert variant="destructive">
              <AlertDescription>
                {jsonError}
              </AlertDescription>
            </Alert>
          )}
          
          {jsonWarnings.length > 0 && (
            <Alert>
              <AlertDescription>
                <div className="space-y-1">
                  <div className="font-medium">Applied automatic fixes:</div>
                  {jsonWarnings.map((warning, index) => (
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

export default AdminTab; 