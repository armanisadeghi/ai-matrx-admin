/**
 * ConvertToBuiltinModal
 * 
 * Simple modal for converting a user prompt to a prompt builtin.
 * Replaces the old ConvertToSystemPromptModal with the new prompt-builtins system.
 */

'use client';

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, AlertCircle, CheckCircle2, FileText } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { toast } from '@/lib/toast-service';

interface ConvertToBuiltinModalProps {
  isOpen: boolean;
  onClose: () => void;
  promptId: string;
  promptName: string;
  onSuccess?: () => void;
}

export function ConvertToBuiltinModal({
  isOpen,
  onClose,
  promptId,
  promptName,
  onSuccess,
}: ConvertToBuiltinModalProps) {
  const router = useRouter();
  const [isConverting, setIsConverting] = useState(false);
  const [error, setError] = useState('');

  const handleConvert = async () => {
    setIsConverting(true);
    setError('');

    try {
      // Call the conversion API
      const response = await fetch(`/api/admin/prompt-builtins/convert-from-prompt`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt_id: promptId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Conversion failed (${response.status})`);
      }

      const data = await response.json();
      
      toast.success(`"${promptName}" converted to builtin successfully!`);
      
      // Success
      onSuccess?.();
      onClose();
      
      // Navigate to admin page to configure the builtin
      router.push('/administration/prompt-builtins?tab=builtins');
    } catch (err: any) {
      console.error('Conversion error:', err);
      setError(err.message || 'An unexpected error occurred');
    } finally {
      setIsConverting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent 
        className="max-w-md"
        onPointerDownOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>Convert to Prompt Builtin</DialogTitle>
          <DialogDescription>
            Make this prompt available system-wide for shortcuts, context menus, buttons, and cards.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Info Alert */}
          <Alert>
            <FileText className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-2">
                <p className="font-semibold">What happens next:</p>
                <ol className="text-sm space-y-1 ml-4 list-decimal">
                  <li>This prompt will be converted to a <strong>Prompt Builtin</strong></li>
                  <li>You'll be redirected to the admin panel</li>
                  <li>Configure shortcuts to make it available in the app</li>
                  <li>Map scopes and placement types as needed</li>
                </ol>
              </div>
            </AlertDescription>
          </Alert>

          {/* Prompt Info */}
          <div className="p-3 bg-muted/50 rounded-md">
            <p className="text-sm">
              <span className="font-medium">Prompt:</span>
              <span className="ml-2">{promptName}</span>
            </p>
          </div>

          {/* Error Display */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Success Note */}
          <Alert>
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-sm">
              <strong>No strict variable matching required!</strong> The new system allows 
              you to map scopes flexibly in the admin panel.
            </AlertDescription>
          </Alert>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isConverting}
          >
            Cancel
          </Button>
          <Button onClick={handleConvert} disabled={isConverting}>
            {isConverting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Converting...
              </>
            ) : (
              'Convert to Builtin'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

