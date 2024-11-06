/*
'use client';

import * as React from 'react';
import { useState, useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '@/lib/redux/hooks';
import { EntityKeys, EntityData } from '@/types/entityTypes';
import { Button } from '@/components/ui/button';
import { Toggle } from '@/components/ui/toggle';
import { cn } from '@/lib/utils';
import {createEntityCommands} from "@/components/matrx/MatrxCommands/EntityCommand";

interface AdminTestPageProps {
    entityKey: EntityKeys;
}

const AdminTestPage: React.FC<AdminTestPageProps> = ({ entityKey }) => {
    const dispatch = useAppDispatch();
    const commands = createEntityCommands(entityKey);

    // States for dynamic testing of different command scenarios
    const [entities, setEntities] = useState<EntityData<typeof entityKey>[]>([]);
    const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [log, setLog] = useState<string[]>([]);

    useEffect(() => {
        // Load initial data for testing purposes
        loadData();
    }, []);

    const loadData = async () => {
        setIsLoading(true);
        // Replace with actual data fetching or mocking
        const mockData: EntityData<typeof entityKey>[] = Array.from({ length: 5 }, (_, i) => ({
            id: i,
            name: `Entity ${i + 1}`,
            // ...other fields
        }));
        setEntities(mockData);
        setIsLoading(false);
    };

    const handleCommandExecute = async (
        commandName: keyof typeof commands,
        index: number
    ) => {
        const entity = entities[index];
        try {
            await commands[commandName].onExecute?.({
                index,
                data: entity,
                dispatch,
                entityKey,
                selectors: createEntitySelectors(entityKey),
                type: 'entity',
                scope: 'single',
            });
            setLog((prevLog) => [
                ...prevLog,
                `Executed ${commandName} on entity #${index + 1} successfully.`,
            ]);
        } catch (error) {
            setLog((prevLog) => [
                ...prevLog,
                `Error executing ${commandName} on entity #${index + 1}: ${error.message}`,
            ]);
        }
    };

    return (
        <div className="p-4 space-y-4">
            <div className="flex justify-between items-center">
                <h1 className="text-lg font-semibold">Admin Test Page for Commands</h1>
                <Button variant="outline" onClick={loadData} disabled={isLoading}>
                    Reload Data
                </Button>
            </div>

            <div className="flex flex-col gap-4">
                {entities.map((entity, index) => (
                    <div
                        key={entity.id}
                        className={cn(
                            'p-4 border rounded-md',
                            selectedIndex === index && 'border-blue-500'
                        )}
                    >
                        <h2 className="text-md font-medium">{entity.name}</h2>
                        <div className="flex gap-2 mt-2">
                            {Object.keys(commands).map((commandName) => {
                                const CommandButton = commands[commandName];
                                return (
                                    <CommandButton
                                        key={commandName}
                                        data={entity}
                                        index={index}
                                        onExecute={() => handleCommandExecute(commandName, index)}
                                        className="w-8 h-8"
                                    />
                                );
                            })}
                        </div>
                        <Toggle
                            pressed={selectedIndex === index}
                            onPressedChange={() =>
                                setSelectedIndex((prev) => (prev === index ? null : index))
                            }
                            className="mt-2"
                        >
                            Toggle Selected
                        </Toggle>
                    </div>
                ))}
            </div>

            <div className="mt-6">
                <h3 className="text-md font-semibold">Execution Log</h3>
                <div className="bg-gray-800 text-white p-3 rounded-md max-h-60 overflow-y-auto">
                    {log.length > 0 ? (
                        log.map((entry, i) => (
                            <p key={i} className="text-sm">
                                {entry}
                            </p>
                        ))
                    ) : (
                         <p className="text-sm text-gray-400">No actions logged yet.</p>
                     )}
                </div>
            </div>
        </div>
    );
};

export default AdminTestPage;
*/
