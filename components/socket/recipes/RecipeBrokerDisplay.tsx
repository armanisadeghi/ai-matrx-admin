'use client';

import React from 'react';
import {
    Card,
    Input,
    Switch,
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
    Button,
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui';
import {Info} from 'lucide-react';
import {getDisplayValue, getFormattedTitle} from "@/components/socket/recipes/utils";

interface RecipeBrokerDisplayProps {
    taskIndex: number;
    brokers: BrokerDefinitions[];
    updateBroker: (taskIndex: number, brokerId: string, field: string, value: any) => void;
}

export interface BrokerDefinitions {
    id: string;
    official_name: string;
    name?: string;
    data_type: string;
    required: boolean;
    default_value?: unknown;
    value?: unknown;
    ready?: string;
    [key: string]: unknown;
}

const BrokerDetailsDialog = ({broker}: { broker: BrokerDefinitions }) => {
    return (
        <Dialog >
            <DialogTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                    <Info className="h-4 w-4"/>
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>{getFormattedTitle(broker.name, broker.official_name)}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                    {Object.entries(broker).map(([key, value]) => (
                        <div key={key} className="grid grid-cols-3 gap-2">
                            <div className="font-medium capitalize col-span-1">
                                {key.replace(/_/g, ' ')}
                            </div>
                            <div className="col-span-2">
                                {typeof value === 'object'
                                 ? JSON.stringify(value)
                                 : String(value)}
                            </div>
                        </div>
                    ))}
                </div>
            </DialogContent>
        </Dialog>
    );
};

export function RecipeBrokerDisplay(
    {
        taskIndex,
        brokers,
        updateBroker
    }: RecipeBrokerDisplayProps) {
    return (
        <Accordion type="single" collapsible defaultValue="brokers">
            <AccordionItem value="brokers">
                <AccordionTrigger>Broker Values</AccordionTrigger>
                <AccordionContent>
                    <div className="space-y-2 pt-2">
                        {brokers.map((broker) => (
                            <Card key={broker.id} className="p-4">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-lg font-semibold">
                                        {getFormattedTitle(broker.name, broker.official_name)}
                                    </h3>
                                    <BrokerDetailsDialog broker={broker}/>
                                </div>
                                <div className="space-y-4">
                                    <Input
                                        value={getDisplayValue(broker.value ?? broker.default_value)}
                                        onChange={(e) => updateBroker(taskIndex, broker.id, 'value', e.target.value)}
                                        placeholder="Enter value"
                                    />
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm text-muted-foreground">Mark as ready</span>
                                        <Switch
                                            checked={broker.ready === "True"}
                                            onCheckedChange={(checked) =>
                                                updateBroker(taskIndex, broker.id, 'ready', checked ? "True" : "False")
                                            }
                                        />
                                    </div>
                                </div>
                            </Card>
                        ))}
                    </div>
                </AccordionContent>
            </AccordionItem>
        </Accordion>
    );
}
