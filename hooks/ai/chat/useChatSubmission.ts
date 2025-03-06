import { useState } from 'react';
import { MatrxRecordId } from '@/types';

interface UseChatSubmissionProps {
  clearLastPrompt: () => Promise<void>;
  onSubmitSuccess?: () => void;
  onSubmitError?: (error: any) => void;
}

export function useChatSubmission({ 
  clearLastPrompt, 
  onSubmitSuccess, 
  onSubmitError 
}: UseChatSubmissionProps) {
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // This function handles the submission process and ensures proper cleanup
  const handleMessageSubmit = async (
    message: string, 
    sendMessageFn: (message: string) => void | Promise<any>,
    modelKey?: MatrxRecordId
  ): Promise<boolean> => {
    if (!message || message.trim() === "" || isSubmitting) {
      return false;
    }

    setIsSubmitting(true);

    try {
      // Call the API function
      await sendMessageFn(message);
      
      // If successful, clear the stored prompt
      await clearLastPrompt();
      
      if (onSubmitSuccess) {
        onSubmitSuccess();
      }
      
      return true;
    } catch (error) {
      console.error("Error submitting message:", error);
      
      if (onSubmitError) {
        onSubmitError(error);
      }
      
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    isSubmitting,
    handleMessageSubmit
  };
}