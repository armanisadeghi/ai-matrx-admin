'use client';

import React, {useEffect, useRef} from 'react';
import {useAppSelector} from '@/lib/redux/hooks';
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
import {JsonViewer} from "@/components/ui";
import {selectorsConfig} from './selectorsConfig';
import GenerateBaseline from './generateBaseline';

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

const SelectorTestPage: React.FC = () => {
    const filteredConfig = selectorsConfig.filter(({conductTest}) => conductTest);
    const currentSelectorRef = useRef<string>('');

    // Override all console methods
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

    const results = filteredConfig.map(({selectorFn, args, isObjectArgs, name}) => {
        currentSelectorRef.current = name;
        const result = useAppSelector((state) =>
            isObjectArgs ? selectorFn(state, ...args) : selectorFn(state, args[0])
        );
        currentSelectorRef.current = '';
        return result;
    });

    return (
        <div className="p-6 space-y-6">
            <GenerateBaseline filteredConfig={filteredConfig}/>

            <Card>
                <CardHeader>
                    <CardTitle>Selector Test Results</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-48">Category</TableHead>
                                <TableHead className="w-64">Selector Name</TableHead>
                                <TableHead className="w-96">Props</TableHead>
                                <TableHead>Result</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredConfig.map((item, index) => (
                                <TableRow key={index}>
                                    <TableCell className="font-medium">{item.category}</TableCell>
                                    <TableCell className="font-large">
                                        {item.name}
                                        <ContentSize data={results[index]}/>
                                    </TableCell>
                                    <TableCell>
                                        <pre className="text-md overflow-auto max-h-40">
                                            {item.args.length === 0 ? "None" : JSON.stringify(item.args, null, 2)}
                                        </pre>
                                    </TableCell>
                                    <TableCell>
                                        <DataDisplay data={results[index]}/>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
};

export default SelectorTestPage;
