'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { BrokerInput } from "../brokerComponents/BrokerInput";
import { BrokerSelect } from "../brokerComponents/BrokerSelect";
import { BrokerSlider } from "../brokerComponents/BrokerSlider";
import { BrokerSwitch } from "../brokerComponents/BrokerSwitch";
import { BrokerTextarea } from "../brokerComponents/BrokerTextarea";
import { mockData } from "../constants";
import BrokerTextareaGrow from '../brokerComponents/BrokerTextareaGrow';

export const BrokerSamplePage = () => {
    const [brokerValues, setBrokerValues] = useState<Record<string, any>>({});

    // Effect to watch our mock broker values map
    useEffect(() => {
        const updateValues = () => {
            const currentValues: Record<string, any> = {};
            mockData.brokerValues.forEach((value, key) => {
                currentValues[key] = value.data.value;
            });
            setBrokerValues(currentValues);
        };

        // Initial values
        updateValues();

        // Set up an interval to check for changes
        const interval = setInterval(updateValues, 100);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="pt-2 w-full h-full bg-background">
            <Card className='bg-background'>
                <CardHeader>
                    <CardTitle>Broker Component Test Page</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-6">
                    {/* Select Components */}
                    <div className="space-y-4">
                        <div className="grid gap-4 md:grid-cols-2">
                            <BrokerSelect brokerId="theme.selection" />
                            <BrokerSelect brokerId="language.selection" />
                        </div>
                    </div>

                    <Separator />

                    {/* Slider Components */}
                    <div className="space-y-4">
                        <div className="grid gap-4 md:grid-cols-2">
                            <BrokerSlider brokerId="system.volume" />
                            <BrokerSlider brokerId="music.volume" />
                        </div>
                    </div>

                    <Separator />

                    {/* Switch Components */}
                    <div className="space-y-4">
                        <div className="grid gap-4 md:grid-cols-2">
                            <BrokerSwitch brokerId="notifications.enabled" />
                            <BrokerSwitch brokerId="dark.mode" />
                        </div>
                    </div>

                    <Separator />

                    {/* Input Components */}
                    <div className="space-y-4">
                        <div className="grid gap-4 md:grid-cols-2">
                            <BrokerInput brokerId="user.email" />
                            <BrokerInput brokerId="user.name" />
                        </div>
                    </div>

                    <Separator />

                    {/* Textarea Components */}
                    <div className="space-y-4">
                        <div className="grid gap-4 md:grid-cols-2">
                            <BrokerTextareaGrow brokerId="user.bio" />
                            <BrokerTextarea brokerId="feedback.comments" />
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Current Values Display */}
            <Card className='bg-background pt-12'>
                <CardHeader>
                    <CardTitle>Current Broker Values</CardTitle>
                </CardHeader>
                <CardContent>
                    <ScrollArea className="h-[300px] w-full rounded-md border p-4">
                        <pre className="text-sm">
                            {JSON.stringify(brokerValues, null, 2)}
                        </pre>
                    </ScrollArea>
                </CardContent>
            </Card>
        </div>
    );
};

export default BrokerSamplePage;