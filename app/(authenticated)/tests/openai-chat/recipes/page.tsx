// File: pages/test-openai.tsx

'use client';

import React, { useState } from 'react';
import { getAvailableRecipes, getRecipeByName } from '@/lib/ai/providers/openai/data/openai-recipes';
import { extractVariablesFromRecipe, replaceVariablesInRecipe } from '@/lib/ai/providers/openai/recipeUtils';
import OpenAIAdapter from '@/lib/ai/adapters/openAiAdaptor';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea, Button, Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui';
import { ChevronDown, Paperclip, Mic } from 'lucide-react';
import {
    MatrxAccordion,
    MatrxAccordionItem,
    MatrxAccordionTrigger,
    MatrxAccordionContent,
} from '@/components/ui/samples';

const TestOpenAI = () => {
    const [selectedRecipe, setSelectedRecipe] = useState<string | null>(null);
    const [variables, setVariables] = useState<string[]>([]);
    const [variableValues, setVariableValues] = useState<{ [key: string]: string }>({});
    const [messages, setMessages] = useState<any[]>([]);
    const [response, setResponse] = useState<string>("");
    const [chatHistory, setChatHistory] = useState<{ role: string, content: string }[]>([]);
    const [accordionOpen, setAccordionOpen] = useState(true);

    const availableRecipes = getAvailableRecipes();

    const handleRecipeSelect = (recipeName: string) => {
        const recipe = getRecipeByName(recipeName);
        if (recipe) {
            const extractedVariables = extractVariablesFromRecipe(recipe);
            setVariables(extractedVariables);
            setSelectedRecipe(recipeName);
            setMessages(recipe);
            setVariableValues({});
            setAccordionOpen(true); // Open accordion when a new recipe is selected
        }
    };

    const handleVariableChange = (variable: string, value: string) => {
        setVariableValues(prev => ({ ...prev, [variable]: value }));
    };

    const handleSubmit = async () => {
        if (!selectedRecipe) return;

        const processedMessages = replaceVariablesInRecipe(messages, variableValues);
        setResponse("");

        const adapter = new OpenAIAdapter();
        await adapter.streamResponseByMessageHistory(processedMessages, { role: "user", content: "" }, (chunk: string) => {
            setResponse(prev => prev + chunk);
        });

        setChatHistory([...chatHistory, { role: 'user', content: Object.values(variableValues).join(' ') }]);
        setAccordionOpen(false); // Close accordion after submission
    };

    const handleMicClick = () => {
        console.log("Mic clicked");
    };

    return (
        <div className="container mx-auto p-4 space-y-6 overflow-auto h-screen">
            <h1 className="text-3xl font-bold mb-6">OpenAI Recipe Chat</h1>

            <Card>
                <CardHeader>
                    <CardTitle>Select a Recipe</CardTitle>
                </CardHeader>
                <CardContent>
                    <Select onValueChange={handleRecipeSelect} defaultValue="">
                        <SelectTrigger>
                            <SelectValue placeholder="Select a recipe" />
                            <ChevronDown className="ml-2 h-4 w-4" />
                        </SelectTrigger>
                        <SelectContent>
                            {availableRecipes.map(recipe => (
                                <SelectItem key={recipe} value={recipe}>
                                    {recipe}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </CardContent>
            </Card>

            {variables.length > 0 && (
                <MatrxAccordion type="single" value={accordionOpen ? 'variables' : ''}>
                    <MatrxAccordionItem value="variables">
                        <MatrxAccordionTrigger>Variables</MatrxAccordionTrigger>
                        <MatrxAccordionContent>
                            {variables.map(variable => (
                                <div key={variable} className="mb-4">
                                    <label className="block mb-2 font-medium">{variable}</label>
                                    <Textarea
                                        className="w-full"
                                        onChange={(e) => handleVariableChange(variable, e.target.value)}
                                    />
                                </div>
                            ))}
                            <Button className="bg-primary text-white" onClick={handleSubmit}>
                                Submit
                            </Button>
                        </MatrxAccordionContent>
                    </MatrxAccordionItem>
                </MatrxAccordion>
            )}

            <div className="space-y-4">
                {chatHistory.map((message, index) => (
                    <Card key={index} className="bg-muted">
                        <CardContent>
                            <p className={message.role === 'user' ? 'text-right' : 'text-left'}>
                                {message.content}
                            </p>
                        </CardContent>
                    </Card>
                ))}

                {response && (
                    <Card>
                        <CardContent>
                            <p className="text-left">{response}</p>
                        </CardContent>
                    </Card>
                )}
            </div>

            <div className="sticky bottom-0 left-0 right-0 p-4 bg-background">
                <Textarea
                    className="w-full mb-2"
                    placeholder="Type your message..."
                />
                <div className="flex justify-end space-x-2">
                    <Button variant="ghost" onClick={handleMicClick}>
                        <Mic />
                    </Button>
                    <Button variant="ghost">
                        <Paperclip />
                    </Button>
                    <Button className="bg-primary text-white">
                        Send
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default TestOpenAI;
