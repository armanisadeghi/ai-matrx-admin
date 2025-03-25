import { useState, useEffect, useRef } from 'react';
import { MatrxRecordId } from '@/types';
import { useChatStorage } from '@/hooks/ai/chat/unused/useChatStorage';

export function usePromptInput(initialModelKey?: MatrxRecordId) {
  // State from storage hook
  const { 
    lastPrompt, 
    selectedModelKey, 
    isLoading, 
    updatePrompt, 
    clearPrompt, 
    updateModelSelection 
  } = useChatStorage();
  
  // Local component state
  const [message, setMessage] = useState<string>("");
  const [textareaHeight, setTextareaHeight] = useState<string>("110px");
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [isFocused, setIsFocused] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  // Update message state when lastPrompt changes
  useEffect(() => {
    if (lastPrompt) {
      setMessage(lastPrompt);
    }
  }, [lastPrompt]);

  // Initialize model key
  useEffect(() => {
    if (!selectedModelKey && initialModelKey) {
      updateModelSelection(initialModelKey);
    }
  }, [selectedModelKey, initialModelKey, updateModelSelection]);
  
  // Manage textarea height
  useEffect(() => {
    if (!textareaRef.current) return;
    
    const minHeight = 110;
    textareaRef.current.style.height = `${minHeight}px`;
    const scrollHeight = textareaRef.current.scrollHeight;
    
    const newHeight = Math.max(minHeight, scrollHeight);
    setTextareaHeight(`${newHeight}px`);
    setIsExpanded(newHeight > minHeight);
  }, [message]);
  
  // Handle message changes
  const handleMessageChange = (newMessage: string) => {
    setMessage(newMessage);
    updatePrompt(newMessage);
  };
  
  // Handle message submission
  const handleSubmit = async (sendMessage: (message: string) => void) => {
    if (!message || message.trim() === "" || isSubmitting) {
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Save current message
      const currentMessage = message;
      
      // Clear input immediately for better UX
      setMessage("");
      
      // Send the message
      sendMessage(currentMessage);
      
      // Clear from storage after successful send
      await clearPrompt();
    } catch (error) {
      console.error("Error sending message:", error);
      // If there's an error, restore the message
      setMessage(message);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Handle model selection
  const handleModelSelect = (modelKey: MatrxRecordId) => {
    updateModelSelection(modelKey);
  };
  
  // Handle UI actions
  const handleMinimize = () => {
    setTextareaHeight("110px");
    setIsExpanded(false);
  };
  
  const handleMaximize = () => {
    if (textareaRef.current) {
      setTextareaHeight(`${textareaRef.current.scrollHeight}px`);
      setIsExpanded(true);
    }
  };
  
  return {
    message,
    textareaHeight,
    isExpanded,
    isFocused,
    isSubmitting,
    isLoading,
    selectedModelKey,
    textareaRef,
    setIsFocused,
    handleMessageChange,
    handleSubmit,
    handleModelSelect,
    handleMinimize,
    handleMaximize
  };
}