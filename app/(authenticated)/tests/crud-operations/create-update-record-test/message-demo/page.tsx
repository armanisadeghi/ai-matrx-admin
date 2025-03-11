'use client';
import React, { useState } from 'react';
import { useMessageCrud } from '@/app/entities/hooks/crud/by-entity/useMessageCrud';
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
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { CheckCircle, XCircle, Loader2, Eye } from 'lucide-react';
import { Message } from '@/types/chat/chat.types';


interface SaveMessageResult {
  success: boolean;
  tempRecordId?: string;
  recordKey?: string;
  id?: string;
  fullRecord?: Message;
  error?: Error;
}

const MessageDemo = () => {
  // State for form inputs
  const [conversationId, setConversationId] = useState('8fcb8e82-b8a3-4d0d-a617-0f804b73c38c');
  const [content, setContent] = useState('');
  const [notification, setNotification] = useState({ message: '', type: '' });
  
  // State for async operations
  const [isSaving, setIsSaving] = useState(false);
  const [saveResult, setSaveResult] = useState<SaveMessageResult | null>(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [suppressValidationErrors, setSuppressValidationErrors] = useState(false);
  
  // Use our custom message hook
  const {
    message,
    messageId,
    createMessage,
    updateContent,
    updateRole,
    updateType,
    updateMetadata,
    updateDisplayOrder,
    updateSystemOrder,
    updateIsPublic,
    batchUpdate,
    saveMessage,
    resetMessage,
    hasRequiredFields,
    isValidMessage,
  } = useMessageCrud({ conversationId });

  // Helper to display notifications
  const showNotification = (message, type = 'info') => {
    setNotification({ message, type });
    setTimeout(() => setNotification({ message: '', type: '' }), 3000);
  };

  // Handle message creation
  const handleCreateMessage = () => {
    const newMessageId = createMessage();
    if (newMessageId) {
      showNotification(`Message created with ID: ${newMessageId}`, 'success');
    } else {
      showNotification('Failed to create message', 'error');
    }
  };

  // Handle content update
  const handleContentUpdate = () => {
    updateContent(content);
    showNotification('Content updated', 'success');
  };

  // Handle batch update
  const handleBatchUpdate = () => {
    batchUpdate({
      content,
      isPublic: false,
      displayOrder: 1,
      systemOrder: 1,
    });
    showNotification('Multiple fields updated', 'success');
  };

  // Handle saving with proper async functionality
  const handleSave = async () => {
    try {
      setIsSaving(true);
      setSaveResult(null);
      setSuppressValidationErrors(true);
      
      const result = await saveMessage();
      setSaveResult(result);
      
      if (result.success) {
        showNotification('Message saved successfully', 'success');
      } else {
        showNotification(`Failed to save message: ${result.error?.message || 'Unknown error'}`, 'error');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      showNotification(`Error saving message: ${errorMessage}`, 'error');
      
      // Create a result object for the error
      setSaveResult({
        success: false,
        error: error instanceof Error ? error : new Error(String(error))
      });
    } finally {
      setIsSaving(false);
      
      // Add a small delay before re-enabling validation errors
      // to prevent the flash of error after save
      setTimeout(() => {
        setSuppressValidationErrors(false);
      }, 500);
    }
  };

  // Format JSON for display
  const formatJson = (obj) => {
    if (!obj) return 'null';
    try {
      return JSON.stringify(obj, null, 2);
    } catch (err) {
      return String(obj);
    }
  };

  // Get a truncated version of the JSON for preview
  const getTruncatedJson = (obj, maxLength = 100) => {
    if (!obj) return 'null';
    try {
      const json = JSON.stringify(obj, null, 2);
      return json.length > maxLength ? `${json.substring(0, maxLength)}...` : json;
    } catch (err) {
      return String(obj);
    }
  };

  return (
    <div className="container mx-auto p-4 w-full">
      <h1 className="text-2xl font-bold mb-4">Message Management Demo</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <Card className="col-span-2">
          <CardHeader>
            <CardTitle>Message Configuration</CardTitle>
            <CardDescription>Set the conversation ID for new messages</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-4">
              <div className="flex-1">
                <Label htmlFor="conversationId">Conversation ID</Label>
                <Input 
                  id="conversationId" 
                  value={conversationId} 
                  onChange={(e) => setConversationId(e.target.value)}
                  placeholder="Enter conversation ID"
                />
              </div>
              <Button onClick={handleCreateMessage}>
                Create New Message
              </Button>
              <Button variant="outline" onClick={resetMessage}>
                Reset Message
              </Button>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Message Actions</CardTitle>
            <CardDescription>Update message properties</CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="content">Message Content</Label>
              <Input 
                id="content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Enter message content"
              />
              <Button 
                onClick={handleContentUpdate} 
                disabled={!messageId}
                className="w-full"
              >
                Update Content
              </Button>
            </div>
            
            <Separator />
            
            <div className="space-y-2">
              <Label>Message Role</Label>
              <Select 
                onValueChange={(value) => {
                  if (messageId) updateRole(value);
                }} 
                disabled={!messageId} 
                defaultValue="user"
                value={message?.role || "user"}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">User</SelectItem>
                  <SelectItem value="assistant">Assistant</SelectItem>
                  <SelectItem value="system">System</SelectItem>
                  <SelectItem value="tool">Tool</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Message Type</Label>
              <Select 
                onValueChange={(value) => {
                  if (messageId) updateType(value);
                }} 
                disabled={!messageId} 
                defaultValue="text"
                value={message?.type || "text"}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="text">Text</SelectItem>
                  <SelectItem value="image_url">Image URL</SelectItem>
                  <SelectItem value="base64_image">Base64 Image</SelectItem>
                  <SelectItem value="json_object">JSON Object</SelectItem>
                  <SelectItem value="tool_result">Tool Result</SelectItem>
                  <SelectItem value="mixed">Mixed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-2">
                <Label>Display Order</Label>
                <Select 
                  onValueChange={(value) => {
                    if (messageId) updateDisplayOrder(Number(value));
                  }} 
                  disabled={!messageId}
                  value={message?.displayOrder?.toString() || ""}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select order" />
                  </SelectTrigger>
                  <SelectContent>
                    {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(num => (
                      <SelectItem key={num} value={num.toString()}>{num}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label>System Order</Label>
                <Select 
                  onValueChange={(value) => {
                    if (messageId) updateSystemOrder(Number(value));
                  }} 
                  disabled={!messageId}
                  value={message?.systemOrder?.toString() || ""}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select order" />
                  </SelectTrigger>
                  <SelectContent>
                    {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(num => (
                      <SelectItem key={num} value={num.toString()}>{num}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <Switch 
                id="isPublic" 
                checked={message?.isPublic || false}
                onCheckedChange={(checked) => {
                  if (messageId) updateIsPublic(checked);
                }}
                disabled={!messageId}
              />
              <Label htmlFor="isPublic">Public Message</Label>
            </div>
            
            <Button 
              onClick={handleBatchUpdate}
              disabled={!messageId}
              className="w-full"
              variant="secondary"
            >
              Batch Update
            </Button>
            
            <Separator />
            
            <Button 
              onClick={handleSave}
              disabled={!isValidMessage || isSaving}
              className="w-full"
              variant="default"
            >
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : "Save Message"}
            </Button>
            
            {!hasRequiredFields && messageId && !suppressValidationErrors && (
              <Alert variant="destructive">
                <AlertDescription>
                  Missing required fields: conversationId, displayOrder, or systemOrder
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
        
        <Card className="space-y-4">
          <CardHeader>
            <CardTitle>Message State</CardTitle>
            <CardDescription>Current message data</CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Message ID</h3>
                <Badge variant="outline">
                  {messageId || "None"}
                </Badge>
              </div>
              
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Has Required Fields</h3>
                <Badge variant={hasRequiredFields ? "success" : "destructive"}>
                  {hasRequiredFields ? "Yes" : "No"}
                </Badge>
              </div>
              
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Is Valid Message</h3>
                <Badge variant={isValidMessage ? "success" : "destructive"}>
                  {isValidMessage ? "Yes" : "No"}
                </Badge>
              </div>
            </div>
            
            <Separator />
            
            <Tabs defaultValue="message" className="w-full">
              <TabsList className="grid grid-cols-2 w-full">
                <TabsTrigger value="message">Message Data</TabsTrigger>
                <TabsTrigger value="saveResult" disabled={!saveResult}>Save Result</TabsTrigger>
              </TabsList>
              
              <TabsContent value="message" className="space-y-2">
                <h3 className="text-md font-medium">Current Message Data</h3>
                <pre className="bg-secondary p-2 rounded-md text-xs overflow-auto max-h-80">
                  {formatJson(message)}
                </pre>
              </TabsContent>
              
              <TabsContent value="saveResult" className="space-y-2">
                {saveResult && (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <h3 className="text-md font-medium">Save Operation Result</h3>
                      <Badge variant={saveResult.success ? "success" : "destructive"}>
                        {saveResult.success ? "Success" : "Failed"}
                      </Badge>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2">
                      {saveResult.id && (
                        <div>
                          <Label>Permanent ID</Label>
                          <div className="bg-muted p-2 rounded-md text-xs truncate">
                            {saveResult.id}
                          </div>
                        </div>
                      )}
                      
                      {saveResult.tempRecordId && (
                        <div>
                          <Label>Temporary Record ID</Label>
                          <div className="bg-muted p-2 rounded-md text-xs truncate">
                            {saveResult.tempRecordId}
                          </div>
                        </div>
                      )}
                      
                      {saveResult.recordKey && (
                        <div>
                          <Label>Record Key</Label>
                          <div className="bg-muted p-2 rounded-md text-xs truncate">
                            {saveResult.recordKey}
                          </div>
                        </div>
                      )}
                    </div>
                    
                    {saveResult.error && (
                      <div>
                        <Label className="text-destructive">Error</Label>
                        <div className="bg-destructive/10 p-2 rounded-md text-xs">
                          {saveResult.error.message}
                        </div>
                      </div>
                    )}
                    
                    {saveResult.fullRecord && (
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <Label>Full Record Data</Label>
                          <Button 
                            size="sm" 
                            variant="outline" 
                            onClick={() => setShowDetailsDialog(true)}
                            className="h-8 flex items-center gap-1"
                          >
                            <Eye className="h-3 w-3" /> View Details
                          </Button>
                        </div>
                        <pre className="bg-secondary p-2 rounded-md text-xs overflow-auto max-h-100">
                          {getTruncatedJson(saveResult.fullRecord, 1000)}
                        </pre>
                      </div>
                    )}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
      
      {/* Toast notification */}
      {notification.message && (
        <Alert variant={notification.type as "default" | "destructive"} className="fixed bottom-4 right-4 max-w-md">
          <AlertDescription>{notification.message}</AlertDescription>
        </Alert>
      )}
      
      {/* Details Dialog */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>Full Record Details</DialogTitle>
            <DialogDescription>
              Complete data returned from the save operation
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4">
            <pre className="bg-muted p-4 rounded-md text-xs overflow-auto max-h-[60vh]">
              {saveResult?.fullRecord ? formatJson(saveResult.fullRecord) : 'No data available'}
            </pre>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MessageDemo;