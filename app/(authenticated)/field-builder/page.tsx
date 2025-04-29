'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { CheckboxFieldBuilder } from '@/features/applet/builder/components/field-builders/CheckboxFieldBuilder';
import { GroupFieldConfig } from '@/features/applet/runner/components/field-components/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckSquare, Plus } from 'lucide-react';

export default function FieldBuilderPage() {
    const [isCheckboxBuilderOpen, setIsCheckboxBuilderOpen] = useState(false);
    const [savedFields, setSavedFields] = useState<GroupFieldConfig[]>([]);

    const handleSaveField = (field: GroupFieldConfig) => {
        setSavedFields(prev => [...prev, field]);
    };

    return (
        <div className="container mx-auto py-8 px-4">
            <div className="flex flex-col space-y-8">
                <div className="flex justify-between items-center">
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-50">Field Builder</h1>
                    <Button 
                        onClick={() => setIsCheckboxBuilderOpen(true)}
                        className="bg-rose-500 hover:bg-rose-600 dark:bg-rose-600 dark:hover:bg-rose-700 text-white"
                    >
                        <Plus className="mr-2 h-4 w-4" /> New Checkbox Field
                    </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {savedFields.map((field, index) => (
                        <Card key={index} className="border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-lg font-medium text-gray-900 dark:text-gray-100 flex items-center">
                                    <CheckSquare className="mr-2 h-5 w-5 text-rose-500" />
                                    {field.label}
                                </CardTitle>
                                <CardDescription className="text-sm text-gray-500 dark:text-gray-400">
                                    {field.brokerId}
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="pt-0">
                                <div className="text-sm text-gray-500 dark:text-gray-400">
                                    <p><span className="font-medium">Type:</span> Checkbox</p>
                                    <p><span className="font-medium">Placeholder:</span> {field.placeholder || '(None)'}</p>
                                </div>
                            </CardContent>
                        </Card>
                    ))}

                    {savedFields.length === 0 && (
                        <div className="col-span-full flex flex-col items-center justify-center p-12 border border-dashed border-gray-300 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-900">
                            <CheckSquare className="h-12 w-12 text-gray-400 dark:text-gray-600 mb-4" />
                            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">No fields yet</h3>
                            <p className="text-gray-500 dark:text-gray-400 text-center mb-4">
                                Create your first checkbox field by clicking the button above
                            </p>
                            <Button 
                                onClick={() => setIsCheckboxBuilderOpen(true)}
                                variant="outline"
                                className="border-rose-500 text-rose-500 hover:bg-rose-50 dark:border-rose-400 dark:text-rose-400 dark:hover:bg-rose-900/20"
                            >
                                <Plus className="mr-2 h-4 w-4" /> New Checkbox Field
                            </Button>
                        </div>
                    )}
                </div>
            </div>

            <CheckboxFieldBuilder
                isOpen={isCheckboxBuilderOpen}
                onClose={() => setIsCheckboxBuilderOpen(false)}
                onSave={handleSaveField}
            />
        </div>
    );
} 