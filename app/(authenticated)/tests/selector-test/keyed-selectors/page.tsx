'use client';

import React, { useEffect, useRef } from 'react';
import { useAppSelector } from '@/lib/redux/hooks';
import {
    Card,
    CardHeader,
    CardTitle,
    CardContent
} from "@/components/ui/card";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from "@/components/ui/table";
import { JsonViewer } from "@/components/ui";
import { createEntitySelectors } from '@/lib/redux/entity/selectors';
import { EntityKeys } from "@/types/entityTypes";
import GenerateBaseline from './generateBaseline';
import {entitySelectorsConfig} from "@/app/(authenticated)/tests/selector-test/keyed-selectors/selectorsConfig";

// Type definitions
export type SelectorConfig = {
    name: string;
    selectorKey: string;
    args: any[];
    isObjectArgs: boolean;
    conductTest: boolean;
}

export type EntitySelectorConfig = {
    category: string;
    entityKey: EntityKeys;
    selectors: SelectorConfig[];
}

// Type for the old config format expected by GenerateBaseline
export type BaselineConfig = {
    name: string;
    selectorFn: Function;
    args: any[];
    isObjectArgs: boolean;
    conductTest: boolean;
    category: string;
}
const DataDisplay = ({data}) => {
    const isString = typeof data === 'string';
    return isString ? (
        <pre className="text-xs overflow-auto max-h-40">{data}</pre>
    ) : (
               <JsonViewer data={data}/>
           );
};

const ContentSize = (
    {
        data,
        sizeThresholds = [500, 1000, 5000, 10000, 50000], // adjustable thresholds
        colors = ["text-green-500", "text-blue-500", "text-yellow-500", "text-orange-500", "text-red-500"] // adjustable colors
    }) => {
    if (data === undefined || data === null) {
        return (
            <div className="text-lg font-semibold text-red-700 mt-2">
                NO CONTENT AVAILABLE!
            </div>
        );
    }

    const isString = typeof data === 'string';
    const size = isString ? data.length : JSON.stringify(data).length;
    const formattedSize = size.toLocaleString(); // Adds commas for readability

    // Determine color based on size thresholds
    let colorClass = colors[0];
    for (let i = 0; i < sizeThresholds.length; i++) {
        if (size > sizeThresholds[i]) {
            colorClass = colors[i];
        } else {
            break;
        }
    }

    return (
        <div className={`text-base ${colorClass} mt-1`}>
            Content Size: {formattedSize} characters
        </div>
    );
};

// Adapter function to convert new config format to old format
const adaptConfigForBaseline = (
    entitySelectorsConfig: EntitySelectorConfig[],
    entitySelectors: Record<EntityKeys, ReturnType<typeof createEntitySelectors> | null>
): BaselineConfig[] => {
    return entitySelectorsConfig.flatMap(({ category, entityKey, selectors }) =>
        selectors.map(selector => ({
            category,
            name: selector.name,
            selectorFn: entitySelectors[entityKey]?.[selector.selectorKey] || (() => null),
            args: selector.args,
            isObjectArgs: selector.isObjectArgs,
            conductTest: selector.conductTest
        }))
    );
};

// ... (DataDisplay and ContentSize components remain the same)

const EntitySelectorTestPage: React.FC = () => {
    const currentSelectorRef = useRef<string>('');

    useEffect(() => {
        const originalConsole = {
            log: console.log,
            warn: console.warn,
            error: console.error,
            info: console.info,
            debug: console.debug
        };

        Object.keys(originalConsole).forEach(method => {
            console[method] = (...args) => {
                if (currentSelectorRef.current) {
                    originalConsole.log(`Testing selector: ${currentSelectorRef.current}`);
                }
            };
        });

        return () => {
            Object.keys(originalConsole).forEach(method => {
                console[method] = originalConsole[method];
            });
        };
    }, []);

    const entitySelectors = React.useMemo(() => {
        const selectorMap: Record<EntityKeys, ReturnType<typeof createEntitySelectors> | null> = {} as any;
        entitySelectorsConfig.forEach(({ entityKey }) => {
            selectorMap[entityKey] = createEntitySelectors(entityKey);
        });
        return selectorMap;
    }, []);

    // Convert config for GenerateBaseline
    const baselineConfig = React.useMemo(() =>
            adaptConfigForBaseline(entitySelectorsConfig, entitySelectors),
        [entitySelectors]
    );

    return (
        <div className="p-6 space-y-6">
            <GenerateBaseline filteredConfig={baselineConfig}/>

            <Card>
                <CardHeader>
                    <CardTitle>Entity Selector Test Results</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-48">Category</TableHead>
                                <TableHead className="w-48">Entity Key</TableHead>
                                <TableHead className="w-64">Selector Name</TableHead>
                                <TableHead className="w-96">Args</TableHead>
                                <TableHead>Result</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {entitySelectorsConfig.map(({ category, entityKey, selectors }) => (
                                selectors.filter(s => s.conductTest).map((selector) => {
                                    const selectorFn = entitySelectors[entityKey]?.[selector.selectorKey];

                                    currentSelectorRef.current = selector.name;

                                    const result = useAppSelector((state) => {
                                        if (!selectorFn) return 'Selector not initialized';

                                        if (selector.args.length === 0) {
                                            return selectorFn(state);
                                        }

                                        return selector.isObjectArgs
                                               ? selectorFn(state, ...selector.args)
                                               : selectorFn(state, selector.args[0]);
                                    });

                                    currentSelectorRef.current = '';

                                    return (
                                        <TableRow key={`${entityKey}-${selector.name}`}>
                                            <TableCell className="font-medium">{category}</TableCell>
                                            <TableCell>{entityKey}</TableCell>
                                            <TableCell>
                                                {selector.name}
                                                <ContentSize data={result}/>
                                            </TableCell>
                                            <TableCell>
                                                {selector.args.length > 0 ? (
                                                    <pre className="text-xs overflow-auto max-h-40">
                                                        {JSON.stringify(selector.args, null, 2)}
                                                    </pre>
                                                ) : (
                                                     "None"
                                                 )}
                                            </TableCell>
                                            <TableCell>
                                                <DataDisplay data={result} />
                                            </TableCell>
                                        </TableRow>
                                    );
                                })
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
};

export default EntitySelectorTestPage;
