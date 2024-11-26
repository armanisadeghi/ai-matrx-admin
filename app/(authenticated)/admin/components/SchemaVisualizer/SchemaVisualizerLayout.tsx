// components/SchemaVisualizer/SchemaVisualizerLayout.tsx
import { DynamicResizableLayout } from "@/components/matrx/resizable/DynamicResizableLayout";
import SchemaVisualizer from ".";
import { useSchemaVisualizerStore } from "./store";
import { SchemaDetails } from "./SchemaDetails";
import { SchemaActions } from "./SchemaActions";

export function SchemaVisualizerLayout() {
    const { selectedElement, isDetailsOpen } = useSchemaVisualizerStore();

    const panels = [
        {
            content: <SchemaActions />,
            defaultSize: 20,
            minSize: 10,
            maxSize: 30,
            collapsible: true
        },
        {
            content: <SchemaVisualizer />,
            defaultSize: isDetailsOpen ? 50 : 70,
            minSize: 30,
            maxSize: isDetailsOpen ? 60 : 80
        },
        {
            content: <SchemaDetails />,
            defaultSize: isDetailsOpen ? 30 : 10,
            minSize: 10,
            maxSize: 50,
            collapsible: true
        }
    ];

    return (
        <DynamicResizableLayout
            panels={panels}
            direction="horizontal"
            className="bg-background"
        />
    );
}
