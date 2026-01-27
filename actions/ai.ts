// File: actions/ai.ts
'use server'

import MultiApiBaseAdapter, { type Message } from '@/lib/ai/adapters/MultiApiBaseAdapter'
// https://claude.ai/chat/af737380-96d6-47ac-931e-cd7e7ef81e5b

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'


const adapter = new MultiApiBaseAdapter('anthropic') // Or 'openai', depending on your preference

export async function generateAIResponse(formData: FormData) {
    const message = formData.get('message') as string
    const model = formData.get('model') as string
    const maxTokens = parseInt(formData.get('maxTokens') as string)

    const messages: Message[] = [
        { role: 'user' as const, content: message }
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
    const variables: { [key: string]: string } = {}
    for (const [key, value] of formData.entries()) {
        if (typeof value === 'string') {
            variables[key] = value
        }
    }

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
async function fetchRecipeFromDatabase(recipeId: string): Promise<Message[]> {
    // Implementation depends on your database setup
    // This is just a placeholder
    return [
        { role: 'assistant' as const, content: 'You are a helpful assistant.' },
        { role: 'user' as const, content: 'Hello, {name}!' }
    ]
}
