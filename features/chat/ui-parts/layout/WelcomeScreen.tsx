// File: features/chat/ui-parts/layout/WelcomeScreen.tsx

'use client';

import React, { useCallback, useState } from "react";
import PromptInput from "@/features/chat/ui-parts/prompt-input/PromptInput";
import ActionButtons from "@/features/chat/ui-parts/prompt-input/ActionButtons";
import { MatrxRecordId } from "@/types";
import { useChatInput } from "@/hooks/ai/chat/useChatInput";
import { useRouter } from "next/navigation";
import { v4 as uuidv4 } from 'uuid';
interface WelcomeScreenProps {
  initialModelKey?: MatrxRecordId;
}

const WelcomeScreen: React.FC<WelcomeScreenProps> = ({
  initialModelKey
}) => {
  const router = useRouter();
  const [modelKey, setModelKey] = useState<MatrxRecordId>(initialModelKey);
  const { updateSettings } = useChatInput(modelKey);

  const handleModeSelect = (mode: any) => {
    updateSettings({ mode });
  };
  
  const handleModelChange = useCallback((newModelKey: MatrxRecordId) => {
    updateSettings({ modelKey: newModelKey });
    setModelKey(newModelKey);
  }, [updateSettings]);
  
  const handleSendMessage = useCallback((message: string) => {
    // Store the message in Redux or other state management
    // (This part would need to be implemented according to your state management)
    
    // Generate a unique conversation ID
    const newConversationId = `id:${uuidv4()}`;
    
    // Navigate to the new conversation page
    router.push(`/chat/${newConversationId}`);
  }, [router]);

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center px-4 md:px-8">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-medium mb-2 text-gray-800 dark:text-gray-100">Good afternoon.</h1>
        <p className="text-xl text-gray-600 dark:text-gray-400">How can I help you today?</p>
      </div>

      {/* Initial Chat input */}
      <div className="w-full max-w-3xl">
        <PromptInput 
          onSendMessage={handleSendMessage} 
          initialModelKey={modelKey} 
          onModelChange={handleModelChange}
        />

        {/* Action buttons */}
        <ActionButtons 
          onModeSelect={handleModeSelect} 
          className="mt-4"
        />
      </div>
    </div>
  );
};

export default WelcomeScreen;