// @ts-nocheck
// entityExports.ts
import { getEntitySelectors, getEntitySlice } from '@/lib/redux/entity/entitySlice';
import { AutomationTableName } from '@/types/AutomationSchemaTypes';

export function getReducers() {
    const registeredFunctionSlice = getEntitySlice('registeredFunction');
    const userPreferencesSlice = getEntitySlice('userPreferences');

    return {
        registeredFunction: registeredFunctionSlice.reducer,
        userPreferences: userPreferencesSlice.reducer,
    };
}

export function getActions() {
    const registeredFunctionSlice = getEntitySlice('registeredFunction');
    const userPreferencesSlice = getEntitySlice('userPreferences');

    return {
        registeredFunction: registeredFunctionSlice.actions,
        userPreferences: userPreferencesSlice.actions,
    };
}

export function getEntityReducers() {
    const reducers = {} as Record<AutomationTableName, ReturnType<typeof getEntitySlice>['reducer']>;
    const tableNames: AutomationTableName[] = [
        'action',
        'aiEndpoint',
        'aiModel',
        'arg',
        'automationBoundaryBroker',
        'automationMatrix',
        'broker',
        'dataInputComponent',
        'dataOutputComponent',
        'displayOption',
        'emails',
        'extractor',
        'flashcardData',
        'flashcardHistory',
        'flashcardImages',
        'flashcardSetRelations',
        'flashcardSets',
        'processor',
        'recipe',
        'recipeBroker',
        'recipeDisplay',
        'recipeFunction',
        'recipeModel',
        'recipeProcessor',
        'recipeTool',
        'registeredFunction',
        'systemFunction',
        'tool',
        'transformer',
        'userPreferences',
    ];

    tableNames.forEach((tableName) => {
        reducers[tableName] = getEntitySlice(tableName).reducer;
    });

    return reducers;
}

export function getEntityActions() {
    const actions = {} as Record<AutomationTableName, ReturnType<typeof getEntitySlice>['actions']>;
    const tableNames: AutomationTableName[] = [
        'action',
        'aiEndpoint',
        'aiModel',
        'arg',
        'automationBoundaryBroker',
        'automationMatrix',
        'broker',
        'dataInputComponent',
        'dataOutputComponent',
        'displayOption',
        'emails',
        'extractor',
        'flashcardData',
        'flashcardHistory',
        'flashcardImages',
        'flashcardSetRelations',
        'flashcardSets',
        'processor',
        'recipe',
        'recipeBroker',
        'recipeDisplay',
        'recipeFunction',
        'recipeModel',
        'recipeProcessor',
        'recipeTool',
        'registeredFunction',
        'systemFunction',
        'tool',
        'transformer',
        'userPreferences',
    ];

    tableNames.forEach((tableName) => {
        actions[tableName] = getEntitySlice(tableName).actions;
    });

    return actions;
}

export function getActionReducer() {
    return getEntitySlice('action').reducer;
}

export function getActionActions() {
    return getEntitySlice('action').actions;
}

export function getAiEndpointReducer() {
    return getEntitySlice('aiEndpoint').reducer;
}

export function getAiEndpointActions() {
    return getEntitySlice('aiEndpoint').actions;
}

export function getAiModelReducer() {
    return getEntitySlice('aiModel').reducer;
}

export function getAiModelActions() {
    return getEntitySlice('aiModel').actions;
}

export function getArgReducer() {
    return getEntitySlice('arg').reducer;
}

export function getArgActions() {
    return getEntitySlice('arg').actions;
}

export function getAutomationBoundaryBrokerReducer() {
    return getEntitySlice('automationBoundaryBroker').reducer;
}

export function getAutomationBoundaryBrokerActions() {
    return getEntitySlice('automationBoundaryBroker').actions;
}

export function getAutomationMatrixReducer() {
    return getEntitySlice('automationMatrix').reducer;
}

export function getAutomationMatrixActions() {
    return getEntitySlice('automationMatrix').actions;
}

export function getBrokerReducer() {
    return getEntitySlice('broker').reducer;
}

export function getBrokerActions() {
    return getEntitySlice('broker').actions;
}

export function getDataInputComponentReducer() {
    return getEntitySlice('dataInputComponent').reducer;
}

export function getDataInputComponentActions() {
    return getEntitySlice('dataInputComponent').actions;
}

export function getDataOutputComponentReducer() {
    return getEntitySlice('dataOutputComponent').reducer;
}

export function getDataOutputComponentActions() {
    return getEntitySlice('dataOutputComponent').actions;
}

export function getDisplayOptionReducer() {
    return getEntitySlice('displayOption').reducer;
}

export function getDisplayOptionActions() {
    return getEntitySlice('displayOption').actions;
}

export function getEmailsReducer() {
    return getEntitySlice('emails').reducer;
}

export function getEmailsActions() {
    return getEntitySlice('emails').actions;
}

export function getExtractorReducer() {
    return getEntitySlice('extractor').reducer;
}

export function getExtractorActions() {
    return getEntitySlice('extractor').actions;
}

export function getFlashcardDataReducer() {
    return getEntitySlice('flashcardData').reducer;
}

export function getFlashcardDataActions() {
    return getEntitySlice('flashcardData').actions;
}

export function getFlashcardHistoryReducer() {
    return getEntitySlice('flashcardHistory').reducer;
}

export function getFlashcardHistoryActions() {
    return getEntitySlice('flashcardHistory').actions;
}

export function getFlashcardImagesReducer() {
    return getEntitySlice('flashcardImages').reducer;
}

export function getFlashcardImagesActions() {
    return getEntitySlice('flashcardImages').actions;
}

export function getFlashcardSetRelationsReducer() {
    return getEntitySlice('flashcardSetRelations').reducer;
}

export function getFlashcardSetRelationsActions() {
    return getEntitySlice('flashcardSetRelations').actions;
}

export function getFlashcardSetsReducer() {
    return getEntitySlice('flashcardSets').reducer;
}

export function getFlashcardSetsActions() {
    return getEntitySlice('flashcardSets').actions;
}

export function getProcessorReducer() {
    return getEntitySlice('processor').reducer;
}

export function getProcessorActions() {
    return getEntitySlice('processor').actions;
}

export function getRecipeReducer() {
    return getEntitySlice('recipe').reducer;
}

export function getRecipeActions() {
    return getEntitySlice('recipe').actions;
}

export function getRecipeBrokerReducer() {
    return getEntitySlice('recipeBroker').reducer;
}

export function getRecipeBrokerActions() {
    return getEntitySlice('recipeBroker').actions;
}

export function getRecipeDisplayReducer() {
    return getEntitySlice('recipeDisplay').reducer;
}

export function getRecipeDisplayActions() {
    return getEntitySlice('recipeDisplay').actions;
}

export function getRecipeFunctionReducer() {
    return getEntitySlice('recipeFunction').reducer;
}

export function getRecipeFunctionActions() {
    return getEntitySlice('recipeFunction').actions;
}

export function getRecipeModelReducer() {
    return getEntitySlice('recipeModel').reducer;
}

export function getRecipeModelActions() {
    return getEntitySlice('recipeModel').actions;
}

export function getRecipeProcessorReducer() {
    return getEntitySlice('recipeProcessor').reducer;
}

export function getRecipeProcessorActions() {
    return getEntitySlice('recipeProcessor').actions;
}

export function getRecipeToolReducer() {
    return getEntitySlice('recipeTool').reducer;
}

export function getRecipeToolActions() {
    return getEntitySlice('recipeTool').actions;
}

export function getRegisteredFunctionReducer() {
    return getEntitySlice('registeredFunction').reducer;
}

export function getRegisteredFunctionActions() {
    return getEntitySlice('registeredFunction').actions;
}

export function getSystemFunctionReducer() {
    return getEntitySlice('systemFunction').reducer;
}

export function getSystemFunctionActions() {
    return getEntitySlice('systemFunction').actions;
}

export function getToolReducer() {
    return getEntitySlice('tool').reducer;
}

export function getToolActions() {
    return getEntitySlice('tool').actions;
}

export function getTransformerReducer() {
    return getEntitySlice('transformer').reducer;
}

export function getTransformerActions() {
    return getEntitySlice('transformer').actions;
}

export function getUserPreferencesReducer() {
    return getEntitySlice('userPreferences').reducer;
}

export function getUserPreferencesActions() {
    return getEntitySlice('userPreferences').actions;
}



export function getConversationReducer() {
    return getEntitySlice('conversation').reducer;
}

export function getConversationActions() {
    return getEntitySlice('conversation').actions;
}

export function getConversationSelectors() {
    return getEntitySelectors('conversation');
}


export function getMessageReducer() {
    return getEntitySlice('message').reducer;
}

export function getMessageActions() {
    return getEntitySlice('message').actions;
}

export function getMessageSelectors() {
    return getEntitySelectors('message');
}

