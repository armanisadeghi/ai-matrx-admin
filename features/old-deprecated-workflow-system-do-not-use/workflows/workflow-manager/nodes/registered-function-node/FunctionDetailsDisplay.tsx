"use client";

import { useState } from "react";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { convertPythonTypeToDisplay } from "@/utils/python-type-converter";

interface FunctionDetailsDisplayProps {
    selectedFunction: any;
}

export default function FunctionDetailsDisplay({ selectedFunction }: FunctionDetailsDisplayProps) {
    const [isDetailsOpen, setIsDetailsOpen] = useState(false);

    if (!selectedFunction) return null;

    return (
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 space-y-6">
            {/* Name */}
            <div>
                <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100">
                    {selectedFunction.name}
                </h3>
            </div>

            {/* Inputs Table */}
            {selectedFunction.args && selectedFunction.args.length > 0 && (
                <div>
                    <h4 className="font-medium text-blue-800 dark:text-blue-200 mb-3">
                        Inputs
                    </h4>
                    <div className="border border-blue-200 dark:border-blue-700 rounded-lg overflow-hidden">
                        <Table>
                            <TableHeader>
                                <TableRow className="hover:bg-transparent">
                                    <TableHead className="text-blue-800 dark:text-blue-200 font-medium">
                                        Input Name
                                    </TableHead>
                                    <TableHead className="text-blue-800 dark:text-blue-200 font-medium">
                                        Data Type
                                    </TableHead>
                                    <TableHead className="text-blue-800 dark:text-blue-200 font-medium">
                                        Required
                                    </TableHead>
                                    <TableHead className="text-blue-800 dark:text-blue-200 font-medium">
                                        Default Ready
                                    </TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {selectedFunction.args.map((arg: any, idx: number) => (
                                    <TableRow key={idx}>
                                        <TableCell className="font-medium text-blue-900 dark:text-blue-100">
                                            {arg.name}
                                        </TableCell>
                                        <TableCell className="text-blue-700 dark:text-blue-300">
                                            <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-blue-100 dark:bg-blue-800 text-blue-800 dark:text-blue-200">
                                                {convertPythonTypeToDisplay(arg.dataType)}
                                            </span>
                                        </TableCell>
                                        <TableCell className="text-blue-700 dark:text-blue-300">
                                            <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                                                arg.required 
                                                    ? 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200' 
                                                    : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
                                            }`}>
                                                {arg.required ? "Required" : "Optional"}
                                            </span>
                                        </TableCell>
                                        <TableCell className="text-blue-700 dark:text-blue-300">
                                            <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                                                arg.ready 
                                                    ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200' 
                                                    : 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200'
                                            }`}>
                                                {arg.ready ? "Ready" : "Not Ready"}
                                            </span>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </div>
            )}

            {/* Outputs */}
            <div>
                <h4 className="font-medium text-blue-800 dark:text-blue-200 mb-3">
                    Outputs
                </h4>
                <div className="border border-blue-200 dark:border-blue-700 rounded-lg overflow-hidden">
                    <Table>
                        <TableBody>
                            <TableRow>
                                <TableCell className="font-medium text-blue-900 dark:text-blue-100 w-1/3">
                                    Default Return Broker
                                </TableCell>
                                <TableCell className="text-blue-700 dark:text-blue-300">
                                    {selectedFunction.returnBroker}
                                </TableCell>
                            </TableRow>
                        </TableBody>
                    </Table>
                </div>
            </div>

            {/* Collapsible Details */}
            <div>
                <div 
                    className="flex items-center justify-between cursor-pointer hover:bg-blue-100 dark:hover:bg-blue-800/30 rounded-md p-2 -m-2 transition-colors"
                    onClick={() => setIsDetailsOpen(!isDetailsOpen)}
                >
                    <h4 className="font-medium text-blue-800 dark:text-blue-200">
                        Details
                    </h4>
                    <svg 
                        className={`w-5 h-5 text-blue-600 dark:text-blue-400 transition-transform duration-200 ${
                            isDetailsOpen ? 'rotate-180' : 'rotate-0'
                        }`}
                        fill="none" 
                        stroke="currentColor" 
                        viewBox="0 0 24 24"
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                </div>
                
                <div className={`transition-all duration-200 ease-in-out overflow-hidden ${
                    isDetailsOpen ? 'max-h-96 opacity-100 mt-3' : 'max-h-0 opacity-0'
                }`}>
                    <div className="text-sm text-blue-800 dark:text-blue-200">
                        <div className="whitespace-pre-wrap">
                            {selectedFunction.description || "No description available"}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
} 