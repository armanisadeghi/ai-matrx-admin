// app/json-components-demo/components/JsonDemoComponent.tsx
'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { JsonViewer, FullJsonViewer } from '@/components/ui/json/JsonViewer';
import { BaseJsonEditor, JsonEditorWithFormatting, FullJsonEditor } from '@/components/ui/json/JsonEditor';
import { simpleJsonObject, complexJsonObject, largeJsonObject, invalidJsonString, JsonDataType } from '../sampleData';

const JsonDemoComponent: React.FC = () => {
    const [currentData, setCurrentData] = useState<JsonDataType>(simpleJsonObject);
    const [isExpanded, setIsExpanded] = useState<boolean>(false);
    const [showFormatting, setShowFormatting] = useState<boolean>(false);
    const [editorData, setEditorData] = useState<string>(JSON.stringify(simpleJsonObject, null, 2));
    const [isInvalidJson, setIsInvalidJson] = useState<boolean>(false);

    const handleDataChange = (newData: string) => {
        setEditorData(newData);
        try {
            const parsedData = JSON.parse(newData);
            setCurrentData(parsedData as JsonDataType);
            setIsInvalidJson(false);
        } catch (error) {
            setIsInvalidJson(true);
        }
    };

    const handleDataSwitch = (dataType: 'simple' | 'complex' | 'large' | 'invalid') => {
        switch (dataType) {
            case 'simple':
                setCurrentData(simpleJsonObject);
                setEditorData(JSON.stringify(simpleJsonObject, null, 2));
                setIsInvalidJson(false);
                break;
            case 'complex':
                setCurrentData(complexJsonObject);
                setEditorData(JSON.stringify(complexJsonObject, null, 2));
                setIsInvalidJson(false);
                break;
            case 'large':
                setCurrentData(largeJsonObject);
                setEditorData(JSON.stringify(largeJsonObject, null, 2));
                setIsInvalidJson(false);
                break;
            case 'invalid':
                setEditorData(invalidJsonString);
                setIsInvalidJson(true);
                break;
        }
    };

    const handleEditorChange = (newData: string) => {
        setEditorData(newData);
        try {
            const parsedData = JSON.parse(newData);
            setCurrentData(parsedData as JsonDataType);
            setIsInvalidJson(false);
        } catch (error) {
            setIsInvalidJson(true);
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="space-y-8"
        >
            <Card>
                <CardHeader>
                    <CardTitle>JSON Component Demo</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-wrap gap-4 mb-4">
                        <Button onClick={() => handleDataSwitch('simple')}>Simple Data</Button>
                        <Button onClick={() => handleDataSwitch('complex')}>Complex Data</Button>
                        <Button onClick={() => handleDataSwitch('large')}>Large Data</Button>
                        <Button onClick={() => handleDataSwitch('invalid')}>Invalid JSON</Button>
                    </div>
                    <div className="flex items-center space-x-2 mb-4">
                        <Switch
                            id="expand-switch"
                            checked={isExpanded}
                            onCheckedChange={setIsExpanded}
                        />
                        <Label htmlFor="expand-switch">Expand All</Label>
                    </div>
                </CardContent>
            </Card>

            <Tabs defaultValue="viewer">
                <TabsList>
                    <TabsTrigger value="viewer">JSON Viewer</TabsTrigger>
                    <TabsTrigger value="editor">JSON Editor</TabsTrigger>
                </TabsList>
                <TabsContent value="viewer">
                    <Card>
                        <CardHeader>
                            <CardTitle>JSON Viewer Examples</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <h3 className="text-lg font-semibold mb-2">Basic JsonViewer</h3>
                                <JsonViewer data={currentData} initialExpanded={isExpanded} />
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold mb-2">FullJsonViewer</h3>
                                <FullJsonViewer
                                    data={currentData}
                                    initialExpanded={isExpanded}
                                    title="Custom Title for Full JSON Viewer"
                                />
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
                <TabsContent value="editor">
                    <Card>
                        <CardHeader>
                            <CardTitle>JSON Editor Examples</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <h3 className="text-lg font-semibold mb-2">Basic JsonEditor</h3>
                                <BaseJsonEditor
                                    initialData={editorData}
                                    onJsonChange={handleEditorChange}
                                />
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold mb-2">JsonEditor with Formatting</h3>
                                <div className="flex items-center space-x-2 mb-2">
                                    <Switch
                                        id="format-switch"
                                        checked={showFormatting}
                                        onCheckedChange={setShowFormatting}
                                    />
                                    <Label htmlFor="format-switch">Show Formatting Options</Label>
                                </div>
                                {showFormatting ? (
                                    <JsonEditorWithFormatting
                                        initialData={editorData}
                                        onJsonChange={handleEditorChange}
                                        onFormat={() => setEditorData(JSON.stringify(JSON.parse(editorData), null, 2))}
                                    />
                                ) : (
                                    <BaseJsonEditor
                                        initialData={editorData}
                                        onJsonChange={handleEditorChange}
                                    />
                                )}
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold mb-2">Full JsonEditor</h3>
                                <FullJsonEditor
                                    initialData={editorData}
                                    onJsonChange={handleEditorChange}
                                    onSave={(data) => console.log('Saving JSON:', data)}
                                    title="Custom Title for Full JSON Editor"
                                />
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
            {isInvalidJson && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="bg-destructive text-destructive-foreground p-4 rounded-md"
                >
                    Invalid JSON detected. Please correct the JSON format.
                </motion.div>
            )}
        </motion.div>
    );
};

export default JsonDemoComponent;
