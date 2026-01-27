// app/entity-select-demo/page.tsx
'use client';

import React, {useState} from 'react';
import {Layout, Maximize2, Box} from 'lucide-react';
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/components/ui/select";
import {Card} from "@/components/ui/card";
import {EntityKeys} from "@/types/entityTypes";
import {useAppSelector} from "@/lib/redux/hooks";
import {selectFormattedEntityOptions} from "@/lib/redux/schema/globalCacheSelectors";
import {
    ComposedEntitySelect, WrapperStyle, SelectorStyle,
} from "@/components/matrx/Entity/prewired-components/entity-management/parts/EntityOptionsAttemptTwo";


// Options for the control dropdowns
const WRAPPER_OPTIONS = [
    {value: 'card', label: 'Card', key: 'card'},
    {value: 'minimal', label: 'Minimal', key: 'minimal'},
    {value: 'prominent', label: 'Prominent Purple', key: 'prominent'},
    {value: 'prominentSuccess', label: 'Prominent Green', key: 'prominentSuccess'},
    {value: 'prominentWarm', label: 'Prominent Warm', key: 'prominentWarm'},
    {value: 'accordion', label: 'Accordion', key: 'accordion'},
    {value: 'floating', label: 'Floating', key: 'floating'},
    {value: 'compact', label: 'Compact', key: 'compact'},
] as const;


const SELECTOR_OPTIONS = [
    {value: 'standard', label: 'Standard', key: 'standard'},
    {value: 'chips', label: 'Chips', key: 'chips'},
    {value: 'command', label: 'Command', key: 'command'},
] as const;

const CompactSelectControl = (
    {
        label,
        icon: Icon,
        value,
        options,
        onChange,
    }: {
        label: string;
        icon: React.ComponentType<any>;
        value: string;
        options: { value: string; label: string; key: string }[];
        onChange: (value: string) => void;
    }) => (
    <div className="flex items-center gap-1 bg-secondary/50 rounded-md px-2 py-1">
        <Icon className="h-4 w-4 text-muted-foreground shrink-0"/>
        <Select value={value} onValueChange={onChange}>
            <SelectTrigger className="h-8 w-[120px] text-sm border-0 bg-transparent">
                <SelectValue placeholder={label}/>
            </SelectTrigger>
            <SelectContent>
                {options.map(option => (
                    <SelectItem key={option.key} value={option.value}>
                        {option.label}
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    </div>
);

const ControlGroup = ({children}: { children: React.ReactNode }) => (
    <div className="flex items-center gap-2 border-l border-border/50 pl-2 ml-2 first:border-l-0 first:pl-0 first:ml-0">
        {children}
    </div>
);

export default function EntitySelectDemo() {
    const [wrapperStyle, setWrapperStyle] = useState<WrapperStyle>('card');
    const [selectorStyle, setSelectorStyle] = useState<SelectorStyle>('standard');
    const [selectedEntity, setSelectedEntity] = useState<EntityKeys | undefined>(undefined);

    const entitySelectOptions = useAppSelector(selectFormattedEntityOptions);

    const handleEntityChange = (value: EntityKeys) => {
        setSelectedEntity(value);
    };

    return (
        <div className="container mx-auto p-8 space-y-8">
            {/* Controls */}
            <div
                className="flex items-center flex-wrap gap-4 p-4 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border rounded-lg shadow-sm">
                <ControlGroup>
                    <CompactSelectControl
                        label="Wrapper"
                        icon={Layout}
                        value={wrapperStyle}
                        options={WRAPPER_OPTIONS as any}
                        onChange={(value) => setWrapperStyle(value as WrapperStyle)}
                    />
                    <CompactSelectControl
                        label="Selector"
                        icon={Box}
                        value={selectorStyle}
                        options={SELECTOR_OPTIONS as any}
                        onChange={(value) => setSelectorStyle(value as SelectorStyle)}
                    />
                </ControlGroup>
            </div>

            {/* Preview */}
            <Card className="p-6">
                <ComposedEntitySelect
                    value={selectedEntity}
                    options={entitySelectOptions}
                    onValueChange={handleEntityChange}
                    wrapperStyle={wrapperStyle}
                    selectorStyle={selectorStyle}
                    wrapperProps={{
                        title: "Entity Selection",
                        description: "Choose from available entities"
                    }}
                    placeholder="Select an entity..."
                />
            </Card>

            {/* Debug Output */}
            <div className="mt-8 p-4 bg-muted rounded-lg">
                <h3 className="text-sm font-medium mb-2">Current Selection:</h3>
                <pre className="text-sm">
                    {JSON.stringify(
                        {
                            selectedEntity,
                            wrapperStyle,
                            selectorStyle,
                        },
                        null,
                        2
                    )}
                </pre>
            </div>
        </div>
    );
}
