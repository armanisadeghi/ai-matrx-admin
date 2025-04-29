import { useState } from "react";
import Link from "next/link";
import { appletLayoutOptions, appletLayoutOptionsArray } from "@/features/applet/layouts/options/layout-options";
import { AppletLayoutOption } from "@/features/applet/layouts/options/layout.types";

const LayoutExamples = () => {
    const [selectedLayout, setSelectedLayout] = useState<AppletLayoutOption>("horizontal");

    return (
        <div className="w-full h-full p-4 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100">
            <h1 className="text-3xl font-bold text-center mb-8">Applet Layout Options</h1>
            
            {/* Select Component Example */}
            <div className="w-full max-w-md mx-auto">
                <div className="flex items-center gap-3">
                    <select
                        className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md px-4 py-2 flex-1 shadow-sm text-gray-900 dark:text-gray-100"
                        value={selectedLayout}
                        onChange={(e) => setSelectedLayout(e.target.value as AppletLayoutOption)}
                    >
                        {appletLayoutOptionsArray.map((option) => (
                            <option key={option.value} value={option.value}>
                                {option.title}
                            </option>
                        ))}
                    </select>
                    <div className="w-8 h-8 flex items-center justify-center text-rose-500 dark:text-rose-500">
                        {appletLayoutOptions[selectedLayout].icon}
                    </div>
                </div>
            </div>
            
            {/* Grid of Layout Cards */}
            <div className="mt-8">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {appletLayoutOptionsArray.map((option) => (
                        <Link 
                            key={option.value}
                            href={`/apps/dynamic-layouts/${option.value}`}
                            className={`block p-4 rounded-lg transition-all duration-200 ease-in-out bg-white dark:bg-gray-800 shadow-lg ${
                                selectedLayout === option.value
                                    ? "border-2 border-rose-500 dark:border-rose-500"
                                    : "border border-gray-200 dark:border-gray-700 hover:border-rose-500 dark:hover:border-rose-500"
                            }`}
                            onClick={(e) => {
                                // Update the selected layout without preventing navigation
                                setSelectedLayout(option.value);
                            }}
                        >
                            <div className="flex items-center gap-3 mb-2">
                                <div className="w-8 h-8 flex items-center justify-center text-rose-500 dark:text-rose-500">
                                    {option.icon}
                                </div>
                                <h3 className="font-medium text-gray-900 dark:text-gray-100">{option.title}</h3>
                            </div>
                            <p className="text-gray-500 dark:text-gray-400 text-sm">{option.description}</p>
                        </Link>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default LayoutExamples;