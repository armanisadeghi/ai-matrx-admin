'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import Json from 'components/ui/JsonComponents';
import { simpleJsonObject, complexJsonObject, largeJsonObject, invalidJsonString, JsonDataType } from '../sampleData';
import TextDivider from "@/components/matrx/TextDivider";

const EnhancedJsonDemoComponent: React.FC = () => {
    const [currentData, setCurrentData] = useState<string | object>(JSON.stringify(simpleJsonObject, null, 2));
    const [showFormatting, setShowFormatting] = useState<boolean>(false);
    const [validateDelay, setValidateDelay] = useState<number>(500);
    const [isStringMode, setIsStringMode] = useState<boolean>(true);

    const handleDataChange = (newData: string | object) => {
        setCurrentData(newData);
    };

    const handleDataSwitch = (dataType: 'simple' | 'complex' | 'large' | 'invalid') => {
        switch (dataType) {
            case 'simple':
                setCurrentData(isStringMode ? JSON.stringify(simpleJsonObject, null, 2) : simpleJsonObject);
                break;
            case 'complex':
                setCurrentData(isStringMode ? JSON.stringify(complexJsonObject, null, 2) : complexJsonObject);
                break;
            case 'large':
                setCurrentData(isStringMode ? JSON.stringify(largeJsonObject, null, 2) : largeJsonObject);
                break;
            case 'invalid':
                setCurrentData(invalidJsonString);
                break;
        }
    };

    const toggleDataMode = () => {
        setIsStringMode(!isStringMode);
        setCurrentData(isStringMode ? JSON.parse(currentData as string) : JSON.stringify(currentData, null, 2));
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
                        <div className="flex items-center space-x-2">
                            <Switch
                                id="mode-switch"
                                checked={isStringMode}
                                onCheckedChange={toggleDataMode}
                            />
                            <Label htmlFor="mode-switch">String Mode (vs Object Mode)</Label>
                        </div>
                        <div>
                            <Label htmlFor="validate-delay">Validation Delay (ms)</Label>
                            <Input
                                id="validate-delay"
                                type="number"
                                value={validateDelay}
                                onChange={(e) => setValidateDelay(Number(e.target.value))}
                                className="w-24"
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
                            <TextDivider text="Json.Editor (Base)" />
                            <Json.Editor
                                data={currentData}
                                onChange={handleDataChange}
                                validateDelay={validateDelay}
                            />
                            <TextDivider text="END" />
                        </CardContent>
                    </Card>
                </TabsContent>
                <TabsContent value="formatting">
                    <Card>
                        <CardContent>
                            <TextDivider text="Json.Editor (with Formatting)" />
                            <Json.Editor
                                data={currentData}
                                onChange={handleDataChange}
                                validateDelay={validateDelay}
                                onFormat={() => {}}
                            />
                            <TextDivider text="END" />
                        </CardContent>
                    </Card>
                </TabsContent>
                <TabsContent value="full">
                    <TextDivider text="Json.FullEditor" />
                    <Json.FullEditor
                        data={currentData}
                        onChange={handleDataChange}
                        validateDelay={validateDelay}
                        title="Full JSON Editor"
                    />
                    <TextDivider text="END" />
                </TabsContent>
            </Tabs>

            <Card>
                <CardHeader>
                    <CardTitle>Current JSON Data</CardTitle>
                </CardHeader>
                <CardContent>
                    <pre className="p-4 rounded-md overflow-auto max-h-60">
                        {typeof currentData === 'string' ? currentData : JSON.stringify(currentData, null, 2)}
                    </pre>
                </CardContent>
            </Card>
        </motion.div>
    );
};

export default EnhancedJsonDemoComponent;
