'use client';

import React, { useState } from 'react';
import { SqlFunction } from '@/types/sql-functions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { AlertCircle, Save, X } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface SqlFunctionFormProps {
  functionData?: SqlFunction;
  onSubmit: (definition: string) => Promise<boolean>;
  onCancel: () => void;
}

export default function SqlFunctionForm({
  functionData,
  onSubmit,
  onCancel,
}: SqlFunctionFormProps) {
  const isEdit = !!functionData;

  const [name, setName] = useState(functionData?.name || '');
  const [schema, setSchema] = useState(functionData?.schema || 'public');
  const [returnType, setReturnType] = useState(functionData?.returns || 'void');
  const [arguments_, setArguments] = useState(functionData?.arguments || '');
  const [definition, setDefinition] = useState(functionData?.definition || '');
  const [securityType, setSecurityType] = useState<'SECURITY DEFINER' | 'SECURITY INVOKER'>(
    functionData?.security_type || 'SECURITY INVOKER'
  );
  const [language, setLanguage] = useState(functionData?.language || 'plpgsql');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);

  const generateFunctionDefinition = () => {
    if (!name) { setError('Function name is required'); return null; }
    if (!returnType) { setError('Return type is required'); return null; }

    let sql = '';
    if (isEdit) {
      sql += `DROP FUNCTION IF EXISTS ${schema}.${name}(${functionData?.arguments});\n\n`;
    }
    sql += `CREATE OR REPLACE FUNCTION ${schema}.${name}(${arguments_})\n`;
    sql += `RETURNS ${returnType}\n`;
    sql += `LANGUAGE ${language}\n`;
    sql += `${securityType}\n`;
    sql += `AS $function$\n`;
    sql += `${definition}\n`;
    sql += `$function$;\n`;
    return sql;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const sql = generateFunctionDefinition();
    if (!sql) { setLoading(false); return; }
    try {
      const success = await onSubmit(sql);
      if (success) {
        setShowSuccessMessage(true);
        setTimeout(() => setShowSuccessMessage(false), 3000);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred while saving the SQL function');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col h-full">
      {/* Fields area */}
      <div className="shrink-0 px-4 pt-3 pb-2 space-y-1.5 border-b border-slate-200 dark:border-slate-700">
        {error && (
          <Alert variant="destructive" className="py-2 bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-300 border-red-200 dark:border-red-800 mb-2">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle className="text-sm">Error</AlertTitle>
            <AlertDescription className="text-xs">{error}</AlertDescription>
          </Alert>
        )}
        {showSuccessMessage && (
          <Alert className="py-2 bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-300 border-green-200 dark:border-green-800 mb-2">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle className="text-sm">Success</AlertTitle>
            <AlertDescription className="text-xs">
              {isEdit ? 'Function updated successfully' : 'Function created successfully'}
            </AlertDescription>
          </Alert>
        )}

        {/* Inline field rows */}
        <div className="grid grid-cols-2 gap-x-6 gap-y-1.5">
          {/* Name */}
          <div className="flex items-center gap-3">
            <label htmlFor="name" className="text-xs font-medium text-slate-600 dark:text-slate-400 w-24 shrink-0 text-right">
              Name <span className="text-red-500">*</span>
            </label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="my_function"
              required
              className="h-7 text-sm bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 border-slate-300 dark:border-slate-700"
            />
          </div>

          {/* Schema */}
          <div className="flex items-center gap-3">
            <label htmlFor="schema" className="text-xs font-medium text-slate-600 dark:text-slate-400 w-24 shrink-0 text-right">
              Schema
            </label>
            <Input
              id="schema"
              value={schema}
              onChange={(e) => setSchema(e.target.value)}
              placeholder="public"
              className="h-7 text-sm bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 border-slate-300 dark:border-slate-700"
            />
          </div>

          {/* Return Type */}
          <div className="flex items-center gap-3">
            <label htmlFor="returnType" className="text-xs font-medium text-slate-600 dark:text-slate-400 w-24 shrink-0 text-right">
              Return Type <span className="text-red-500">*</span>
            </label>
            <Input
              id="returnType"
              value={returnType}
              onChange={(e) => setReturnType(e.target.value)}
              placeholder="void, integer, text, json…"
              required
              className="h-7 text-sm bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 border-slate-300 dark:border-slate-700"
            />
          </div>

          {/* Arguments */}
          <div className="flex items-center gap-3">
            <label htmlFor="arguments" className="text-xs font-medium text-slate-600 dark:text-slate-400 w-24 shrink-0 text-right">
              Arguments
            </label>
            <Input
              id="arguments"
              value={arguments_}
              onChange={(e) => setArguments(e.target.value)}
              placeholder="arg1 type1, arg2 type2, …"
              className="h-7 text-sm bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 border-slate-300 dark:border-slate-700"
            />
          </div>

          {/* Language */}
          <div className="flex items-center gap-3">
            <label htmlFor="language" className="text-xs font-medium text-slate-600 dark:text-slate-400 w-24 shrink-0 text-right">
              Language
            </label>
            <Select value={language} onValueChange={setLanguage}>
              <SelectTrigger className="h-7 text-sm bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 border-slate-300 dark:border-slate-700">
                <SelectValue placeholder="Select language" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="plpgsql">PL/pgSQL</SelectItem>
                <SelectItem value="sql">SQL</SelectItem>
                <SelectItem value="plv8">PLV8 (JavaScript)</SelectItem>
                <SelectItem value="plpython3u">PL/Python</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Security Type */}
          <div className="flex items-center gap-3">
            <label htmlFor="securityType" className="text-xs font-medium text-slate-600 dark:text-slate-400 w-24 shrink-0 text-right">
              Security
            </label>
            <Select value={securityType} onValueChange={(v) => setSecurityType(v as 'SECURITY DEFINER' | 'SECURITY INVOKER')}>
              <SelectTrigger className="h-7 text-sm bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 border-slate-300 dark:border-slate-700">
                <SelectValue placeholder="Security type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="SECURITY INVOKER">Security Invoker</SelectItem>
                <SelectItem value="SECURITY DEFINER">Security Definer</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Definition editor — fills remaining height */}
      <div className="flex flex-col flex-1 min-h-0">
        <div className="flex items-center justify-between px-4 py-1.5 bg-slate-800 dark:bg-slate-950 border-b border-slate-700 shrink-0">
          <span className="text-xs text-slate-400 font-medium">Function Definition <span className="text-red-400">*</span></span>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onCancel}
              disabled={loading}
              className="h-6 text-xs text-slate-400 hover:text-slate-200 hover:bg-slate-700 px-2"
            >
              <X className="h-3 w-3 mr-1" />
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              size="sm"
              className="h-6 text-xs bg-slate-600 hover:bg-slate-500 text-white px-3"
            >
              <Save className="h-3 w-3 mr-1" />
              {isEdit ? 'Update Function' : 'Create Function'}
            </Button>
          </div>
        </div>
        <Textarea
          id="definition"
          value={definition}
          onChange={(e) => setDefinition(e.target.value)}
          placeholder={`BEGIN\n  -- Your function code here\n  RETURN;\nEND;`}
          required
          className="flex-1 font-mono text-sm bg-slate-950 text-slate-100 border-0 rounded-none resize-none focus-visible:ring-0 focus-visible:ring-offset-0 min-h-0"
        />
      </div>
    </form>
  );
}
