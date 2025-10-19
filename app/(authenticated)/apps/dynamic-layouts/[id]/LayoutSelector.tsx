"use client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import Link from "next/link";
import { appletLayoutOptionsArray } from "@/features/applet/constants/layout-options";

interface LayoutSelectorProps {
    currentLayout?: string;
}

export const LayoutSelector = ({ currentLayout }: LayoutSelectorProps) => {
    const router = useRouter();
    const [selectedLayout, setSelectedLayout] = useState<string>(currentLayout || "");

    useEffect(() => {
        if (currentLayout && currentLayout !== selectedLayout) {
            setSelectedLayout(currentLayout);
        }
    }, [currentLayout, selectedLayout]);

    const handleLayoutChange = (value: string) => {
        setSelectedLayout(value);
        router.push(`/apps/dynamic-layouts/${value}`);
    };

    // Sort options alphabetically by title
    const sortedLayoutOptions = [...appletLayoutOptionsArray].sort((a, b) => 
        a.title.localeCompare(b.title)
    );

    return (
        <div className="flex items-center gap-4 mb-4">
            <Link
                href="/apps/dynamic-layouts/options"
                className="flex items-center px-3 py-1.5 text-sm border rounded-md border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-900 dark:text-gray-100"
            >
                <ArrowLeft className="mr-2 h-8 w-8 text-rose-500 dark:text-rose-500" />
                Back to Options
            </Link>

            <div className="w-full max-w-xs">
                <Select value={selectedLayout} onValueChange={handleLayoutChange}>
                    <SelectTrigger className="w-full bg-textured border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 focus:none">
                        <SelectValue placeholder="Select a layout" />
                    </SelectTrigger>
                    <SelectContent className="bg-textured text-gray-900 dark:text-gray-100 border-gray-200 dark:border-gray-700">
                        <SelectGroup>
                            <SelectLabel className="text-gray-500 dark:text-gray-400">Layout Options</SelectLabel>
                            {sortedLayoutOptions.map((option) => (
                                <SelectItem
                                    key={option.value}
                                    value={option.value}
                                    className="flex items-center gap-2 hover:bg-gray-100 dark:hover:bg-gray-700 focus:bg-gray-100 dark:focus:bg-gray-700"
                                >
                                    <div className="flex items-center gap-2">
                                        <span className="text-rose-500 dark:text-rose-500">{option.icon}</span>
                                        <span>{option.title}</span>
                                    </div>
                                </SelectItem>
                            ))}
                        </SelectGroup>
                    </SelectContent>
                </Select>
            </div>
        </div>
    );
};

export default LayoutSelector;
