// File: lib/ai/recipeUtils.ts

// Function to extract variables from a recipe
export function extractVariablesFromRecipe(recipe: any[]): string[] {
    const variableRegex = /\{([^}]+)\}/g;
    const variables: string[] = [];

    recipe.forEach(message => {
        message.content.forEach(contentPart => {
            let match;
            while ((match = variableRegex.exec(contentPart.text)) !== null) {
                variables.push(match[1]);
            }
        });
    });

    return Array.from(new Set(variables)); // Return unique variables
}

// Function to replace variables in a recipe with provided values
export function replaceVariablesInRecipe(recipe: any[], variableValues: { [key: string]: string }): any[] {
    return recipe.map(message => {
        const newMessage = { ...message };
        newMessage.content = message.content.map(contentPart => {
            let newText = contentPart.text;
            Object.keys(variableValues).forEach(variable => {
                const variablePlaceholder = `{${variable}}`;
                newText = newText.replace(new RegExp(variablePlaceholder, 'g'), variableValues[variable]);
            });
            return { ...contentPart, text: newText };
        });
        return newMessage;
    });
}
