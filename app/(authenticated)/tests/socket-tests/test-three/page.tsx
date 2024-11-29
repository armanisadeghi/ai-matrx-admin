'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useInitializeSocket } from '@/lib/redux/socket/useInitializeSocket';
import { SocketManager } from '@/lib/redux/socket/manager';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Minus, Send, Trash2, Database } from 'lucide-react';
import {RECIPE_DATABASE} from "./recipe-data";


export function SocketTester() {
    useInitializeSocket();

    // Base state
    const [namespace, setNamespace] = useState('UserSession');
    const [event, setEvent] = useState('simple_recipe');
    const [streamEnabled, setStreamEnabled] = useState(true);

    // Task data state with proper indexing
    const [tasks, setTasks] = useState([{
        task: 'run_recipe',
        index: "0",
        stream: 'True',
        taskData: {
            recipe_id: '',
            broker_values: [],
            overrides: {
                model_override: '',
                processor_overrides: '{}',
                other_overrides: '{}'
            }
        }
    }]);

    // Response state
    const [streamingResponse, setStreamingResponse] = useState('');
    const [responses, setResponses] = useState([]);
    const responseRef = useRef(null);

    // Auto-scroll streaming response
    useEffect(() => {
        if (responseRef.current) {
            responseRef.current.scrollTop = responseRef.current.scrollHeight;
        }
    }, [streamingResponse]);

    const loadRecipeData = (taskIndex, recipeId) => {
        const recipe = RECIPE_DATABASE[recipeId];
        if (!recipe) return;

        setTasks(prev => prev.map((task, i) => {
            if (i === taskIndex) {
                return {
                    ...task,
                    taskData: {
                        recipe_id: recipeId,
                        broker_values: recipe.brokers.map(broker => ({
                            ...broker,
                            value: broker.default_value
                        })),
                        overrides: recipe.default_overrides
                    }
                };
            }
            return task;
        }));
    };

    const addTask = () => {
        setTasks(prev => [...prev, {
            task: 'run_recipe',
            index: prev.length.toString(), // Explicit index tracking
            stream: 'True',
            taskData: {
                recipe_id: '',
                broker_values: [],
                overrides: {
                    model_override: '',
                    processor_overrides: '{}',
                    other_overrides: '{}'
                }
            }
        }]);
    };

    const removeTask = (index) => {
        setTasks(prev => {
            const newTasks = prev.filter((_, i) => i !== index);
            // Reindex remaining tasks
            return newTasks.map((task, i) => ({
                ...task,
                index: i.toString()
            }));
        });
    };

    const updateTask = (taskIndex, field, value) => {
        setTasks(prev => prev.map((task, i) => {
            if (i === taskIndex) {
                return { ...task, [field]: value };
            }
            return task;
        }));
    };

    const updateTaskData = (taskIndex, field, value) => {
        setTasks(prev => prev.map((task, i) => {
            if (i === taskIndex) {
                return {
                    ...task,
                    taskData: {
                        ...task.taskData,
                        [field]: value
                    }
                };
            }
            return task;
        }));
    };

    const updateBroker = (taskIndex, brokerId, field, value) => {
        setTasks(prev => prev.map((task, i) => {
            if (i === taskIndex) {
                const newBrokers = task.taskData.broker_values.map(broker => {
                    if (broker.id === brokerId) {
                        return { ...broker, [field]: value };
                    }
                    return broker;
                });
                return {
                    ...task,
                    taskData: {
                        ...task.taskData,
                        broker_values: newBrokers
                    }
                };
            }
            return task;
        }));
    };

    const handleSend = () => {
        const socketManager = SocketManager.getInstance();
        setStreamingResponse('');
        setResponses([]);

        const payload = tasks.map(task => ({
            ...task,
            stream: streamEnabled.toString(),
            taskData: {
                ...task.taskData,
                overrides: {
                    model_override: task.taskData.overrides.model_override,
                    processor_overrides: JSON.parse(task.taskData.overrides.processor_overrides || '{}'),
                    other_overrides: JSON.parse(task.taskData.overrides.other_overrides || '{}')
                }
            }
        }));

        console.log('Emitting payload:', payload);

        socketManager.startTask(event, payload, (response) => {
            if (response && typeof response === 'object' && 'data' in response) {
                setStreamingResponse(prev => prev + response.data);
            } else if (typeof response === 'string') {
                setStreamingResponse(prev => prev + response);
            } else {
                setResponses(prev => [...prev, response]);
            }
        });
    };

    const handleClear = () => {
        setStreamingResponse('');
        setResponses([]);
    };

    return (
        <div className="p-4 max-w-6xl mx-auto space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Socket.IO Tester</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-2 gap-4 mb-4">
                        <div>
                            <Label>Namespace</Label>
                            <Input
                                value={namespace}
                                onChange={(e) => setNamespace(e.target.value)}
                                className="mt-1"
                            />
                        </div>
                        <div>
                            <Label>Event</Label>
                            <Input
                                value={event}
                                onChange={(e) => setEvent(e.target.value)}
                                className="mt-1"
                            />
                        </div>
                    </div>

                    <div className="flex items-center space-x-2 mb-6">
                        <Switch
                            checked={streamEnabled}
                            onCheckedChange={setStreamEnabled}
                        />
                        <Label>Enable Streaming</Label>
                    </div>

                    <div className="space-y-4">
                        {tasks.map((task, taskIndex) => (
                            <Card key={taskIndex} className="p-4">
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="text-lg font-semibold">Task {parseInt(task.index) + 1}</h3>
                                    <Button
                                        variant="destructive"
                                        size="sm"
                                        onClick={() => removeTask(taskIndex)}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>

                                <div className="grid grid-cols-2 gap-4 mb-4">
                                    <div>
                                        <Label>Task Type</Label>
                                        <Input
                                            value={task.task}
                                            onChange={(e) => updateTask(taskIndex, 'task', e.target.value)}
                                            className="mt-1"
                                        />
                                    </div>
                                    <div>
                                        <Label>Recipe</Label>
                                        <Select
                                            value={task.taskData.recipe_id}
                                            onValueChange={(value) => loadRecipeData(taskIndex, value)}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select a recipe..." />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {Object.entries(RECIPE_DATABASE)
                                                    .sort(([, recipeA], [, recipeB]) =>
                                                        (recipeA.name || '').localeCompare(recipeB.name || '')
                                                    )
                                                    .map(([id, recipe]) => (
                                                        <SelectItem key={id} value={id}>
                                                            {recipe.name || id}
                                                        </SelectItem>
                                                    ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                {task.taskData.broker_values.length > 0 && (
                                    <div className="space-y-4">
                                        <h4 className="font-medium">Broker Values</h4>
                                        {task.taskData.broker_values.map((broker) => (
                                            <Card key={broker.id} className="p-4">
                                                <div className="space-y-4">
                                                    <div className="grid grid-cols-2 gap-4">
                                                        <div>
                                                            <Label>Name</Label>
                                                            <Input
                                                                value={broker.name}
                                                                disabled
                                                                className="mt-1 bg-muted"
                                                            />
                                                        </div>
                                                        <div>
                                                            <Label>Official Name</Label>
                                                            <Input
                                                                value={broker.official_name}
                                                                disabled
                                                                className="mt-1 bg-muted"
                                                            />
                                                        </div>
                                                        <div>
                                                            <Label>Value</Label>
                                                            <Input
                                                                value={broker.value ?? ''}
                                                                onChange={(e) => updateBroker(taskIndex, broker.id, 'value', e.target.value)}
                                                                className="mt-1"
                                                            />
                                                        </div>
                                                        <div className="flex items-center space-x-2">
                                                            <Label>Ready Status</Label>
                                                            <Switch
                                                                checked={broker.ready === "True"}
                                                                onCheckedChange={(checked) =>
                                                                    updateBroker(taskIndex, broker.id, 'ready', checked ? "True" : "False")
                                                                }
                                                            />
                                                        </div>
                                                    </div>
                                                    <div className="text-sm text-muted-foreground">
                                                        ID: {broker.id} • Type: {broker.data_type}
                                                    </div>
                                                </div>
                                            </Card>
                                        ))}
                                    </div>
                                )}

                                <div className="space-y-4 mt-4">
                                    <h4 className="font-medium">Overrides</h4>
                                    <div className="grid grid-cols-1 gap-4">
                                        <div>
                                            <Label>Model Override</Label>
                                            <Input
                                                value={task.taskData.overrides.model_override}
                                                onChange={(e) => updateTaskData(taskIndex, 'overrides', {
                                                    ...task.taskData.overrides,
                                                    model_override: e.target.value
                                                })}
                                                className="mt-1"
                                            />
                                        </div>
                                        <div>
                                            <Label>Processor Overrides (JSON)</Label>
                                            <Input
                                                value={task.taskData.overrides.processor_overrides}
                                                onChange={(e) => updateTaskData(taskIndex, 'overrides', {
                                                    ...task.taskData.overrides,
                                                    processor_overrides: e.target.value
                                                })}
                                                className="mt-1"
                                            />
                                        </div>
                                        <div>
                                            <Label>Other Overrides (JSON)</Label>
                                            <Input
                                                value={task.taskData.overrides.other_overrides}
                                                onChange={(e) => updateTaskData(taskIndex, 'overrides', {
                                                    ...task.taskData.overrides,
                                                    other_overrides: e.target.value
                                                })}
                                                className="mt-1"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </Card>
                        ))}

                        <div className="flex justify-center">
                            <Button
                                variant="outline"
                                onClick={addTask}
                            >
                                <Plus className="h-4 w-4 mr-2" /> Add Task
                            </Button>
                        </div>
                    </div>

                    <div className="flex justify-between mt-6">
                        <Button
                            variant="default"
                            onClick={handleSend}
                            className="w-32"
                        >
                            <Send className="h-4 w-4 mr-2" /> Send
                        </Button>
                        <Button
                            variant="secondary"
                            onClick={handleClear}
                            className="w-32"
                        >
                            <Trash2 className="h-4 w-4 mr-2" /> Clear
                        </Button>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Response</CardTitle>
                </CardHeader>
                <CardContent>
                    <Tabs defaultValue="stream">
                        <TabsList>
                            <TabsTrigger value="stream">Streaming</TabsTrigger>
                            <TabsTrigger value="structured">Structured</TabsTrigger>
                        </TabsList>
                        <TabsContent value="stream">
                            <ScrollArea className="h-[300px] w-full rounded-md border p-4">
                                <div ref={responseRef} className="whitespace-pre-wrap font-mono">
                                    {streamingResponse}
                                </div>
                            </ScrollArea>
                        </TabsContent>
                        <TabsContent value="structured">
                            <ScrollArea className="h-[300px] w-full rounded-md border p-4">
                                <div className="space-y-2">
                                    {responses.map((response, index) => (
                                        <div key={index} className="font-mono">
                                            {JSON.stringify(response, null, 2)}
                                        </div>
                                    ))}
                                </div>
                            </ScrollArea>
                        </TabsContent>
                    </Tabs>
                </CardContent>
            </Card>
        </div>
    );
}

export default SocketTester;
