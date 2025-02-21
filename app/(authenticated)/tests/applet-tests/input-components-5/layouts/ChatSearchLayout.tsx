import React, { useState, useEffect } from "react";
import { SearchLayoutProps } from "../types";
import { fieldController } from "../../input-components-4/components/field-components/FieldController";

const ChatSearchLayout: React.FC<SearchLayoutProps> = ({
  config,
  activeTab,
  actionButton,
  className = "",
}) => {
  const activeSearchGroups = config[activeTab] || [];
  
  // Combine all fields from all groups
  const allFields = activeSearchGroups.flatMap(group => 
    group.fields.map(field => ({ ...field, groupLabel: group.label }))
  );
  
  // State for conversation
  const [conversation, setConversation] = useState<{
    type: 'system' | 'user' | 'field';
    content: string;
    fieldId?: string;
    complete?: boolean;
  }[]>([
    { 
      type: 'system', 
      content: `Hello! I'll help you find what you're looking for. Let's get some details.` 
    }
  ]);
  
  // Track which field is currently being displayed
  const [currentFieldIndex, setCurrentFieldIndex] = useState(0);
  const [completedFields, setCompletedFields] = useState<Set<string>>(new Set());
  const [showSearchButton, setShowSearchButton] = useState(false);

  // Add the next field prompt when the current field is completed
  useEffect(() => {
    if (currentFieldIndex < allFields.length && !conversation.some(msg => 
      msg.type === 'field' && 
      msg.fieldId === allFields[currentFieldIndex].brokerId && 
      !msg.complete
    )) {
      const field = allFields[currentFieldIndex];
      
      // Add a small delay to simulate typing
      const timer = setTimeout(() => {
        setConversation(prev => [
          ...prev, 
          { 
            type: 'system', 
            content: `Please specify ${field.label.toLowerCase()}:` 
          },
          {
            type: 'field',
            content: field.label,
            fieldId: field.brokerId,
            complete: false
          }
        ]);
      }, 400);
      
      return () => clearTimeout(timer);
    }
  }, [currentFieldIndex, conversation, allFields]);

  // Handle field completion
  const handleFieldComplete = (fieldId: string) => {
    // Mark the current field message as complete
    setConversation(prev => 
      prev.map(msg => 
        msg.type === 'field' && msg.fieldId === fieldId 
          ? { ...msg, complete: true } 
          : msg
      )
    );
    
    // Add to completed fields
    setCompletedFields(prev => new Set([...prev, fieldId]));
    
    // Move to next field
    if (currentFieldIndex < allFields.length - 1) {
      setCurrentFieldIndex(prev => prev + 1);
    } else {
      // All fields complete
      setTimeout(() => {
        setConversation(prev => [
          ...prev,
          {
            type: 'system',
            content: 'Great! I have all the information I need. You can now search.'
          }
        ]);
        setShowSearchButton(true);
      }, 500);
    }
  };

  return (
    <div className={`w-full max-w-3xl mx-auto p-4 ${className}`}>
      <div className="border rounded-lg bg-white dark:bg-gray-900 shadow-lg overflow-hidden">
        {/* Chat header */}
        <div className="bg-rose-500 p-4">
          <h3 className="text-white font-medium">Search Assistant</h3>
        </div>
        
        {/* Chat messages */}
        <div className="h-96 overflow-y-auto p-4 space-y-4">
          {conversation.map((message, index) => {
            if (message.type === 'system') {
              return (
                <div key={index} className="flex">
                  <div className="bg-gray-200 dark:bg-gray-700 rounded-lg py-2 px-4 max-w-[80%]">
                    <p className="text-gray-800 dark:text-gray-200">{message.content}</p>
                  </div>
                </div>
              );
            } else if (message.type === 'field' && !message.complete) {
              const field = allFields.find(f => f.brokerId === message.fieldId);
              
              if (!field) return null;
              
              return (
                <div key={index} className="flex justify-end">
                  <div className="bg-white dark:bg-gray-800 border rounded-lg py-3 px-4 max-w-[85%] shadow-sm">
                    <div className="flex flex-col space-y-2">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        {field.label}
                      </label>
                      <div className="field-control" onChange={() => handleFieldComplete(field.brokerId)}>
                        {fieldController(field, false)}
                      </div>
                      {field.helpText && (
                        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{field.helpText}</p>
                      )}
                    </div>
                  </div>
                </div>
              );
            } else if (message.type === 'field' && message.complete) {
              return (
                <div key={index} className="flex justify-end">
                  <div className="bg-rose-100 dark:bg-rose-900 rounded-lg py-2 px-4 max-w-[80%]">
                    <p className="text-rose-800 dark:text-rose-200">
                      <span className="font-medium">{message.content}:</span> Selected
                    </p>
                  </div>
                </div>
              );
            }
            
            return null;
          })}
        </div>
        
        {/* Chat input/actions */}
        <div className="border-t p-4 dark:border-gray-700">
          {showSearchButton ? (
            <div className="flex justify-center">
              {actionButton || (
                <button className="bg-rose-500 hover:bg-rose-600 text-white rounded-full px-6 py-3 shadow">
                  Search Now
                </button>
              )}
            </div>
          ) : (
            <div className="flex items-center">
              <div className="flex-grow bg-gray-100 dark:bg-gray-800 rounded-full py-3 px-4 text-gray-400">
                Answering questions...
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatSearchLayout;