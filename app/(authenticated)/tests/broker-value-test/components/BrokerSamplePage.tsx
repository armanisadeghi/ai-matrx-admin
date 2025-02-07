'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { BrokerInput } from "../brokerComponents/BrokerInput";
import { BrokerSelect } from "../brokerComponents/BrokerSelect";
import { BrokerSlider } from "../brokerComponents/BrokerSlider";
import { BrokerSwitch } from "../brokerComponents/BrokerSwitch";
import { mockData } from "../constants";

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
        <div className="container mx-auto py-6 space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Broker Component Test Page</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-6">
                    {/* Select Components */}
                    <div className="space-y-4">
                        <h3 className="text-lg font-semibold">Select Components</h3>
                        <div className="grid gap-4 md:grid-cols-2">
                            <BrokerSelect brokerId="theme.selection" />
                            <BrokerSelect brokerId="language.selection" />
                        </div>
                    </div>

                    <Separator />

                    {/* Slider Components */}
                    <div className="space-y-4">
                        <h3 className="text-lg font-semibold">Slider Components</h3>
                        <div className="grid gap-4 md:grid-cols-2">
                            <BrokerSlider brokerId="system.volume" />
                            <BrokerSlider brokerId="music.volume" />
                        </div>
                    </div>

                    <Separator />

                    {/* Switch Components */}
                    <div className="space-y-4">
                        <h3 className="text-lg font-semibold">Switch Components</h3>
                        <div className="grid gap-4 md:grid-cols-2">
                            <BrokerSwitch brokerId="notifications.enabled" />
                            <BrokerSwitch brokerId="dark.mode" />
                        </div>
                    </div>

                    <Separator />

                    {/* Input Components */}
                    <div className="space-y-4">
                        <h3 className="text-lg font-semibold">Input Components</h3>
                        <div className="grid gap-4 md:grid-cols-2">
                            <BrokerInput brokerId="user.email" />
                            <BrokerInput brokerId="user.name" />
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Current Values Display */}
            <Card>
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
