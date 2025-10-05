"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Globe, Check } from "lucide-react";
import { useSearchConsoleAPI } from "../hooks/useSearchConsole";
import type { SiteProperty } from "../types";

interface PropertySelectorProps {
    token: string;
    selectedProperty: SiteProperty | null;
    onSelectProperty: (property: SiteProperty) => void;
}

export function PropertySelector({ token, selectedProperty, onSelectProperty }: PropertySelectorProps) {
    const [properties, setProperties] = useState<SiteProperty[]>([]);
    const { fetchProperties, loading, error } = useSearchConsoleAPI(token);

    useEffect(() => {
        loadProperties();
    }, [token]);

    const loadProperties = async () => {
        const props = await fetchProperties();
        setProperties(props);
        
        // Auto-select first property if none selected
        if (props.length > 0 && !selectedProperty) {
            onSelectProperty(props[0]);
        }
    };

    if (loading && properties.length === 0) {
        return (
            <div className="flex items-center justify-center py-8">
                <div className="flex items-center gap-3 text-gray-600 dark:text-gray-400">
                    <Loader2 className="h-5 w-5 animate-spin text-green-600 dark:text-green-400" />
                    <span>Loading your properties...</span>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <Card className="bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800">
                <CardContent className="pt-6">
                    <p className="text-red-800 dark:text-red-200">{error}</p>
                </CardContent>
            </Card>
        );
    }

    if (properties.length === 0) {
        return (
            <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                <CardContent className="pt-6 text-center">
                    <Globe className="w-12 h-12 mx-auto mb-3 text-gray-400 dark:text-gray-500" />
                    <p className="text-gray-600 dark:text-gray-400">
                        No properties found. Add a site to Google Search Console first.
                    </p>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
            <CardHeader>
                <CardTitle className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                    Select Property
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {properties.map((property) => {
                        const isSelected = selectedProperty?.siteUrl === property.siteUrl;
                        return (
                            <button
                                key={property.siteUrl}
                                onClick={() => onSelectProperty(property)}
                                className={`text-left p-4 rounded-lg border-2 transition-all ${
                                    isSelected
                                        ? "border-green-500 dark:border-green-400 bg-green-50 dark:bg-green-900/20"
                                        : "border-gray-200 dark:border-gray-700 hover:border-green-300 dark:hover:border-green-600 bg-gray-50 dark:bg-gray-800/50"
                                }`}
                            >
                                <div className="flex items-start justify-between gap-2">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <Globe className="w-4 h-4 text-gray-500 dark:text-gray-400 flex-shrink-0" />
                                            <span className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                                                {property.siteUrl}
                                            </span>
                                        </div>
                                        <Badge
                                            variant="outline"
                                            className="text-xs"
                                        >
                                            {property.permissionLevel}
                                        </Badge>
                                    </div>
                                    {isSelected && (
                                        <Check className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0" />
                                    )}
                                </div>
                            </button>
                        );
                    })}
                </div>
            </CardContent>
        </Card>
    );
}

