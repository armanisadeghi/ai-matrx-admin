'use client'



import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
// import { useConversationMessages } from "@/hooks/ai/chat/useConversationMessages";
import { useToast } from "@/components/ui/use-toast";
import { ChatMode } from "@/types/chat/chat.types";
import { MessageRole, MessageType } from "@/types/chat/chat.types";

const ConversationHookTester: React.FC = () => {
    const hook = useConversationMessages();
    const { toast } = useToast();
    
    // Form state for new conversation
    const [newConvoLabel, setNewConvoLabel] = useState("New Conversation");
    const [initialMessage, setInitialMessage] = useState("Hello, this is the first message.");
    
    // Form state for existing conversation
    const [existingConvoId, setExistingConvoId] = useState("");
    const [newMessageContent, setNewMessageContent] = useState("");
    
    // Form state for conversation properties
    const [label, setLabel] = useState("");
    const [isPublic, setIsPublic] = useState(false);
    const [currentMode, setCurrentMode] = useState<ChatMode>("general");
    
    // Form state for message properties
    const [messageContent, setMessageContent] = useState("");
    const [messageRole, setMessageRole] = useState<MessageRole>("user");
    const [messageType, setMessageType] = useState<MessageType>("text");
    
    // Results and status
    const [actionResult, setActionResult] = useState<any>(null);
  
    // Update form values when active conversation changes
    useEffect(() => {
      if (hook.activeConversation) {
        // Use object references to prevent unnecessary updates
        const newLabel = hook.activeConversation.label || "";
        const newIsPublic = !!hook.activeConversation.isPublic;
        const newMode = hook.activeConversation.metadata?.currentMode || "general";
        
        if (label !== newLabel) setLabel(newLabel);
        if (isPublic !== newIsPublic) setIsPublic(newIsPublic);
        if (currentMode !== newMode) setCurrentMode(newMode as ChatMode);
      }
    }, [hook.activeConversation?.id]); // Only trigger when conversation ID changes
    
    // Update form values when active message changes
    useEffect(() => {
      if (hook.messageCrud.message) {
        // Use object references to prevent unnecessary updates
        const newContent = hook.messageCrud.message.content || "";
        const newRole = hook.messageCrud.message.role || "user";
        const newType = hook.messageCrud.message.type || "text";
        
        if (messageContent !== newContent) setMessageContent(newContent);
        if (messageRole !== newRole) setMessageRole(newRole);
        if (messageType !== newType) setMessageType(newType);
      }
    }, [hook.messageCrud.messageId]); // Only trigger when message ID changes
  
    // Helper to present results in UI
    const showResult = (result: any) => {
      // Create a safe copy that won't cause circular reference issues
      let safeCopy;
      try {
        // First convert to string and back to strip functions and circular refs
        safeCopy = JSON.parse(JSON.stringify(result));
      } catch (e) {
        // If that fails, create a simplified object with just the key data
        safeCopy = { 
          error: "Result contained circular references", 
          summary: typeof result === 'object' ? 
            Object.keys(result).reduce((acc, key) => {
              acc[key] = typeof result[key];
              return acc;
            }, {} as Record<string, string>) : 
            { value: String(result) }
        };
      }
      
      setActionResult(safeCopy);
      console.log("Action result:", result);
    };
    
    // =================== ACTIONS ===================
    // New conversation actions
    const handleCreateNewConversation = () => {
      const result = hook.createNewConversation({
        label: newConvoLabel,
        initialMessage: initialMessage
      });
      showResult(result);
      toast({ title: "New conversation created", description: "Ready to be edited and saved" });
    };
    
    const handleSaveNewConversation = async () => {
      const result = await hook.saveNewConversation();
      showResult(result);
      
      if (result.success) {
        toast({ title: "Success!", description: "New conversation saved successfully" });
      } else {
        toast({ 
          title: "Failed to save", 
          description: result.error?.message || "Unknown error", 
          variant: "destructive" 
        });
      }
    };
    
    // Existing conversation actions
    const handleSetActiveConversation = () => {
      hook.setActiveConversation(existingConvoId);
      showResult({ action: "setActiveConversation", id: existingConvoId });
      toast({ title: "Conversation activated", description: `ID: ${existingConvoId}` });
    };
    
    const handleCreateNewMessage = () => {
      const messageId = hook.createNewMessage(newMessageContent);
      showResult({ action: "createNewMessage", messageId });
      toast({ title: "New message created", description: "Ready to be edited and saved" });
    };
    
    const handleSaveMessage = async () => {
      const result = await hook.saveMessage();
      showResult(result);
      
      if (result.success) {
        toast({ title: "Success!", description: "Message saved successfully" });
      } else {
        toast({ 
          title: "Failed to save message", 
          description: result.error?.message || "Unknown error", 
          variant: "destructive" 
        });
      }
    };
    
    // =============== DIRECT ACTIONS ===============
    // Conversation direct actions
    const updateConversationLabel = () => {
      hook.conversationCrud.updateLabel(label);
      showResult({ action: "updateLabel", value: label });
    };
    
    const updateConversationIsPublic = () => {
      hook.conversationCrud.updateIsPublic(isPublic);
      showResult({ action: "updateIsPublic", value: isPublic });
    };
    
    const updateConversationMode = () => {
      hook.conversationCrud.updateCurrentMode(currentMode);
      showResult({ action: "updateCurrentMode", value: currentMode });
    };
    
    const saveConversationDirectly = async () => {
      const result = await hook.conversationCrud.saveConversation();
      showResult(result);
      
      if (result.success) {
        toast({ title: "Success!", description: "Conversation saved directly" });
      } else {
        toast({ 
          title: "Failed to save conversation", 
          description: result.error?.message || "Unknown error", 
          variant: "destructive" 
        });
      }
    };
    
    // Message direct actions
    const updateMessageContent = () => {
      hook.messageCrud.updateContent(messageContent);
      showResult({ action: "updateContent", value: messageContent });
    };
    
    const updateMessageRole = () => {
      hook.messageCrud.updateRole(messageRole);
      showResult({ action: "updateRole", value: messageRole });
    };
    
    const updateMessageType = () => {
      hook.messageCrud.updateType(messageType);
      showResult({ action: "updateType", value: messageType });
    };
    
    const saveMessageDirectly = async () => {
      const result = await hook.messageCrud.saveMessage();
      showResult(result);
      
      if (result.success) {
        toast({ title: "Success!", description: "Message saved directly" });
      } else {
        toast({ 
          title: "Failed to save message directly", 
          description: result.error?.message || "Unknown error", 
          variant: "destructive" 
        });
      }
    };
    
    // Format an object for display
    const formatObject = (obj: any): string => {
      try {
        // Create a simplified version that won't cause circular reference issues
        const safeObj = JSON.parse(JSON.stringify(obj, (key, value) => {
          // Exclude functions and complex objects that might cause issues
          if (typeof value === 'function') return '[Function]';
          if (key === 'activeConversation' || key === 'message') {
            return value ? { id: value.id, label: value.label || '(no label)' } : null;
          }
          return value;
        }));
        return JSON.stringify(safeObj, null, 2);
      } catch (e) {
        console.error("Error formatting object:", e);
        return "Error formatting object: " + (e instanceof Error ? e.message : String(e));
      }
    };
  
    return (
      <div className="container mx-auto p-4">
        <h1 className="text-2xl font-bold mb-6">Conversation Hook Tester</h1>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left column: Actions */}
          <div className="space-y-6">
            <Tabs defaultValue="new">
              <TabsList className="mb-4">
                <TabsTrigger value="new">New Conversation</TabsTrigger>
                <TabsTrigger value="existing">Existing Conversation</TabsTrigger>
                <TabsTrigger value="direct">Direct Controls</TabsTrigger>
              </TabsList>
              
              {/* New Conversation Tab */}
              <TabsContent value="new">
                <Card>
                  <CardHeader>
                    <CardTitle>Create New Conversation</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="newConvoLabel">Conversation Label</Label>
                      <Input 
                        id="newConvoLabel" 
                        value={newConvoLabel} 
                        onChange={(e) => setNewConvoLabel(e.target.value)} 
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="initialMessage">Initial Message</Label>
                      <Textarea 
                        id="initialMessage" 
                        value={initialMessage} 
                        onChange={(e) => setInitialMessage(e.target.value)} 
                        rows={3}
                      />
                    </div>
                    
                    <div className="flex space-x-2">
                      <Button onClick={handleCreateNewConversation}>Create New Conversation</Button>
                      <Button onClick={handleSaveNewConversation} variant="default">Save New Conversation</Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
              
              {/* Existing Conversation Tab */}
              <TabsContent value="existing">
                <Card>
                  <CardHeader>
                    <CardTitle>Work with Existing Conversation</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="existingConvoId">Conversation ID/RecordKey</Label>
                      <div className="flex space-x-2">
                        <Input 
                          id="existingConvoId" 
                          value={existingConvoId} 
                          onChange={(e) => setExistingConvoId(e.target.value)} 
                          placeholder="Enter conversation recordKey or 'new-conversation'" 
                        />
                        <Button onClick={handleSetActiveConversation}>Set Active</Button>
                      </div>
                      <p className="text-xs text-gray-500">
                        Note: Use the recordKey returned from saving, not the ID field
                      </p>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="newMessageContent">New Message Content</Label>
                      <Textarea 
                        id="newMessageContent" 
                        value={newMessageContent} 
                        onChange={(e) => setNewMessageContent(e.target.value)} 
                        rows={3}
                        placeholder="Enter message content"
                      />
                    </div>
                    
                    <div className="flex space-x-2">
                      <Button 
                        onClick={handleCreateNewMessage}
                        disabled={!hook.activeConversationId || hook.isCreatingNewConversation}
                      >
                        Create New Message
                      </Button>
                      <Button 
                        onClick={handleSaveMessage}
                        disabled={!hook.messageCrud.messageId || hook.isCreatingNewConversation}
                      >
                        Save Message
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
              
              {/* Direct Controls Tab */}
              <TabsContent value="direct">
                <Card>
                  <CardHeader>
                    <CardTitle>Direct Controls</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Conversation Properties */}
                    <div>
                      <h3 className="font-semibold mb-2">Conversation Properties</h3>
                      <div className="space-y-3">
                        <div className="flex items-center space-x-2">
                          <Input 
                            value={label} 
                            onChange={(e) => setLabel(e.target.value)}
                            placeholder="Conversation label" 
                            className="flex-1"
                          />
                          <Button 
                            onClick={updateConversationLabel}
                            disabled={!hook.conversationCrud.conversationId}
                            size="sm"
                          >
                            Update Label
                          </Button>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <div className="flex items-center space-x-2 flex-1">
                            <Switch 
                              id="isPublic" 
                              checked={isPublic} 
                              onCheckedChange={setIsPublic} 
                            />
                            <Label htmlFor="isPublic">Is Public</Label>
                          </div>
                          <Button 
                            onClick={updateConversationIsPublic}
                            disabled={!hook.conversationCrud.conversationId}
                            size="sm"
                          >
                            Update Public
                          </Button>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <Select value={currentMode} onValueChange={(value) => setCurrentMode(value as ChatMode)}>
                            <SelectTrigger className="flex-1">
                              <SelectValue placeholder="Select Mode" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="chat">Chat</SelectItem>
                              <SelectItem value="assistant">Assistant</SelectItem>
                              <SelectItem value="system">System</SelectItem>
                            </SelectContent>
                          </Select>
                          <Button 
                            onClick={updateConversationMode}
                            disabled={!hook.conversationCrud.conversationId}
                            size="sm"
                          >
                            Update Mode
                          </Button>
                        </div>
                        
                        <Button 
                          onClick={saveConversationDirectly}
                          disabled={!hook.conversationCrud.conversationId}
                        >
                          Save Conversation Directly
                        </Button>
                      </div>
                    </div>
                    
                    {/* Message Properties */}
                    <div>
                      <h3 className="font-semibold mb-2">Message Properties</h3>
                      <div className="space-y-3">
                        <div className="flex items-center space-x-2">
                          <Textarea 
                            value={messageContent} 
                            onChange={(e) => setMessageContent(e.target.value)}
                            placeholder="Message content" 
                            rows={2}
                            className="flex-1"
                          />
                          <Button 
                            onClick={updateMessageContent}
                            disabled={!hook.messageCrud.messageId}
                            size="sm"
                          >
                            Update
                          </Button>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <Select 
                            value={messageRole} 
                            onValueChange={(value) => setMessageRole(value as MessageRole)}
                          >
                            <SelectTrigger className="flex-1">
                              <SelectValue placeholder="Select Role" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="user">User</SelectItem>
                              <SelectItem value="assistant">Assistant</SelectItem>
                              <SelectItem value="system">System</SelectItem>
                              <SelectItem value="tool">Tool</SelectItem>
                            </SelectContent>
                          </Select>
                          <Button 
                            onClick={updateMessageRole}
                            disabled={!hook.messageCrud.messageId}
                            size="sm"
                          >
                            Update Role
                          </Button>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <Select 
                            value={messageType} 
                            onValueChange={(value) => setMessageType(value as MessageType)}
                          >
                            <SelectTrigger className="flex-1">
                              <SelectValue placeholder="Select Type" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="text">Text</SelectItem>
                              <SelectItem value="image_url">Image URL</SelectItem>
                              <SelectItem value="mixed">Mixed</SelectItem>
                              <SelectItem value="json_object">JSON Object</SelectItem>
                            </SelectContent>
                          </Select>
                          <Button 
                            onClick={updateMessageType}
                            disabled={!hook.messageCrud.messageId}
                            size="sm"
                          >
                            Update Type
                          </Button>
                        </div>
                        
                        <Button 
                          onClick={saveMessageDirectly}
                          disabled={!hook.messageCrud.messageId}
                        >
                          Save Message Directly
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
          
          {/* Right column: State and Data */}
          <div className="space-y-6">
            {/* Current State Card */}
            <Card>
              <CardHeader>
                <CardTitle>Current Hook State</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <h3 className="font-semibold">Active Conversation</h3>
                    <div className="text-sm mt-1">
                      <p><span className="font-medium">ID:</span> {hook.activeConversationId || "(none)"}</p>
                      <p><span className="font-medium">Record Key:</span> {hook.relationshipHook?.activeParentRecordKey || "(none)"}</p>
                      <p><span className="font-medium">Creating New:</span> {hook.isCreatingNewConversation ? "Yes" : "No"}</p>
                      <p><span className="font-medium">Label:</span> {hook.activeConversation?.label || "(none)"}</p>
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="font-semibold">Messages</h3>
                    <div className="text-sm mt-1">
                      <p><span className="font-medium">Count:</span> {hook.messages.length}</p>
                      <p><span className="font-medium">Next Display Order:</span> {hook.nextMessageDisplayOrder}</p>
                      <p><span className="font-medium">Next System Order:</span> {hook.nextMessageSystemOrder}</p>
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="font-semibold">Current Message</h3>
                    <div className="text-sm mt-1">
                      <p><span className="font-medium">ID:</span> {hook.messageCrud.messageId || "(none)"}</p>
                      <p><span className="font-medium">Valid:</span> {hook.messageCrud.isValidMessage ? "Yes" : "No"}</p>
                      <p><span className="font-medium">Content:</span> {hook.messageCrud.message?.content?.substring(0, 30)}...</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            {/* Current Messages */}
            <Card>
              <CardHeader>
                <CardTitle>Messages in Current Conversation</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-40">
                  {hook.messages.length === 0 ? (
                    <p className="text-sm text-gray-500">No messages yet</p>
                  ) : (
                    <div className="space-y-2">
                      {hook.messages.map((msg) => (
                        <div key={msg.id} className="p-2 border rounded text-sm">
                          <p><span className="font-medium">ID:</span> {msg.id}</p>
                          <p><span className="font-medium">Role:</span> {msg.role}</p>
                          <p><span className="font-medium">Content:</span> {msg.content?.substring(0, 50)}...</p>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
            
            {/* Latest Action Result */}
            <Card>
              <CardHeader>
                <CardTitle>Latest Action Result</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-80">
                  <pre className="text-xs whitespace-pre-wrap p-2 rounded">
                    {actionResult ? formatObject(actionResult) : "No action performed yet"}
                  </pre>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  };
  
  export default ConversationHookTester;
  