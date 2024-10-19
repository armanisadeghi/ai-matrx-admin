// File: actions/ai.ts
'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import MultiApiBaseAdapter from '@/lib/ai/adapters/multiApiBaseAdapter'

const adapter = new MultiApiBaseAdapter('anthropic') // Or 'openai', depending on your preference

export async function generateAIResponse(formData: FormData) {
    const message = formData.get('message') as string
    const model = formData.get('model') as string
    const maxTokens = parseInt(formData.get('maxTokens') as string)

    const messages = [
        { role: 'user', content: message }
    ]

    const options = {
        model,
        maxTokens,
        temperature: 0.7,
    }

    let responseText = ''

    await adapter.streamResponse(
        messages,
        (chunk) => {
            responseText += chunk
        },
        options
    )

    // You might want to save the response to a database here

    revalidatePath('/ai-chat')
    return responseText
}

export async function generateFromRecipe(formData: FormData) {
    const recipeId = formData.get('recipeId') as string
    const variables = Object.fromEntries(formData.entries())

    // Fetch the recipe from your database using recipeId
    const recipe = await fetchRecipeFromDatabase(recipeId)

    const processedRecipe = adapter.replaceVariablesInRecipe(recipe, variables)

    let responseText = ''

    await adapter.streamResponse(
        processedRecipe,
        (chunk) => {
            responseText += chunk
        },
        { model: 'claude-3-sonnet-20240229' } // Or any other default options
    )

    // You might want to save the response to a database here

    revalidatePath('/recipes')
    return responseText
}

// Helper function to fetch recipe from database
async function fetchRecipeFromDatabase(recipeId: string) {
    // Implementation depends on your database setup
    // This is just a placeholder
    return [
        { role: 'system', content: 'You are a helpful assistant.' },
        { role: 'user', content: 'Hello, {name}!' }
    ]
}
