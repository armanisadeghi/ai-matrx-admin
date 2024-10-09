'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { BaseJsonEditor, JsonEditorWithFormatting, FullJsonEditor } from '@/components/ui/json/JsonEditor';
import { simpleJsonObject, complexJsonObject, largeJsonObject, invalidJsonString, JsonDataType } from '../sampleData';

const EnhancedJsonDemoComponent: React.FC = () => {
    const [currentData, setCurrentData] = useState<string>(JSON.stringify(simpleJsonObject, null, 2));
    const [showFormatting, setShowFormatting] = useState<boolean>(false);
    const [validateDelay, setValidateDelay] = useState<number>(500);

    const handleDataChange = (newData: string) => {
        setCurrentData(newData);
    };

    const handleFormat = () => {
        try {
            const formatted = JSON.stringify(JSON.parse(currentData), null, 2);
            setCurrentData(formatted);
        } catch (error) {
            console.error('Error formatting JSON:', error);
        }
    };

    const handleSave = (data: string) => {
        console.log('Saved data:', JSON.parse(data));
    };

    const handleDataSwitch = (dataType: 'simple' | 'complex' | 'large' | 'invalid') => {
        switch (dataType) {
            case 'simple':
                setCurrentData(JSON.stringify(simpleJsonObject, null, 2));
                break;
            case 'complex':
                setCurrentData(JSON.stringify(complexJsonObject, null, 2));
                break;
            case 'large':
                setCurrentData(JSON.stringify(largeJsonObject, null, 2));
                break;
            case 'invalid':
                setCurrentData(invalidJsonString);
                break;
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="space-y-8 p-4"
        >
            <Card>
                <CardHeader>
                    <CardTitle>Enhanced JSON Editor Demo</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        <div className="flex space-x-4">
                            <Button onClick={() => handleDataSwitch('simple')}>Simple Data</Button>
                            <Button onClick={() => handleDataSwitch('complex')}>Complex Data</Button>
                            <Button onClick={() => handleDataSwitch('large')}>Large Data</Button>
                            <Button onClick={() => handleDataSwitch('invalid')}>Invalid Data</Button>
                        </div>
                        <div className="flex items-center space-x-2">
                            <Switch
                                id="formatting-switch"
                                checked={showFormatting}
                                onCheckedChange={setShowFormatting}
                            />
                            <Label htmlFor="formatting-switch">Show Formatting Options</Label>
                        </div>
                        <div>
                            <Label htmlFor="validate-delay">Validation Delay (ms)</Label>
                            <input
                                id="validate-delay"
                                type="number"
                                value={validateDelay}
                                onChange={(e) => setValidateDelay(Number(e.target.value))}
                                className="ml-2 p-1 border rounded"
                            />
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Tabs defaultValue="base">
                <TabsList>
                    <TabsTrigger value="base">Base Editor</TabsTrigger>
                    <TabsTrigger value="formatting">With Formatting</TabsTrigger>
                    <TabsTrigger value="full">Full Editor</TabsTrigger>
                </TabsList>
                <TabsContent value="base">
                    <Card>
                        <CardContent>
                            <BaseJsonEditor
                                initialData={currentData}
                                onJsonChange={handleDataChange}
                                validateDelay={validateDelay}
                            />
                        </CardContent>
                    </Card>
                </TabsContent>
                <TabsContent value="formatting">
                    <Card>
                        <CardContent>
                            <JsonEditorWithFormatting
                                initialData={currentData}
                                onJsonChange={handleDataChange}
                                onFormat={handleFormat}
                                validateDelay={validateDelay}
                            />
                        </CardContent>
                    </Card>
                </TabsContent>
                <TabsContent value="full">
                    <FullJsonEditor
                        initialData={currentData}
                        onJsonChange={handleDataChange}
                        onFormat={handleFormat}
                        onSave={handleSave}
                        title="Full JSON Editor"
                        validateDelay={validateDelay}
                    />
                </TabsContent>
            </Tabs>

            <Card>
                <CardHeader>
                    <CardTitle>Current JSON Data</CardTitle>
                </CardHeader>
                <CardContent>
                    <pre className="bg-gray-100 p-4 rounded-md overflow-auto max-h-60">
                        {currentData}
                    </pre>
                </CardContent>
            </Card>
        </motion.div>
    );
};

export default EnhancedJsonDemoComponent;
