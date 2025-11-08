'use client';

import React, { useState, useRef, useEffect } from 'react';
import { SqlFunction } from '@/types/sql-functions';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  X, 
  Edit, 
  Trash2, 
  Code, 
  ShieldAlert, 
  Shield, 
  Calendar, 
  User, 
  Copy, 
  Maximize2, 
  Minimize2,
  Check
} from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';

interface SqlFunctionDetailProps {
  func: SqlFunction;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export default function SqlFunctionDetail({ func, onClose, onEdit, onDelete }: SqlFunctionDetailProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState('details');
  const [isCopied, setIsCopied] = useState(false);
  const [codeHeight, setCodeHeight] = useState<number | null>(null);
  const codeRef = useRef<HTMLPreElement>(null);

  // Measure code height on mount and when definition changes
  useEffect(() => {
    if (codeRef.current && activeTab === 'source') {
      // Add a small buffer for better appearance
      setCodeHeight(codeRef.current.scrollHeight + 20);
    }
  }, [activeTab, func.definition]);

  // Handle copy code button
  const handleCopyCode = () => {
    if (func.definition) {
      navigator.clipboard.writeText(func.definition);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }
  };

  // Toggle expanded view
  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };

  // Handle tab change
  const handleTabChange = (value: string) => {
    setActiveTab(value);
    // Reset code height when switching to source tab
    if (value === 'source' && codeRef.current) {
      setTimeout(() => {
        if (codeRef.current) {
          setCodeHeight(codeRef.current.scrollHeight + 20);
        }
      }, 0);
    }
  };

  return (
    <Card className={`w-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 transition-all duration-300 overflow-hidden ${
      isExpanded ? 'fixed inset-4 z-50 overflow-auto' : 'relative'
    }`}>
      <CardHeader className="pb-2 border-b border-slate-200 dark:border-slate-700">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <Code className="h-5 w-5 text-slate-700 dark:text-slate-300" />
            <CardTitle className="text-xl text-slate-800 dark:text-slate-200">
              {func.schema}.{func.name}
            </CardTitle>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleExpanded}
              className="text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
            >
              {isExpanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <div className="flex items-center space-x-2 mt-1">
          <Badge variant="outline" className="text-slate-600 dark:text-slate-400 border-slate-300 dark:border-slate-700">
            {func.returns}
          </Badge>
          {func.security_type === 'SECURITY DEFINER' ? (
            <Badge className="bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-300 border-green-200 dark:border-green-800">
              <ShieldAlert className="h-3 w-3" /> Security Definer
            </Badge>
          ) : (
            <Badge className="bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800">
              <Shield className="h-3 w-3" /> Security Invoker
            </Badge>
          )}
          {func.language && (
            <Badge className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-800">
              {func.language}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <Tabs 
          defaultValue="details" 
          value={activeTab} 
          onValueChange={handleTabChange} 
          className="w-full"
        >
          <TabsList className="w-full justify-start px-4 pt-2 bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
            <TabsTrigger 
              value="details" 
              className="text-slate-600 dark:text-slate-400 data-[state=active]:text-slate-900 dark:data-[state=active]:text-slate-100"
            >
              Details
            </TabsTrigger>
            <TabsTrigger 
              value="source" 
              className="text-slate-600 dark:text-slate-400 data-[state=active]:text-slate-900 dark:data-[state=active]:text-slate-100"
            >
              Source Code
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="details" className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">Function Signature</h3>
                <pre className="bg-slate-50 dark:bg-slate-800 p-3 rounded-md text-slate-800 dark:text-slate-200 text-sm overflow-x-auto">
                  {func.schema}.{func.name}({func.arguments})
                </pre>
                
                <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-4 mb-1">Arguments</h3>
                {func.arguments ? (
                  <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded-md">
                    <code className="text-sm text-slate-800 dark:text-slate-200">{func.arguments}</code>
                  </div>
                ) : (
                  <div className="text-slate-500 dark:text-slate-400 text-sm">No arguments</div>
                )}
                
                <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-4 mb-1">Return Type</h3>
                <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded-md">
                  <code className="text-sm text-slate-800 dark:text-slate-200">{func.returns}</code>
                </div>
              </div>
              
              <div>
                {func.description && (
                  <>
                    <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">Description</h3>
                    <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded-md text-slate-800 dark:text-slate-200 text-sm mb-4">
                      {func.description}
                    </div>
                  </>
                )}
                
                <div className="space-y-2">
                  {func.owner && (
                    <div className="flex items-center">
                      <User className="h-4 w-4 text-slate-500 dark:text-slate-400 mr-2" />
                      <span className="text-sm text-slate-600 dark:text-slate-400">Owner: </span>
                      <span className="text-sm text-slate-800 dark:text-slate-200 ml-1">{func.owner}</span>
                    </div>
                  )}
                  
                  {func.created && (
                    <div className="flex items-center">
                      <Calendar className="h-4 w-4 text-slate-500 dark:text-slate-400 mr-2" />
                      <span className="text-sm text-slate-600 dark:text-slate-400">Created: </span>
                      <span className="text-sm text-slate-800 dark:text-slate-200 ml-1">
                        {new Date(func.created).toLocaleString()}
                      </span>
                    </div>
                  )}
                  
                  {func.last_modified && (
                    <div className="flex items-center">
                      <Calendar className="h-4 w-4 text-slate-500 dark:text-slate-400 mr-2" />
                      <span className="text-sm text-slate-600 dark:text-slate-400">Last Modified: </span>
                      <span className="text-sm text-slate-800 dark:text-slate-200 ml-1">
                        {new Date(func.last_modified).toLocaleString()}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="source" className="p-0">
            <div className="flex justify-end p-2 bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleCopyCode}
                className="text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 border-slate-300 dark:border-slate-600"
              >
                {isCopied ? (
                  <>
                    <Check className="h-4 w-4" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4" />
                    Copy Code
                  </>
                )}
              </Button>
            </div>
            <div className={`overflow-auto ${isExpanded ? 'h-[calc(100vh-280px)]' : ''}`}>
              <pre 
                ref={codeRef}
                className="p-4 text-sm font-mono bg-slate-950 text-slate-100 rounded-b-md whitespace-pre overflow-x-auto"
                style={!isExpanded && codeHeight ? { minHeight: `${codeHeight}px` } : {}}
              >
                {func.definition || 'Source code not available'}
              </pre>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
      
      <CardFooter className="flex justify-between border-t border-slate-200 dark:border-slate-700 p-4 bg-slate-50 dark:bg-slate-800">
        <Button 
          variant="default" 
          onClick={onEdit}
          className="bg-slate-700 hover:bg-slate-600 text-white dark:bg-slate-700 dark:hover:bg-slate-600"
        >
          <Edit className="h-4 w-4 mr-2" />
          Edit Function
        </Button>
        <Button 
          variant="destructive" 
          onClick={onDelete}
          className="bg-red-600 hover:bg-red-700 text-white"
        >
          <Trash2 className="h-4 w-4 mr-2" />
          Delete Function
        </Button>
      </CardFooter>
    </Card>
  );
} 