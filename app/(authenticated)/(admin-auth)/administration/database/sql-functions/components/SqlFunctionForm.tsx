'use client';

import React, { useState } from 'react';
import { SqlFunction } from '@/types/sql-functions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  
  // Initialize form state
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
  
  // Generate the complete SQL function definition
  const generateFunctionDefinition = () => {
    if (!name) {
      setError('Function name is required');
      return null;
    }
    
    if (!returnType) {
      setError('Return type is required');
      return null;
    }
    
    // If it's an edit, we want to include DROP FUNCTION IF EXISTS first
    let sql = '';
    if (isEdit) {
      sql += `DROP FUNCTION IF EXISTS ${schema}.${name}(${functionData?.arguments});\n\n`;
    }
    
    // Create the function definition
    sql += `CREATE OR REPLACE FUNCTION ${schema}.${name}(${arguments_})\n`;
    sql += `RETURNS ${returnType}\n`;
    sql += `LANGUAGE ${language}\n`;
    sql += `${securityType}\n`;
    sql += `AS $function$\n`;
    sql += `${definition}\n`;
    sql += `$function$;\n`;
    
    return sql;
  };
  
  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    const sql = generateFunctionDefinition();
    if (!sql) {
      setLoading(false);
      return;
    }
    
    try {
      const success = await onSubmit(sql);
      if (success) {
        setShowSuccessMessage(true);
        setTimeout(() => {
          setShowSuccessMessage(false);
        }, 3000);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred while saving the SQL function');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <Alert variant="destructive" className="bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-300 border-red-200 dark:border-red-800">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      {showSuccessMessage && (
        <Alert className="bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-300 border-green-200 dark:border-green-800">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Success</AlertTitle>
          <AlertDescription>
            {isEdit ? 'Function updated successfully' : 'Function created successfully'}
          </AlertDescription>
        </Alert>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div>
            <Label htmlFor="name" className="text-slate-700 dark:text-slate-300">
              Function Name *
            </Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="my_function"
              required
              className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 border-slate-300 dark:border-slate-700"
            />
          </div>
          
          <div>
            <Label htmlFor="schema" className="text-slate-700 dark:text-slate-300">
              Schema
            </Label>
            <Input
              id="schema"
              value={schema}
              onChange={(e) => setSchema(e.target.value)}
              placeholder="public"
              className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 border-slate-300 dark:border-slate-700"
            />
          </div>
          
          <div>
            <Label htmlFor="returnType" className="text-slate-700 dark:text-slate-300">
              Return Type *
            </Label>
            <Input
              id="returnType"
              value={returnType}
              onChange={(e) => setReturnType(e.target.value)}
              placeholder="void, integer, text, json, etc."
              required
              className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 border-slate-300 dark:border-slate-700"
            />
          </div>
          
          <div>
            <Label htmlFor="arguments" className="text-slate-700 dark:text-slate-300">
              Arguments
            </Label>
            <Input
              id="arguments"
              value={arguments_}
              onChange={(e) => setArguments(e.target.value)}
              placeholder="arg1 type1, arg2 type2, ..."
              className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 border-slate-300 dark:border-slate-700"
            />
          </div>
        </div>
        
        <div className="space-y-4">
          <div>
            <Label htmlFor="language" className="text-slate-700 dark:text-slate-300">
              Language
            </Label>
            <Select value={language} onValueChange={(value) => setLanguage(value)}>
              <SelectTrigger className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 border-slate-300 dark:border-slate-700">
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
          
          <div>
            <Label htmlFor="securityType" className="text-slate-700 dark:text-slate-300">
              Security Type
            </Label>
            <Select 
              value={securityType} 
              onValueChange={(value) => setSecurityType(value as 'SECURITY DEFINER' | 'SECURITY INVOKER')}
            >
              <SelectTrigger className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 border-slate-300 dark:border-slate-700">
                <SelectValue placeholder="Select security type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="SECURITY INVOKER">Security Invoker</SelectItem>
                <SelectItem value="SECURITY DEFINER">Security Definer</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
      
      <div>
        <Label htmlFor="definition" className="text-slate-700 dark:text-slate-300">
          Function Definition *
        </Label>
        <div className="border border-slate-300 dark:border-slate-700 rounded-md overflow-hidden">
          <Textarea
            id="definition"
            value={definition}
            onChange={(e) => setDefinition(e.target.value)}
            placeholder={`BEGIN\n  -- Your function code here\n  RETURN;\nEND;`}
            required
            className="font-mono h-80 bg-slate-950 text-slate-100 border-0 resize-none focus-visible:ring-0 focus-visible:ring-offset-0"
          />
        </div>
      </div>
      
      <div className="flex justify-end space-x-3">
        <Button 
          type="button" 
          variant="outline" 
          onClick={onCancel}
          disabled={loading}
          className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
        >
          <X className="h-4 w-4 mr-2" />
          Cancel
        </Button>
        <Button 
          type="submit" 
          disabled={loading}
          className="bg-slate-700 hover:bg-slate-600 text-white dark:bg-slate-700 dark:hover:bg-slate-600"
        >
          <Save className="h-4 w-4 mr-2" />
          {isEdit ? 'Update Function' : 'Create Function'}
        </Button>
      </div>
    </form>
  );
} 