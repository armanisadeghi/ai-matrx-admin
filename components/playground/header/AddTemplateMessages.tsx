import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useAddMessage } from '@/components/playground/hooks/messages/useAddMessage';
import { defaultSystemMessage, defaultUserMessage } from '@/components/playground/constants/prompts';

interface AddTemplateMessagesProps {
    onSuccess?: () => void;
    onError?: (error: Error) => void;
    onClose?: () => void;
}

const AddTemplateMessages: React.FC<AddTemplateMessagesProps> = ({ onSuccess, onError, onClose }) => {
    const [isCreating, setIsCreating] = useState(false);
    const [isCompleted, setIsCompleted] = useState(false);
    const { addMessage } = useAddMessage({ onSuccess, onError });
    
    const handleAddTemplateMessages = async () => {
        setIsCreating(true);
        try {
            await addMessage(defaultSystemMessage);
            await addMessage(defaultUserMessage);
            setIsCompleted(true);
            onSuccess?.();
        } catch (error) {
            onError?.(error as Error);
        } finally {
            setIsCreating(false);
        }
    };

    return (
        <div className="p-4 space-y-4">
            {!isCompleted ? (
                <Button 
                    onClick={handleAddTemplateMessages}
                    className="w-full"
                    disabled={isCreating}
                >
                    {isCreating ? 'Adding Messages...' : 'Add First Two Template Messages'}
                </Button>
            ) : (
                <div className="space-y-4">
                    <div className="text-center text-green-600 font-medium">
                        System Message and User Message Created Successfully
                    </div>
                    <Button 
                        onClick={onClose}
                        className="w-full"
                        variant="outline"
                    >
                        Close
                    </Button>
                </div>
            )}
        </div>
    );
};

export default AddTemplateMessages;