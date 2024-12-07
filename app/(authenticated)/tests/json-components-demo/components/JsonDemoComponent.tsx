// app/json-components-demo/components/JsonDemoComponent.tsx
'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';


import { simpleJsonObject, complexJsonObject, largeJsonObject, invalidJsonString, JsonDataType } from '../sampleData';
import TextDivider from "@/components/matrx/TextDivider";
import {JsonViewer} from "@/components/ui";
import {MatrxJson} from "components/ui/JsonComponents";
import {FullJsonViewer} from "components/ui/JsonComponents";
import MiniJsonViewer from "@/app/(authenticated)/tests/json-components-demo/components/MiniJsonViewer";
import MiniFullEditableJsonViewer, {
    MiniEditableJsonViewer
} from "@/app/(authenticated)/tests/json-components-demo/components/MiniJsonEditor";

const JsonDemoComponent: React.FC = () => {
    const [currentData, setCurrentData] = useState<JsonDataType>(simpleJsonObject);
    const [isExpanded, setIsExpanded] = useState<boolean>(false);
    const [showFormatting, setShowFormatting] = useState<boolean>(false);
    const [editorData, setEditorData] = useState<string | object>(JSON.stringify(simpleJsonObject, null, 2));
    const [isInvalidJson, setIsInvalidJson] = useState<boolean>(false);
    const [isStringMode, setIsStringMode] = useState<boolean>(true);

    const handleDataChange = (newData: string | object) => {
        setEditorData(newData);
        try {
            const parsedData = typeof newData === 'string' ? JSON.parse(newData) : newData;
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
                setEditorData(isStringMode ? JSON.stringify(simpleJsonObject, null, 2) : simpleJsonObject);
                setIsInvalidJson(false);
                break;
            case 'complex':
                setCurrentData(complexJsonObject);
                setEditorData(isStringMode ? JSON.stringify(complexJsonObject, null, 2) : complexJsonObject);
                setIsInvalidJson(false);
                break;
            case 'large':
                setCurrentData(largeJsonObject);
                setEditorData(isStringMode ? JSON.stringify(largeJsonObject, null, 2) : largeJsonObject);
                setIsInvalidJson(false);
                break;
            case 'invalid':
                setEditorData(invalidJsonString);
                setIsInvalidJson(true);
                break;
        }
    };

    const toggleDataMode = () => {
        setIsStringMode(!isStringMode);
        setEditorData(isStringMode ? currentData : JSON.stringify(currentData, null, 2));
    };

    const handleFormat = () => {
        if (typeof editorData === 'string') {
            try {
                const formatted = JSON.stringify(JSON.parse(editorData), null, 2);
                setEditorData(formatted);
            } catch (error) {
                console.error('Error formatting JSON:', error);
            }
        } else if (typeof editorData === 'object') {
            setEditorData(JSON.stringify(editorData, null, 2));
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
                    <div className="flex items-center space-x-2 mb-4">
                        <Switch
                            id="mode-switch"
                            checked={isStringMode}
                            onCheckedChange={toggleDataMode}
                        />
                        <Label htmlFor="mode-switch">String Mode (vs Object Mode)</Label>
                    </div>
                </CardContent>
            </Card>

            <Tabs defaultValue="viewer">
                <TabsList>
                    <TabsTrigger value="viewer">JSON Viewer</TabsTrigger>
                    <TabsTrigger value="editor">JSON Editor</TabsTrigger>
                    <TabsTrigger value="miniViewer">Mini Viewer</TabsTrigger>
                    <TabsTrigger value="miniEditor">Mini Editor</TabsTrigger>
                </TabsList>
                <TabsContent value="viewer">
                    <Card>
                        <CardContent className="space-y-4">
                            <div>
                                <TextDivider text={'Basic JsonViewer'} />
                                <JsonViewer data={currentData} initialExpanded={isExpanded} />
                                <TextDivider text={'END'} />
                            </div>
                            <div>
                                <TextDivider text={'FullJsonViewer'} />
                                <FullJsonViewer
                                    data={currentData}
                                    initialExpanded={isExpanded}
                                    title="Custom Title for Full JSON Viewer"
                                />
                                <TextDivider text={'END'} />
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
                                <TextDivider text={'Basic Json Editor: Json.Editor'} />
                                <Json.Editor
                                    data={editorData}
                                    onChange={handleDataChange}
                                    initialExpanded={isExpanded}
                                />
                                <TextDivider text={'END'} />
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
                                    <>
                                        <TextDivider text={'JsonEditor with Formatting'} />
                                        <Json.Editor
                                            data={editorData}
                                            onChange={handleDataChange}
                                            onFormat={handleFormat}
                                            initialExpanded={isExpanded}
                                        />
                                        <TextDivider text={'END'} />
                                    </>
                                ) : (
                                    <>
                                        <TextDivider text={'Basic Json Editor (when formatting is off)'} />
                                        <Json.Editor
                                            data={editorData}
                                            onChange={handleDataChange}
                                            initialExpanded={isExpanded}
                                        />
                                        <TextDivider text={'END'} />
                                    </>
                                )}
                            </div>
                            <div>
                                <TextDivider text={'Full Json Editor: Json.FullEditor'} />
                                <Json.FullEditor
                                    data={editorData}
                                    onChange={handleDataChange}
                                    title="Custom Title for Full JSON Editor"
                                    initialExpanded={isExpanded}
                                />
                                <TextDivider text={'END'} />
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
                <TabsContent value="miniViewer">
                    <Card>
                        <CardContent className="space-y-4">
                            <div>
                                <TextDivider text={'Basic JsonViewer'} />
                                <MiniJsonViewer data={currentData} initialExpanded={isExpanded} />
                                <TextDivider text={'END'} />
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
                <TabsContent value="miniEditor">
                    <Card>
                        <CardContent className="space-y-4">
                            <div>
                                <TextDivider text={'Basic JsonViewer'} />
                                <MiniEditableJsonViewer data={currentData} initialExpanded={isExpanded} />
                                <TextDivider text={'END'} />
                            </div>
                            <div>
                                <TextDivider text={'FullJsonViewer'} />
                                <MiniFullEditableJsonViewer
                                    data={currentData}
                                    initialExpanded={isExpanded}
                                    title="Custom Title for Full JSON Viewer"
                                />
                                <TextDivider text={'END'} />
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
