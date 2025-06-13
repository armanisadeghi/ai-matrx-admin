import React from 'react';
import { DbFunctionNode } from '@/features/workflows/types';
import { NeededBroker, RecipeConfig } from '@/features/workflows/service/recipe-service';
import MessagesTab from './MessagesTab';

interface RecipeMessagesTabProps {
    nodeData: DbFunctionNode;
    onNodeUpdate: (nodeData: DbFunctionNode) => void;
    recipeDetails: RecipeConfig | null;
    loading: boolean;
    error: string | null;
    neededBrokers?: NeededBroker[];
}

const RecipeMessagesTab: React.FC<RecipeMessagesTabProps> = ({
    nodeData,
    onNodeUpdate,
    recipeDetails,
    loading,
    error,
    neededBrokers,
}) => {
    if (loading) {
        return (
            <div className="p-4">
                <div className="text-gray-600 dark:text-gray-400">Loading recipe messages...</div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-4">
                <div className="text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 p-3 rounded-md">
                    Error loading messages: {error}
                </div>
            </div>
        );
    }

    if (!recipeDetails) {
        return (
            <div className="p-4">
                <div className="text-gray-500 dark:text-gray-400 text-sm italic">
                    No recipe selected. Please select a recipe to view its messages.
                </div>
            </div>
        );
    }

    if (!recipeDetails.messages || recipeDetails.messages.length === 0) {
        return (
            <div className="p-4">
                <div className="text-gray-500 dark:text-gray-400 text-sm italic">
                    This recipe doesn't contain any messages.
                </div>
            </div>
        );
    }

    return <MessagesTab messages={recipeDetails.messages} neededBrokers={neededBrokers} />;
};

export default RecipeMessagesTab; 