'use client';

import { useMemo, useState } from 'react';
import Ajv from 'ajv';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  CheckCircle,
  XCircle,
  Info,
  ChevronDown,
  ChevronRight,
  Copy,
  Check,
  AlertTriangle,
} from 'lucide-react';
import { toast } from 'sonner';
import type { SchemaValidationResult } from '../types';

const ajv = new Ajv({ allErrors: true, strict: false });

export function validateAgainstSchema(
  output: unknown,
  schema: Record<string, unknown>,
): SchemaValidationResult {
  let parsed = output;
  if (typeof output === 'string') {
    try {
      parsed = JSON.parse(output);
    } catch {
      // Not JSON — validate as-is
    }
  }

  const validate = ajv.compile(schema);
  const valid = validate(parsed);

  return {
    valid: !!valid,
    errors: valid
      ? []
      : (validate.errors ?? []).map(
          (e) => `${e.instancePath || '/'}: ${e.message}`,
        ),
  };
}

// ─── Component ──────────────────────────────────────────────────────────────

interface SchemaValidatorProps {
  output: unknown;
  schema: Record<string, unknown> | null;
  success: boolean;
}

export function SchemaValidator({ output, schema, success }: SchemaValidatorProps) {
  const [showSchema, setShowSchema] = useState(false);
  const [showOutput, setShowOutput] = useState(false);
  const [copiedSchema, setCopiedSchema] = useState(false);
  const [copiedOutput, setCopiedOutput] = useState(false);

  const validation = useMemo(() => {
    if (!schema || !success) return null;
    return validateAgainstSchema(output, schema);
  }, [output, schema, success]);

  const copyText = async (text: string, setCopied: (v: boolean) => void) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success('Copied');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy');
    }
  };

  // No schema registered
  if (!schema) {
    return (
      <div className="flex flex-col items-center justify-center py-8 gap-2 text-muted-foreground">
        <Info className="h-6 w-6 opacity-40" />
        <p className="text-xs">No output schema registered for this tool</p>
        <p className="text-[10px]">Schema validation is not available</p>
      </div>
    );
  }

  // Tool failed — skip validation
  if (!success) {
    return (
      <div className="flex flex-col items-center justify-center py-8 gap-2 text-muted-foreground">
        <AlertTriangle className="h-6 w-6 opacity-40" />
        <p className="text-xs">Tool execution failed — schema validation skipped</p>
      </div>
    );
  }

  // No output yet
  if (output === undefined || output === null) {
    return (
      <div className="flex flex-col items-center justify-center py-8 gap-2 text-muted-foreground">
        <Info className="h-6 w-6 opacity-40" />
        <p className="text-xs">Waiting for tool output to validate...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4">
      {/* Pass/fail banner */}
      {validation && (
        <div
          className={`flex items-center gap-2.5 p-3 rounded-lg border ${
            validation.valid
              ? 'bg-success/5 border-success/20'
              : 'bg-destructive/5 border-destructive/20'
          }`}
        >
          {validation.valid ? (
            <CheckCircle className="h-5 w-5 text-success flex-shrink-0" />
          ) : (
            <XCircle className="h-5 w-5 text-destructive flex-shrink-0" />
          )}
          <div>
            <p
              className={`text-sm font-medium ${
                validation.valid ? 'text-success' : 'text-destructive'
              }`}
            >
              {validation.valid
                ? 'Output matches registered schema'
                : 'Output does NOT match registered schema'}
            </p>
            {!validation.valid && (
              <p className="text-xs text-muted-foreground mt-0.5">
                {validation.errors.length} validation error
                {validation.errors.length !== 1 ? 's' : ''}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Validation errors */}
      {validation && !validation.valid && (
        <div className="space-y-1">
          <span className="text-xs font-semibold">Validation Errors</span>
          <div className="space-y-1 rounded-lg border border-destructive/20 bg-destructive/5 p-2">
            {validation.errors.map((err, idx) => (
              <div key={idx} className="flex items-start gap-2 text-xs">
                <XCircle className="h-3 w-3 text-destructive flex-shrink-0 mt-0.5" />
                <span className="font-mono text-destructive">{err}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Schema viewer */}
      <Collapsible open={showSchema} onOpenChange={setShowSchema}>
        <CollapsibleTrigger className="flex items-center gap-2 text-xs font-semibold cursor-pointer hover:text-primary transition-colors">
          {showSchema ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
          Output Schema
          <Badge variant="outline" className="text-[9px] px-1 py-0 font-mono">
            JSON Schema
          </Badge>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="mt-1.5 rounded border border-border bg-muted/30 p-2 relative">
            <Button
              size="sm"
              variant="ghost"
              className="absolute top-1 right-1 h-6 w-6 p-0"
              onClick={() => copyText(JSON.stringify(schema, null, 2), setCopiedSchema)}
            >
              {copiedSchema ? (
                <Check className="h-3 w-3 text-success" />
              ) : (
                <Copy className="h-3 w-3 text-muted-foreground" />
              )}
            </Button>
            <pre className="text-[10px] font-mono whitespace-pre-wrap text-foreground/70 max-h-[300px] overflow-y-auto pr-6">
              {JSON.stringify(schema, null, 2)}
            </pre>
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Output viewer */}
      <Collapsible open={showOutput} onOpenChange={setShowOutput}>
        <CollapsibleTrigger className="flex items-center gap-2 text-xs font-semibold cursor-pointer hover:text-primary transition-colors">
          {showOutput ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
          Raw Output
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="mt-1.5 rounded border border-border bg-muted/30 p-2 relative">
            <Button
              size="sm"
              variant="ghost"
              className="absolute top-1 right-1 h-6 w-6 p-0"
              onClick={() =>
                copyText(
                  typeof output === 'string' ? output : JSON.stringify(output, null, 2),
                  setCopiedOutput,
                )
              }
            >
              {copiedOutput ? (
                <Check className="h-3 w-3 text-success" />
              ) : (
                <Copy className="h-3 w-3 text-muted-foreground" />
              )}
            </Button>
            <pre className="text-[10px] font-mono whitespace-pre-wrap text-foreground/70 max-h-[300px] overflow-y-auto pr-6">
              {typeof output === 'string' ? output : JSON.stringify(output, null, 2)}
            </pre>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
