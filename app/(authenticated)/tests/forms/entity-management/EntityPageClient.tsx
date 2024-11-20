'use client';

import React, {useState} from 'react';
import {motion} from 'framer-motion';
import {Card} from '@/components/ui/card';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {Switch} from "@/components/ui/switch";
import {Label} from "@/components/ui/label";
import {Button} from "@/components/ui/button";
import {
    Settings2,
    Layout,
    Layers,
    Monitor,
    SquareActivity,
    PanelLeftClose,
    PanelLeftOpen,
    Grid,
    List,
    ArrowRightLeft,
} from 'lucide-react';
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from "@/components/ui/sheet";
import {Separator} from "@/components/ui/separator";
import EntityLayout, {
    LayoutVariant,
    ComponentDensity,
    AnimationPreset,
    ComponentSize,
    QuickReferenceComponentType,
} from '@/components/matrx/Entity/prewired-components/layouts/EntityLayout';
import {FormDirectionOptions, FormLayoutOptions} from '@/types/componentConfigTypes';
import {cn} from "@nextui-org/react";
import ArmaniLayout from '@/components/matrx/Entity/prewired-components/layouts/ArmaniLayout';

const layoutOptions: LayoutVariant[] = ['split', 'sideBySide', 'stacked'];
const densityOptions: ComponentDensity[] = ['compact', 'normal', 'comfortable'];
const animationOptions: AnimationPreset[] = ['none', 'subtle', 'smooth', 'energetic', 'playful'];
const sizeOptions: ComponentSize[] = ['xs', 'sm', 'md', 'lg', 'xl'];
const quickReferenceOptions: QuickReferenceComponentType[] = ['cards', 'cardsEnhanced', 'accordion', 'accordionEnhanced', 'list', 'select'];
const formVariationOptions = [
    'fullWidthSinglePage',
    'fullWidthMultiStep',
    'twoColumnSinglePage',
    'threeColumnSinglePage',
    'restrictedWidthSinglePage',
    'singlePageModal',
    'multiStepModal'
] as const;
const formLayoutOptions: FormLayoutOptions[] = ['grid', 'sections', 'accordion', 'tabs', 'masonry', 'carousel', 'timeline'];
const columnOptions = ['1', '2', '3', '4', '5', '6', 'auto'] as const;
const directionOptions: FormDirectionOptions[] = ['row', 'column', 'row-reverse', 'column-reverse'];

const EntityPageClient = () => {
    const [settings, setSettings] = useState({
        layout: 'split' as LayoutVariant,
        density: 'normal' as ComponentDensity,
        animation: 'smooth' as AnimationPreset,
        size: 'md' as ComponentSize,
        quickReferenceType: 'list' as QuickReferenceComponentType,
        isFullScreen: false,
        formOptions: {
            formLayout: 'grid' as FormLayoutOptions,
            formColumns: '2',
            formDirection: 'row' as FormDirectionOptions,
            formEnableSearch: false,
            formVariation: 'fullWidthSinglePage' as typeof formVariationOptions[number],
        }
    });

    const [showControls, setShowControls] = useState(false);

    const SelectControl = (
        {
            label,
            icon: Icon,
            value,
            options,
            onChange,
        }: {
            label: string;
            icon: React.ElementType;
            value: string;
            options: readonly string[];
            onChange: (value: any) => void;
        }) => (
        <div className="flex items-center gap-2 min-w-[250px] flex-shrink-0">
            <Icon className="h-4 w-4 text-muted-foreground shrink-0"/>
            <Label className="text-sm font-medium min-w-[80px]">{label}</Label>
            <Select value={value} onValueChange={onChange}>
                <SelectTrigger className="w-[140px]">
                    <SelectValue/>
                </SelectTrigger>
                <SelectContent>
                    {options.map(option => (
                        <SelectItem key={option} value={option}>
                            {option.charAt(0).toUpperCase() + option.slice(1)}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
    );

    const ControlGroup = ({title, children}: { title: string; children: React.ReactNode }) => (
        <div className="space-y-4 p-4 bg-card/50 rounded-lg">
            <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
            <div className="flex flex-wrap gap-4">
                {children}
            </div>
        </div>
    );

    const Controls = () => (
        <div className="space-y-4">
            <ControlGroup title="Layout & Presentation">
                <SelectControl
                    label="Layout"
                    icon={Layout}
                    value={settings.layout}
                    options={layoutOptions}
                    onChange={(value: LayoutVariant) => setSettings(prev => ({...prev, layout: value}))}
                />
                <SelectControl
                    label="Density"
                    icon={Layers}
                    value={settings.density}
                    options={densityOptions}
                    onChange={(value: ComponentDensity) => setSettings(prev => ({...prev, density: value}))}
                />
            </ControlGroup>

            <ControlGroup title="Form Layout">
                <SelectControl
                    label="Layout"
                    icon={Grid}
                    value={settings.formOptions.formLayout}
                    options={formLayoutOptions}
                    onChange={(value: FormLayoutOptions) => setSettings(prev => ({
                        ...prev,
                        formOptions: {...prev.formOptions, formLayout: value}
                    }))}
                />
                <SelectControl
                    label="Direction"
                    icon={ArrowRightLeft}
                    value={settings.formOptions.formDirection}
                    options={directionOptions}
                    onChange={(value: FormDirectionOptions) => setSettings(prev => ({
                        ...prev,
                        formOptions: {...prev.formOptions, formDirection: value}
                    }))}
                />
            </ControlGroup>

            <ControlGroup title="Display Options">
                <SelectControl
                    label="Reference"
                    icon={List}
                    value={settings.quickReferenceType}
                    options={quickReferenceOptions}
                    onChange={(value: QuickReferenceComponentType) => setSettings(prev => ({
                        ...prev,
                        quickReferenceType: value
                    }))}
                />
                <div className="flex items-center gap-2 min-w-[250px]">
                    <Switch
                        id="fullscreen"
                        checked={settings.isFullScreen}
                        onCheckedChange={(checked) => setSettings(prev => ({...prev, isFullScreen: checked}))}
                        className="data-[state=checked]:bg-primary"
                    />
                    <Label htmlFor="fullscreen" className="text-sm text-muted-foreground">
                        Full Screen
                    </Label>
                </div>
            </ControlGroup>
        </div>
    );

    return (
        <div className="h-full w-full bg-background">
            <motion.div
                className={cn(
                    "relative w-full h-full",
                    settings.isFullScreen && "fixed inset-0 z-50"
                )}
                layout
            >
                <div className="h-full flex flex-col">
                    <Card
                        className="rounded-none border-x-0 border-t-0 bg-card/50 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                        <div className="p-4">
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-2">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => setShowControls(!showControls)}
                                        className="text-muted-foreground hover:text-primary"
                                    >
                                        {showControls ? <PanelLeftClose className="h-4 w-4"/> : <PanelLeftOpen
                                            className="h-4 w-4"/>}
                                    </Button>
                                    <Separator orientation="vertical" className="h-4"/>
                                    <span className="text-sm font-medium text-foreground">
                                    Layout Controls
                                  </span>
                                </div>

                                <Sheet>
                                    <SheetTrigger asChild>
                                        <Button
                                            variant="outline"
                                            size="icon"
                                            className="hover:bg-primary hover:text-primary-foreground"
                                        >
                                            <Settings2 className="h-4 w-4"/>
                                        </Button>
                                    </SheetTrigger>
                                    <SheetContent side="right"
                                                  className="w-[400px] overflow-y-auto bg-background/95 backdrop-blur">
                                        <SheetHeader>
                                            <SheetTitle>Layout Settings</SheetTitle>
                                            <SheetDescription>
                                                Customize the appearance and behavior of the interface.
                                            </SheetDescription>
                                        </SheetHeader>
                                        <Separator className="my-4"/>
                                        <div className="pr-6">
                                            <Controls/>
                                        </div>
                                    </SheetContent>
                                </Sheet>
                            </div>

                            {showControls && <Controls/>}
                        </div>
                    </Card>

                    <div className="flex-1">
                        <ArmaniLayout
                            layoutVariant={settings.layout}
                            density={settings.density}
                            animationPreset={settings.animation}
                            size={settings.size}
                            quickReferenceType={settings.quickReferenceType}
                            formOptions={{
                                size: settings.size,
                                formLayout: settings.formOptions.formLayout,
                                formColumns: settings.formOptions.formColumns === 'auto' ? 'auto'
                                                                                         : parseInt(settings.formOptions.formColumns),
                                formDirection: settings.formOptions.formDirection,
                                formEnableSearch: settings.formOptions.formEnableSearch,
                                formIsSinglePage: !settings.formOptions.formVariation.includes('MultiStep'),
                                formIsFullPage: settings.formOptions.formVariation.includes('fullWidth'),
                            }}
                            className="h-full"
                        />
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

export default EntityPageClient;
