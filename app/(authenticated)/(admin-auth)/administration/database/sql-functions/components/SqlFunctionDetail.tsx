'use client';

import React, { useState } from 'react';
import { SqlFunction } from '@/types/sql-functions';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { X, Edit, Trash2, Code, ShieldAlert, Shield, Calendar, User, Copy, Check } from 'lucide-react';
import SyntaxHighlighter from '@/app/(authenticated)/admin/components/database-admin/SyntaxHighlighter';

interface SqlFunctionDetailProps {
  func: SqlFunction;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export default function SqlFunctionDetail({ func, onClose, onEdit, onDelete }: SqlFunctionDetailProps) {
  const [isCopied, setIsCopied] = useState(false);

  const handleCopyCode = () => {
    if (func.definition) {
      navigator.clipboard.writeText(func.definition);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden bg-white dark:bg-slate-900">
      {/* Header bar */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <Code className="h-4 w-4 text-slate-500 dark:text-slate-400 shrink-0" />
          <span className="font-mono text-sm font-semibold text-slate-800 dark:text-slate-200 truncate">
            {func.schema}.{func.name}
          </span>
          <div className="flex items-center gap-1.5 flex-wrap">
            <Badge variant="outline" className="text-xs py-0 border-slate-300 dark:border-slate-600">
              {func.returns}
            </Badge>
            {func.security_type === 'SECURITY DEFINER' ? (
              <Badge className="text-xs py-0 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-300 border border-green-300 dark:border-green-700">
                <ShieldAlert className="h-3 w-3 mr-1" />Security Definer
              </Badge>
            ) : (
              <Badge className="text-xs py-0 bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-300 border border-yellow-300 dark:border-yellow-700">
                <Shield className="h-3 w-3 mr-1" />Security Invoker
              </Badge>
            )}
            {func.language && (
              <Badge className="text-xs py-0 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-300 border border-blue-300 dark:border-blue-700">
                {func.language}
              </Badge>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0 ml-3">
          <Button variant="default" size="sm" onClick={onEdit} className="h-7 text-xs bg-slate-700 hover:bg-slate-600 text-white">
            <Edit className="h-3.5 w-3.5 mr-1" />Edit
          </Button>
          <Button variant="destructive" size="sm" onClick={onDelete} className="h-7 text-xs">
            <Trash2 className="h-3.5 w-3.5 mr-1" />Delete
          </Button>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-7 w-7 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200">
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Two-column body */}
      <div className="flex-1 min-h-0 grid grid-cols-[260px_1fr] overflow-hidden">

        {/* Left: metadata */}
        <div className="overflow-y-auto border-r border-slate-200 dark:border-slate-700 p-3 space-y-3">
          <div>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Signature</p>
            <pre className="bg-slate-50 dark:bg-slate-800 px-2 py-1.5 rounded text-xs text-slate-800 dark:text-slate-200 whitespace-pre-wrap break-all">
              {func.schema}.{func.name}({func.arguments})
            </pre>
          </div>

          <div>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Arguments</p>
            {func.arguments ? (
              <div className="bg-slate-50 dark:bg-slate-800 px-2 py-1.5 rounded">
                <code className="text-xs text-slate-800 dark:text-slate-200 break-all">{func.arguments}</code>
              </div>
            ) : (
              <p className="text-xs text-slate-400 dark:text-slate-500 italic">None</p>
            )}
          </div>

          <div>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Return Type</p>
            <div className="bg-slate-50 dark:bg-slate-800 px-2 py-1.5 rounded">
              <code className="text-xs text-slate-800 dark:text-slate-200">{func.returns}</code>
            </div>
          </div>

          {func.description && (
            <div>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Description</p>
              <div className="bg-slate-50 dark:bg-slate-800 px-2 py-1.5 rounded text-xs text-slate-800 dark:text-slate-200">
                {func.description}
              </div>
            </div>
          )}

          <div className="space-y-1.5 pt-1">
            {func.owner && (
              <div className="flex items-center gap-1.5">
                <User className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                <span className="text-xs text-slate-500 dark:text-slate-400">Owner:</span>
                <span className="text-xs text-slate-700 dark:text-slate-300">{func.owner}</span>
              </div>
            )}
            {func.created && (
              <div className="flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                <span className="text-xs text-slate-500 dark:text-slate-400">Created:</span>
                <span className="text-xs text-slate-700 dark:text-slate-300">{new Date(func.created).toLocaleString()}</span>
              </div>
            )}
            {func.last_modified && (
              <div className="flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                <span className="text-xs text-slate-500 dark:text-slate-400">Modified:</span>
                <span className="text-xs text-slate-700 dark:text-slate-300">{new Date(func.last_modified).toLocaleString()}</span>
              </div>
            )}
          </div>
        </div>

        {/* Right: syntax-highlighted source code */}
        <div className="flex flex-col min-h-0 overflow-hidden">
          {/* Code header */}
          <div className="flex items-center justify-between px-3 py-1.5 bg-slate-800 dark:bg-slate-950 border-b border-slate-700 shrink-0">
            <span className="text-xs text-slate-400 font-medium">Function Definition</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCopyCode}
              className="h-6 text-xs text-slate-400 hover:text-slate-200 hover:bg-slate-700 px-2"
            >
              {isCopied ? <><Check className="h-3 w-3 mr-1" />Copied</> : <><Copy className="h-3 w-3 mr-1" />Copy</>}
            </Button>
          </div>

          {/* Syntax highlighted code — fills remaining height */}
          <div className="flex-1 overflow-auto bg-slate-950">
            {func.definition ? (
              <SyntaxHighlighter code={func.definition} language={func.language || 'sql'} />
            ) : (
              <p className="p-4 text-xs text-slate-500 italic">Source code not available</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
