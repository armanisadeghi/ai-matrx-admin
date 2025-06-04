"use client";

import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { convertPythonTypeToDisplay } from "@/utils/python-type-converter";

interface InputConfigurationTableProps {
    selectedFunction: any;
    argOverrides: Record<string, { value: any; ready: boolean }>;
    argMappings: Record<string, string>;
    onUpdateArgOverride: (argName: string, field: "value" | "ready", newValue: any) => void;
    onRemoveArgMapping: (argName: string) => void;
}

export default function InputConfigurationTable({
    selectedFunction,
    argOverrides,
    argMappings,
    onUpdateArgOverride,
    onRemoveArgMapping,
}: InputConfigurationTableProps) {
    const getTypeInput = (argName: string, dataType: string, value: any) => {
        switch (dataType) {
            case "bool":
                return (
                    <Switch
                        checked={Boolean(value)}
                        onCheckedChange={(checked) => onUpdateArgOverride(argName, "value", checked)}
                    />
                );
            case "int":
                return (
                    <Input
                        type="number"
                        step="1"
                        value={value ?? ""}
                        onChange={(e) => onUpdateArgOverride(argName, "value", parseInt(e.target.value) || null)}
                        placeholder="Enter number..."
                        className="w-full"
                    />
                );
            case "float":
                return (
                    <Input
                        type="number"
                        step="any"
                        value={value ?? ""}
                        onChange={(e) => onUpdateArgOverride(argName, "value", parseFloat(e.target.value) || null)}
                        placeholder="Enter decimal..."
                        className="w-full"
                    />
                );
            case "list":
            case "dict":
                return (
                    <Textarea
                        value={value ? JSON.stringify(value, null, 2) : ""}
                        onChange={(e) => {
                            try {
                                const parsed = JSON.parse(e.target.value);
                                onUpdateArgOverride(argName, "value", parsed);
                            } catch {
                                // Invalid JSON, don't update
                            }
                        }}
                        className="font-mono resize-none w-full"
                        rows={3}
                        placeholder={dataType === "list" ? "[]" : "{}"}
                    />
                );
            default: // str, url, etc.
                return (
                    <Input
                        type="text"
                        value={value ?? ""}
                        onChange={(e) => onUpdateArgOverride(argName, "value", e.target.value || null)}
                        placeholder={`Enter ${convertPythonTypeToDisplay(dataType).toLowerCase()}...`}
                        className="w-full"
                    />
                );
        }
    };

    // Simplified component to just display the broker ID
    const BrokerDisplay = ({ brokerId, argName }: { brokerId: string; argName: string }) => {        
        if (!brokerId) {
            return <span className="text-xs text-gray-400 dark:text-gray-500">No mapping</span>;
        }

        return (
            <div className="flex items-center gap-2">
                <span className="text-xs font-mono bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 px-2 py-1 rounded border border-gray-300 dark:border-gray-600">
                    {brokerId}
                </span>
                <button
                    onClick={() => onRemoveArgMapping(argName)}
                    className="text-xs text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-200 hover:bg-red-50 dark:hover:bg-red-900/20 rounded px-1 transition-colors"
                    title="Remove mapping"
                >
                    ✕
                </button>
            </div>
        );
    };

    if (!selectedFunction?.args || selectedFunction.args.length === 0) {
        return (
            <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-purple-900 dark:text-purple-100 mb-2">
                    Input Configuration
                </h3>
                <p className="text-sm text-purple-700 dark:text-purple-300">
                    This function has no configurable inputs.
                </p>
            </div>
        );
    }

    return (
        <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4 space-y-4">
            <div>
                <h3 className="text-lg font-semibold text-purple-900 dark:text-purple-100">
                    Input Configuration
                </h3>
            </div>
            
            <div className="border border-purple-200 dark:border-purple-700 rounded-lg overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow className="hover:bg-transparent">
                            <TableHead className="text-purple-800 dark:text-purple-200 font-medium">
                                Input Name
                            </TableHead>
                            <TableHead className="text-purple-800 dark:text-purple-200 font-medium">
                                Data Type
                            </TableHead>
                            <TableHead className="text-purple-800 dark:text-purple-200 font-medium">
                                Required
                            </TableHead>
                            <TableHead className="text-purple-800 dark:text-purple-200 font-medium">
                                Value
                            </TableHead>
                            <TableHead className="text-purple-800 dark:text-purple-200 font-medium">
                                Ready State
                            </TableHead>
                            <TableHead className="text-purple-800 dark:text-purple-200 font-medium">
                                Broker Mapping
                            </TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {selectedFunction.args.map((arg: any) => (
                            <TableRow key={arg.name}>
                                {/* Input Name */}
                                <TableCell className="font-medium text-purple-900 dark:text-purple-100">
                                    {arg.name}
                                </TableCell>
                                
                                {/* Data Type */}
                                <TableCell className="text-purple-700 dark:text-purple-300">
                                    <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-purple-100 dark:bg-purple-800 text-purple-800 dark:text-purple-200">
                                        {convertPythonTypeToDisplay(arg.dataType)}
                                    </span>
                                </TableCell>
                                
                                {/* Required */}
                                <TableCell className="text-purple-700 dark:text-purple-300">
                                    <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                                        arg.required 
                                            ? 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200' 
                                            : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
                                    }`}>
                                        {arg.required ? "Required" : "Optional"}
                                    </span>
                                </TableCell>
                                
                                {/* Value */}
                                <TableCell className="min-w-[200px]">
                                    {getTypeInput(arg.name, arg.dataType, argOverrides[arg.name]?.value)}
                                </TableCell>
                                
                                {/* Ready State */}
                                <TableCell className="text-purple-700 dark:text-purple-300">
                                    <div className="flex items-center gap-2">
                                        <Switch
                                            checked={argOverrides[arg.name]?.ready ?? false}
                                            onCheckedChange={(checked) => onUpdateArgOverride(arg.name, "ready", checked)}
                                        />
                                        <span className={`text-xs font-medium ${
                                            argOverrides[arg.name]?.ready ? 'text-green-700 dark:text-green-300' : 'text-yellow-700 dark:text-yellow-300'
                                        }`}>
                                            {argOverrides[arg.name]?.ready ? "Ready" : "Not Ready"}
                                        </span>
                                    </div>
                                </TableCell>
                                
                                {/* Broker Mapping */}
                                <TableCell className="min-w-[180px]">
                                    <BrokerDisplay brokerId={argMappings[arg.name]} argName={arg.name} />
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
} 