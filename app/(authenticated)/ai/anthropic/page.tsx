'use client';

import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Slider } from "@/components/ui/slider"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { generateAIResponse } from '@/actions/ai'
import FullPromptInput from './FullPromptInput'


// https://claude.ai/chat/af737380-96d6-47ac-931e-cd7e7ef81e5b

export default function AIChat() {
    const [messages, setMessages] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [model, setModel] = useState('claude-3-sonnet-20240229');
    const [maxTokens, setMaxTokens] = useState(1000);
    const [temperature, setTemperature] = useState(0.7);
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [isRightPanelOpen, setIsRightPanelOpen] = useState(false);

    const handleSubmit = async (formData) => {
        const inputMessage = formData.get('message');
        if (!inputMessage) return;

        setIsLoading(true);
        const newMessage = { role: 'user', content: inputMessage };
        setMessages(prevMessages => [...prevMessages, newMessage]);

        formData.append('model', model);
        formData.append('maxTokens', maxTokens.toString());
        formData.append('temperature', temperature.toString());

        try {
            const response = await generateAIResponse(formData);
            const aiMessage = { role: 'assistant', content: response };
            setMessages(prevMessages => [...prevMessages, aiMessage]);
        } catch (error) {
            console.error('Error generating AI response:', error);
            // Handle error (e.g., show an error message to the user)
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex h-screen bg-gray-100 dark:bg-gray-900">
            {/* Left Sidebar */}
            <div className={`w-64 bg-white dark:bg-gray-800 transition-all duration-300 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                <Button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="absolute top-4 left-4">
                    {isSidebarOpen ? 'Hide' : 'Show'} Controls
                </Button>
                <Card className="m-4">
                    <CardHeader>
                        <CardTitle className="text-gray-800 dark:text-gray-200">Settings</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            <div>
                                <Label htmlFor="model" className="text-gray-700 dark:text-gray-300">Model</Label>
                                <Input
                                    id="model"
                                    value={model}
                                    onChange={(e) => setModel(e.target.value)}
                                    className="bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                                />
                            </div>
                            <div>
                                <Label htmlFor="maxTokens" className="text-gray-700 dark:text-gray-300">Max Tokens: {maxTokens}</Label>
                                <Slider
                                    id="maxTokens"
                                    min={1}
                                    max={2000}
                                    step={1}
                                    value={[maxTokens]}
                                    onValueChange={(value) => setMaxTokens(value[0])}
                                />
                            </div>
                            <div>
                                <Label htmlFor="temperature" className="text-gray-700 dark:text-gray-300">Temperature: {temperature.toFixed(2)}</Label>
                                <Slider
                                    id="temperature"
                                    min={0}
                                    max={1}
                                    step={0.01}
                                    value={[temperature]}
                                    onValueChange={(value) => setTemperature(value[0])}
                                />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Main Chat Area */}
            <div className="flex-1 flex flex-col">
                <Card className="flex-1 flex flex-col">
                    <CardHeader>
                        <CardTitle className="text-gray-800 dark:text-gray-200">AI Chat</CardTitle>
                        <CardDescription className="text-gray-600 dark:text-gray-400">Chat with Claude 3 Sonnet AI</CardDescription>
                    </CardHeader>
                    <CardContent className="flex-1 flex flex-col">
                        <ScrollArea className="flex-1 pr-4 mb-4">
                            {messages.map((msg, index) => (
                                <div key={index} className={`mb-4 ${msg.role === 'user' ? 'text-right' : 'text-left'}`}>
                                    <div className={`inline-block p-2 rounded-lg ${msg.role === 'user' ? 'bg-blue-100 dark:bg-blue-900 text-blue-900 dark:text-blue-100' : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100'}`}>
                                        {msg.content}
                                    </div>
                                </div>
                            ))}
                        </ScrollArea>
                        {/*<FullPromptInput onSubmit={handleSubmit} />*/}
                        <FullPromptInput />
                    </CardContent>
                </Card>
            </div>

            {/* Right Panel (Optional) */}
            {isRightPanelOpen && (
                <div className="w-1/2 bg-white dark:bg-gray-800">
                    {/* Content for the right panel */}
                </div>
            )}

            {/* Toggle for Right Panel */}
            <Button
                onClick={() => setIsRightPanelOpen(!isRightPanelOpen)}
                className="absolute top-4 right-4"
            >
                {isRightPanelOpen ? 'Close' : 'Open'} Right Panel
            </Button>
        </div>
    );
}
