'use client'
import React, { useState, useEffect } from 'react';
import { useCreateUpdateRecord } from '@/app/entities/hooks/crud/useCreateUpdateRecord';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { CheckCircle, XCircle, Clock, Eye } from 'lucide-react';

const HookTestingUI = () => {
  // State for hook configuration
  const [returnCallbackId, setReturnCallbackId] = useState(false);
  
  // Using the hook with "message" as the entity and optional callback ID
  const {
    start,
    updateField,
    updateFields,
    save,
    saveAsync,
    saveWithConfirmation,
    currentRecordId,
    recordDataWithDefaults,
    recordDataWithoutDefaults,
    fieldDefaults,
    callbackId,
  } = useCreateUpdateRecord({ 
    entityKey: 'message',
    returnCallbackId 
  });

  // State for inputs
  const [idFieldName, setIdFieldName] = useState('id');
  const [initialData, setInitialData] = useState('{}');
  const [fieldName, setFieldName] = useState('');
  const [fieldValue, setFieldValue] = useState('');
  const [multipleFieldsData, setMultipleFieldsData] = useState('{}');
  const [isBoolean, setIsBoolean] = useState(false);
  const [isNumber, setIsNumber] = useState(false);
  
  // State for response tracking
  const [startResponse, setStartResponse] = useState(null);
  const [lastAction, setLastAction] = useState('');
  const [error, setError] = useState('');
  
  // State for async operations
  const [saveAsyncResult, setSaveAsyncResult] = useState(null);
  const [saveConfirmResult, setSaveConfirmResult] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [operationLog, setOperationLog] = useState([]);
  
  // State for dialogs
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [dialogContent, setDialogContent] = useState({});

  // Add log entry function
  const addLogEntry = (action, status, details = null) => {
    const newEntry = {
      id: Date.now(),
      timestamp: new Date().toLocaleTimeString(),
      action,
      status,
      details
    };
    setOperationLog(prev => [newEntry, ...prev].slice(0, 20)); // Keep last 20 entries
  };

  // View details function
  const viewDetails = (details) => {
    setDialogContent(details);
    setDetailsDialogOpen(true);
  };

  // Function to handle hook configuration
  const toggleReturnCallbackId = () => {
    setReturnCallbackId(prev => !prev);
  };

  // Function to handle start
  const handleStart = () => {
    try {
      const parsedInitialData = initialData ? JSON.parse(initialData) : undefined;
      const response = start(parsedInitialData, idFieldName || undefined);
      setStartResponse(response);
      setLastAction('start');
      setError('');
      addLogEntry('start', 'success', { recordId: response });
    } catch (err) {
      setError(`Error in start: ${err.message}`);
      addLogEntry('start', 'error', { error: err.message });
    }
  };

  // Function to handle updateField
  const handleUpdateField = () => {
    try {
      if (!fieldName) {
        setError('Field name is required');
        addLogEntry('updateField', 'error', { error: 'Field name is required' });
        return;
      }
      
      let processedValue = fieldValue;
      
      if (isBoolean) {
        processedValue = fieldValue.toLowerCase() === 'true' ? 'true' : 'false';
      } else if (isNumber) {
        processedValue = Number(fieldValue).toString();
      } else if (fieldValue.startsWith('{') || fieldValue.startsWith('[')) {
        try {
          processedValue = JSON.parse(fieldValue);
        } catch (e) {
          // If it fails to parse, keep as string
        }
      }
      
      updateField(fieldName, processedValue);
      setLastAction(`updateField: ${fieldName} = ${String(processedValue)}`);
      setError('');
      addLogEntry('updateField', 'success', { field: fieldName, value: processedValue });
    } catch (err) {
      setError(`Error in updateField: ${err.message}`);
      addLogEntry('updateField', 'error', { error: err.message });
    }
  };

  // Function to handle updateFields
  const handleUpdateFields = () => {
    try {
      const updates = JSON.parse(multipleFieldsData);
      updateFields(updates);
      setLastAction(`updateFields: ${multipleFieldsData}`);
      setError('');
      addLogEntry('updateFields', 'success', { updates });
    } catch (err) {
      setError(`Error in updateFields: ${err.message}`);
      addLogEntry('updateFields', 'error', { error: err.message });
    }
  };

  // Function to handle traditional save
  const handleSave = async () => {
    try {
      setIsSaving(true);
      setLastAction('save (standard)');
      await save();
      setError('');
      addLogEntry('save', 'success');
    } catch (err) {
      setError(`Error in save: ${err.message}`);
      addLogEntry('save', 'error', { error: err.message });
    } finally {
      setIsSaving(false);
    }
  };

  // Function to handle saveAsync
  const handleSaveAsync = async () => {
    try {
      setIsSaving(true);
      setLastAction('saveAsync');
      const result = await saveAsync();
      setSaveAsyncResult(result);
      setError('');
      addLogEntry('saveAsync', result.success ? 'success' : 'error', result);
    } catch (err) {
      setError(`Error in saveAsync: ${err.message}`);
      setSaveAsyncResult({ success: false, error: err });
      addLogEntry('saveAsync', 'error', { error: err.message });
    } finally {
      setIsSaving(false);
    }
  };

  // Function to handle saveWithConfirmation
  const handleSaveWithConfirmation = async () => {
    try {
      setIsSaving(true);
      setLastAction('saveWithConfirmation');
      const success = await saveWithConfirmation();
      setSaveConfirmResult(success);
      setError('');
      addLogEntry('saveWithConfirmation', success ? 'success' : 'error', { success });
    } catch (err) {
      setError(`Error in saveWithConfirmation: ${err.message}`);
      setSaveConfirmResult(false);
      addLogEntry('saveWithConfirmation', 'error', { error: err.message });
    } finally {
      setIsSaving(false);
    }
  };

  // Reset results
  const resetResults = () => {
    setSaveAsyncResult(null);
    setSaveConfirmResult(null);
  };

  // Format JSON for display
  const formatJson = (obj) => {
    try {
      return JSON.stringify(obj, null, 2);
    } catch (err) {
      return String(obj);
    }
  };

  return (
    <div className="p-4 w-full">
      <h1 className="text-2xl font-bold mb-4">useCreateUpdateRecord Hook Testing UI</h1>
      
      {/* Top section - 2 columns */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        {/* Left Column - CRUD Actions */}
        <div className="space-y-4">
          {/* Hook Configuration Card */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle>Hook Configuration</CardTitle>
              <CardDescription>Configure hook options</CardDescription>
            </CardHeader>
            
            <CardContent>
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="returnCallbackId" 
                  checked={returnCallbackId} 
                  onCheckedChange={toggleReturnCallbackId}
                />
                <Label htmlFor="returnCallbackId">Return Callback ID</Label>
              </div>
              
              {returnCallbackId && (
                <div className="mt-2">
                  <Badge variant="outline" className="text-sm">
                    Current Callback ID: {callbackId || "None"}
                  </Badge>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Start Function Card */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle>Create Record</CardTitle>
              <CardDescription>Start creating a new record</CardDescription>
            </CardHeader>
            
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <h3 className="text-lg font-semibold">start(initialData, idField)</h3>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label htmlFor="idFieldName">ID Field Name</Label>
                    <Input 
                      id="idFieldName" 
                      value={idFieldName} 
                      onChange={(e) => setIdFieldName(e.target.value)} 
                      placeholder="e.g., id"
                    />
                  </div>
                  <div>
                    <Label htmlFor="initialData">Initial Data (JSON)</Label>
                    <Input 
                      id="initialData" 
                      value={initialData} 
                      onChange={(e) => setInitialData(e.target.value)} 
                      placeholder='{"field": "value"}'
                    />
                  </div>
                </div>
                <Button 
                  onClick={handleStart} 
                  className="w-full"
                  variant="default"
                >
                  Start Create
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Update Functions Card */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle>Update Record</CardTitle>
              <CardDescription>Update fields in the current record</CardDescription>
            </CardHeader>
            
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <h3 className="text-lg font-semibold">updateField(fieldName, value)</h3>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label htmlFor="fieldName">Field Name</Label>
                    <Input 
                      id="fieldName" 
                      value={fieldName} 
                      onChange={(e) => setFieldName(e.target.value)} 
                      placeholder="e.g., text"
                    />
                  </div>
                  <div>
                    <Label htmlFor="fieldValue">Value</Label>
                    <Input 
                      id="fieldValue" 
                      value={fieldValue} 
                      onChange={(e) => setFieldValue(e.target.value)} 
                      placeholder="Field value"
                    />
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <Switch 
                      id="isBoolean" 
                      checked={isBoolean} 
                      onCheckedChange={(checked) => {
                        setIsBoolean(checked);
                        if (checked) setIsNumber(false);
                      }}
                    />
                    <Label htmlFor="isBoolean">Boolean</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch 
                      id="isNumber" 
                      checked={isNumber} 
                      onCheckedChange={(checked) => {
                        setIsNumber(checked);
                        if (checked) setIsBoolean(false);
                      }}
                    />
                    <Label htmlFor="isNumber">Number</Label>
                  </div>
                </div>
                <Button 
                  onClick={handleUpdateField} 
                  className="w-full"
                  variant="secondary"
                  disabled={!currentRecordId}
                >
                  Update Field
                </Button>
              </div>
              
              <Separator />
              
              <div className="space-y-2">
                <h3 className="text-lg font-semibold">updateFields(updates)</h3>
                <div>
                  <Label htmlFor="multipleFieldsData">Updates (JSON)</Label>
                  <Input 
                    id="multipleFieldsData" 
                    value={multipleFieldsData} 
                    onChange={(e) => setMultipleFieldsData(e.target.value)} 
                    placeholder='{"field1": "value1", "field2": "value2"}'
                  />
                </div>
                <Button 
                  onClick={handleUpdateFields} 
                  className="w-full"
                  variant="secondary"
                  disabled={!currentRecordId}
                >
                  Update Multiple Fields
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Right Column - State and Data */}
        <div className="space-y-4">
          {/* Status Card */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle>Status</CardTitle>
              <CardDescription>Current state information</CardDescription>
            </CardHeader>
            
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold">Last Action</h3>
                  <Badge variant={lastAction ? "outline" : "secondary"}>
                    {lastAction || "None"}
                  </Badge>
                </div>
                
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold">Current Record ID</h3>
                  <Badge variant="outline">
                    {currentRecordId || "None"}
                  </Badge>
                </div>
                
                {startResponse !== null && (
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-semibold">Start Response</h3>
                    <Badge variant="outline">
                      {startResponse || "None"}
                    </Badge>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
          
          {/* Data Tabs Card */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle>Record Data</CardTitle>
              <CardDescription>Current record data</CardDescription>
            </CardHeader>
            
            <CardContent>
              <Tabs defaultValue="withDefaults" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="withDefaults">With Defaults</TabsTrigger>
                  <TabsTrigger value="withoutDefaults">Without Defaults</TabsTrigger>
                  <TabsTrigger value="defaults">Field Defaults</TabsTrigger>
                </TabsList>
                
                <TabsContent value="withDefaults" className="space-y-2">
                  <h3 className="text-md font-medium">recordDataWithDefaults</h3>
                  <pre className="bg-secondary p-2 rounded-md text-xs overflow-auto max-h-100">
                    {formatJson(recordDataWithDefaults)}
                  </pre>
                </TabsContent>
                
                <TabsContent value="withoutDefaults" className="space-y-2">
                  <h3 className="text-md font-medium">recordDataWithoutDefaults</h3>
                  <pre className="bg-secondary p-2 rounded-md text-xs overflow-auto max-h-100">
                    {formatJson(recordDataWithoutDefaults)}
                  </pre>
                </TabsContent>
                
                <TabsContent value="defaults" className="space-y-2">
                  <h3 className="text-md font-medium">fieldDefaults</h3>
                  <pre className="bg-secondary p-2 rounded-md text-xs overflow-auto max-h-100">
                    {formatJson(fieldDefaults)}
                  </pre>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>
      
      {/* Save Methods - Full Width Tabbed Section */}
      <Card className="mb-4">
        <CardHeader className="pb-2">
          <CardTitle>Save Methods</CardTitle>
          <CardDescription>Test different save methods in the hook</CardDescription>
        </CardHeader>
        
        <CardContent>
          <Tabs defaultValue="standard" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="standard">Standard Save</TabsTrigger>
              <TabsTrigger value="async">Save Async</TabsTrigger>
              <TabsTrigger value="confirmation">Save With Confirmation</TabsTrigger>
            </TabsList>
            
            <TabsContent value="standard" className="pt-4">
              <div className="space-y-4">
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <h3 className="text-lg font-semibold">save()</h3>
                    <p className="text-sm text-gray-500">
                      Original save method that returns a Promise&lt;void&gt;. This method maintains backwards compatibility.
                    </p>
                  </div>
                  <Button 
                    onClick={handleSave} 
                    className="min-w-32"
                    variant="default"
                    disabled={!currentRecordId || isSaving}
                  >
                    {isSaving && lastAction === 'save (standard)' ? 'Saving...' : 'Save Record'}
                  </Button>
                </div>
                
                <Alert variant="default" className="bg-muted">
                  <AlertDescription>
                    This is the original save method that doesn't return any result data. It's useful when you just need to trigger a save operation without needing to handle the result.
                  </AlertDescription>
                </Alert>
              </div>
            </TabsContent>
            
            <TabsContent value="async" className="pt-4">
              <div className="space-y-4">
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <h3 className="text-lg font-semibold">saveAsync()</h3>
                    <p className="text-sm text-gray-500">
                      Enhanced save method that returns a Promise with the full callback result object
                    </p>
                  </div>
                  <Button 
                    onClick={handleSaveAsync} 
                    className="min-w-32"
                    variant="default"
                    disabled={!currentRecordId || isSaving}
                  >
                    {isSaving && lastAction === 'saveAsync' ? 'Saving...' : 'Save Async'}
                  </Button>
                </div>
                
                {saveAsyncResult !== null && (
                  <Card className="bg-muted border-none">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">Result</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <span className="font-medium">Success:</span>
                          {saveAsyncResult.success ? 
                            <span className="flex items-center text-green-500">
                              <CheckCircle className="h-4 w-4 mr-1" /> True
                            </span> : 
                            <span className="flex items-center text-red-500">
                              <XCircle className="h-4 w-4 mr-1" /> False
                            </span>
                          }
                        </div>
                        {saveAsyncResult.error && (
                          <div className="space-y-1">
                            <span className="font-medium">Error:</span>
                            <pre className="bg-background p-2 rounded-md text-xs overflow-auto max-h-32">
                              {saveAsyncResult.error.message}
                            </pre>
                          </div>
                        )}
                        <pre className="bg-background p-2 rounded-md text-xs overflow-auto max-h-32">
                          {formatJson(saveAsyncResult)}
                        </pre>
                      </div>
                    </CardContent>
                  </Card>
                )}
                
                <Alert variant="default" className="bg-muted">
                  <AlertDescription>
                    <p>The <code>saveAsync()</code> method returns a Promise that resolves with a SaveCallbackResult object containing:</p>
                    <ul className="list-disc list-inside mt-2 space-y-1">
                      <li><code>success</code>: boolean indicating if the save was successful</li>
                      <li><code>error</code>: Error object if the save failed (undefined if successful)</li>
                    </ul>
                  </AlertDescription>
                </Alert>
              </div>
            </TabsContent>
            
            <TabsContent value="confirmation" className="pt-4">
              <div className="space-y-4">
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <h3 className="text-lg font-semibold">saveWithConfirmation()</h3>
                    <p className="text-sm text-gray-500">
                      Simplified save method that returns a Promise with just a boolean success value
                    </p>
                  </div>
                  <Button 
                    onClick={handleSaveWithConfirmation} 
                    className="min-w-32"
                    variant="default"
                    disabled={!currentRecordId || isSaving}
                  >
                    {isSaving && lastAction === 'saveWithConfirmation' ? 'Saving...' : 'Save With Confirmation'}
                  </Button>
                </div>
                
                {saveConfirmResult !== null && (
                  <Card className="bg-muted border-none">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">Result</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="flex items-center space-x-2">
                        <span className="font-medium">Success:</span>
                        {saveConfirmResult ? 
                          <span className="flex items-center text-green-500">
                            <CheckCircle className="h-4 w-4 mr-1" /> True
                          </span> : 
                          <span className="flex items-center text-red-500">
                            <XCircle className="h-4 w-4 mr-1" /> False
                          </span>
                        }
                      </div>
                    </CardContent>
                  </Card>
                )}
                
                <Alert variant="default" className="bg-muted">
                  <AlertDescription>
                    The <code>saveWithConfirmation()</code> method is a simplified version of <code>saveAsync()</code> that returns a Promise which resolves to a boolean indicating whether the save was successful.
                  </AlertDescription>
                </Alert>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
        
        <CardFooter>
          {error && (
            <Alert variant="destructive" className="w-full">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </CardFooter>
      </Card>
      
      {/* Operation Log - Full Width */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle>Operation Log</CardTitle>
          <CardDescription>History of operations performed with the hook</CardDescription>
        </CardHeader>
        
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-32">Time</TableHead>
                <TableHead className="w-40">Action</TableHead>
                <TableHead className="w-32">Status</TableHead>
                <TableHead>Details Summary</TableHead>
                <TableHead className="w-24">View</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {operationLog.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    No operations logged yet
                  </TableCell>
                </TableRow>
              ) : (
                operationLog.map(entry => (
                  <TableRow key={entry.id}>
                    <TableCell>{entry.timestamp}</TableCell>
                    <TableCell className="font-medium">{entry.action}</TableCell>
                    <TableCell>
                      {entry.status === 'success' ? (
                        <span className="flex items-center text-green-500">
                          <CheckCircle className="h-4 w-4 mr-1" /> Success
                        </span>
                      ) : entry.status === 'error' ? (
                        <span className="flex items-center text-red-500">
                          <XCircle className="h-4 w-4 mr-1" /> Error
                        </span>
                      ) : (
                        <span className="flex items-center text-yellow-500">
                          <Clock className="h-4 w-4 mr-1" /> Pending
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">
                      {entry.details ? (
                        <Accordion type="single" collapsible className="w-full">
                          <AccordionItem value="details">
                            <AccordionTrigger className="py-1 text-sm">
                              {Object.keys(entry.details).join(', ')}
                            </AccordionTrigger>
                            <AccordionContent>
                              <pre className="bg-muted p-2 rounded-md text-xs overflow-auto max-h-40">
                                {formatJson(entry.details)}
                              </pre>
                            </AccordionContent>
                          </AccordionItem>
                        </Accordion>
                      ) : '-'}
                    </TableCell>
                    <TableCell>
                      {entry.details && (
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => viewDetails(entry.details)}
                          className="h-8 w-8 p-0"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      
      {/* Details Dialog */}
      <Dialog open={detailsDialogOpen} onOpenChange={setDetailsDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Operation Details</DialogTitle>
            <DialogDescription>
              Full details of the operation
            </DialogDescription>
          </DialogHeader>
          <div className="mt-2">
            <pre className="bg-muted p-3 rounded-md text-sm overflow-auto max-w-2xl max-h-[60vh]">
              {formatJson(dialogContent)}
            </pre>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default HookTestingUI;