'use client';


import { ChipEditor } from './ChipEditor';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function EditorPage() {
    return (
        <div className="w-full p-2">
            <Card>
                <CardHeader className='p-2'>
                    <CardTitle>Variable Chip Editor</CardTitle>
                </CardHeader>
                <CardContent className='p-4'>
                    <ChipEditor />
                </CardContent>
            </Card>
        </div>
    );
}
