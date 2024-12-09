// app/(authenticated)/tests/color-converter/components/ColorConversion.tsx

'use client';

import React, { useEffect, useState } from 'react';
import { Colord } from 'colord';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { getColorFormats } from '@/utils/color-utils/color-change-util';
import FullJsonViewer from "@/components/ui/JsonComponents/JsonViewerComponent";


interface ColorConversionProps {
    color: Colord;
}

export default function ColorConversion({ color }: ColorConversionProps) {
    const [jsonData, setJsonData] = useState({});
    const colorFormats = getColorFormats(color);

    useEffect(() => {
        // Combine all color formats into a single object
        const combinedFormats = Object.entries(colorFormats).reduce((acc, [name, value]) => {
            acc[name] = value;
            return acc;
        }, {} as { [key: string]: any });

        // Update state with combined formats
        setJsonData(combinedFormats);
    }, [colorFormats]);

    return (
        <Card className="bg-background">
            <CardHeader>
                <CardTitle className="text-foreground">Color Conversion</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    {/* Display individual color format inputs */}
                    {Object.entries(colorFormats).map(([name, value]) => (
                        <div key={name} className="grid grid-cols-[1fr_2fr] items-center gap-2">
                            <Label htmlFor={name} className="text-foreground">
                                {name}
                            </Label>
                            <Input
                                id={name}
                                value={typeof value === 'object' ? JSON.stringify(value) : value}
                                readOnly
                                className="bg-input text-foreground"
                            />
                        </div>
                    ))}

                    {/* Display the combined JSON object */}
                    <div className="mt-4">
                        <FullJsonViewer
                            data={jsonData}
                            title="Combined Color Formats"
                        />
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
