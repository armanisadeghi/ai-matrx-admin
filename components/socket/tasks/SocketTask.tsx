// File Location: components/socket/tasks/SocketTask.tsx
'use client';

import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
    Button,
    Input,
    Label,
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from '@/components/ui';
import {SquarePlus, Trash2} from 'lucide-react';
import {SocketTask} from '@/lib/redux/socket/hooks/useRecipeSocket';
import {RECIPE_DATABASE} from '@/lib/redux/socket/constants/recipe-data';
import {RecipeBrokerDisplay} from '../recipes/RecipeBrokerDisplay';
import {RecipeOverrides} from '../recipes/RecipeOverrides';

interface SocketTaskComponentProps {
    task: SocketTask;
    taskIndex: number;
    removeTask: (index: number) => void;
    updateTask: (taskIndex: number, field: string, value: any) => void;
    loadRecipeData: (taskIndex: number, recipeId: string) => void;
    updateTaskData: (taskIndex: number, field: string, value: any) => void;
    updateBroker: (taskIndex: number, brokerId: string, field: string, value: any) => void;
}

export function SocketTaskComponent(
    {
        task,
        taskIndex,
        removeTask,
        updateTask,
        loadRecipeData,
        updateTaskData,
        updateBroker
    }: SocketTaskComponentProps) {
    return (
        <Accordion type="single" collapsible className="w-full">
            <AccordionItem value={`task-${taskIndex}`}>
                <AccordionTrigger
                    rightElements={
                        <Button
                            variant="destructive"
                            size="sm"
                            onClick={(e) => {
                                e.stopPropagation();
                                removeTask(taskIndex);
                            }}
                            className="h-6 w-6 p-0"
                        >
                            <Trash2 className="h-3 w-3"/>
                        </Button>
                    }
                >
                    Task {task.index + 1}
                </AccordionTrigger>
                <AccordionContent>
                    <div className="space-y-4 pt-2">
                        <div className="grid grid-cols-2 gap-4">
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
                                        <SelectValue placeholder="Select a recipe..."/>
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
                            <RecipeBrokerDisplay
                                taskIndex={taskIndex}
                                brokers={task.taskData.broker_values}
                                updateBroker={updateBroker}
                            />
                        )}

                        <RecipeOverrides
                            taskIndex={taskIndex}
                            overrides={task.taskData.overrides}
                            updateTaskData={updateTaskData}
                        />
                    </div>
                </AccordionContent>
            </AccordionItem>
        </Accordion>
    );
}

