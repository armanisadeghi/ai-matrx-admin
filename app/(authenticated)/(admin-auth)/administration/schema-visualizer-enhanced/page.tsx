'use client';

import { SchemaVisualizerLayout } from "@/app/(authenticated)/admin/components/SchemaVisualizer/SchemaVisualizerLayout";

export default function EnhancedSchemaVisualizerPage() {
    return (
        <div className="h-[calc(100vh-2.5rem)] flex flex-col overflow-hidden">
            <SchemaVisualizerLayout />
        </div>
    );
}

