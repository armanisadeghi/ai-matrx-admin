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
    ArrowRightLeft, Maximize2, Sparkles, Columns, Maximize, Columns2,
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
import ArmaniLayout from '@/components/matrx/Entity/prewired-components/layouts/ArmaniLayout';
import {Slider} from "@/components/ui";
import {cn} from "@/utils/cn";

const layoutOptions: LayoutVariant[] = ['split', 'sideBySide', 'stacked'];
const densityOptions: ComponentDensity[] = ['compact', 'normal', 'comfortable'];
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
const directionOptions: FormDirectionOptions[] = ['row', 'column', 'row-reverse', 'column-reverse'];

const animationOptions: AnimationPreset[] = ['none', 'subtle', 'smooth', 'energetic', 'playful'];
const sizeOptions: ComponentSize[] = ['xs', 'sm', 'md', 'lg', 'xl'];
const columnOptions = ['1', '2', '3', '4', '5', '6', 'auto'] as const;

const EntityPageClient = () => {
    const [settings, setSettings] = useState({
        layout: 'split' as LayoutVariant,
        density: 'normal' as ComponentDensity,
        animation: 'smooth' as AnimationPreset,
        size: 'md' as ComponentSize,
        quickReferenceType: 'list' as QuickReferenceComponentType,
        isFullScreen: false,
        splitRatio: 20,
        formOptions: {
            formLayout: 'grid' as FormLayoutOptions,
            formColumns: '2',
            formDirection: 'row' as FormDirectionOptions,
            formEnableSearch: false,
            formVariation: 'fullWidthSinglePage' as typeof formVariationOptions[number],
        }
    });

    const [showControls, setShowControls] = useState(true);

    const CompactSelectControl = (
        {
            label,
            icon: Icon,
            value,
            options,
            onChange,
        }) => (
        <div className="flex items-center gap-1 bg-secondary/50 rounded-md px-2 py-1">
            <Icon className="h-4 w-4 text-muted-foreground shrink-0"/>
            <Select value={value} onValueChange={onChange}>
                <SelectTrigger className="h-8 w-[120px] text-sm border-0 bg-transparent">
                    <SelectValue placeholder={label}/>
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

    const ControlGroup = ({children}: { children: React.ReactNode }) => (
        <div
            className="flex items-center gap-2 border-l border-border/50 pl-2 ml-2 first:border-l-0 first:pl-0 first:ml-0">
            {children}
        </div>
    );

    const Controls = () => (
        <div className="flex items-center">
            <ControlGroup>
                <CompactSelectControl
                    label="Layout"
                    icon={Layout}
                    value={settings.layout}
                    options={layoutOptions}
                    onChange={(value) => setSettings(prev => ({...prev, layout: value}))}
                />
                {settings.layout === 'split' && (
                    <div className="flex items-center gap-2 bg-secondary/50 rounded-md px-2 py-1">
                        <Columns2 className="h-4 w-4 text-muted-foreground"/>
                        <Slider
                            value={[settings.splitRatio]}
                            onValueChange={([value]) => setSettings(prev => ({...prev, splitRatio: value}))}
                            min={10}
                            max={90}
                            step={10}
                            className="w-24"
                        />
                    </div>
                )}
            </ControlGroup>

            <ControlGroup>
                <CompactSelectControl
                    label="Size"
                    icon={Maximize2}
                    value={settings.size}
                    options={sizeOptions}
                    onChange={(value) => setSettings(prev => ({...prev, size: value}))}
                />
                <CompactSelectControl
                    label="Density"
                    icon={Layers}
                    value={settings.density}
                    options={densityOptions}
                    onChange={(value) => setSettings(prev => ({...prev, density: value}))}
                />
                <CompactSelectControl
                    label="Animation"
                    icon={Sparkles}
                    value={settings.animation}
                    options={animationOptions}
                    onChange={(value) => setSettings(prev => ({...prev, animation: value}))}
                />
            </ControlGroup>

            <ControlGroup>
                <CompactSelectControl
                    label="Form Layout"
                    icon={Grid}
                    value={settings.formOptions.formLayout}
                    options={formLayoutOptions}
                    onChange={(value) => setSettings(prev => ({
                        ...prev,
                        formOptions: {...prev.formOptions, formLayout: value}
                    }))}
                />
                <CompactSelectControl
                    label="Columns"
                    icon={Columns}
                    value={settings.formOptions.formColumns}
                    options={columnOptions}
                    onChange={(value) => setSettings(prev => ({
                        ...prev,
                        formOptions: {...prev.formOptions, formColumns: value}
                    }))}
                />
                <CompactSelectControl
                    label="Direction"
                    icon={ArrowRightLeft}
                    value={settings.formOptions.formDirection}
                    options={directionOptions}
                    onChange={(value) => setSettings(prev => ({
                        ...prev,
                        formOptions: {...prev.formOptions, formDirection: value}
                    }))}
                />
            </ControlGroup>

            <ControlGroup>
                <CompactSelectControl
                    label="Reference"
                    icon={List}
                    value={settings.quickReferenceType}
                    options={quickReferenceOptions}
                    onChange={(value) => setSettings(prev => ({
                        ...prev,
                        quickReferenceType: value
                    }))}
                />
                <div className="flex items-center gap-2 bg-secondary/50 rounded-md px-2 py-1">
                    <Maximize className="h-4 w-4 text-muted-foreground"/>
                    <Switch
                        id="fullscreen"
                        checked={settings.isFullScreen}
                        onCheckedChange={(checked) => setSettings(prev => ({...prev, isFullScreen: checked}))}
                        className="data-[state=checked]:bg-primary"
                    />
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
                        <div className="p-2">
                            <div className="flex items-center justify-between">
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => setShowControls(!showControls)}
                                    className="text-muted-foreground hover:text-primary"
                                >
                                    {showControls ? <PanelLeftClose className="h-4 w-4"/> : <PanelLeftOpen
                                        className="h-4 w-4"/>}
                                </Button>

                                {showControls && <Controls/>}

                                <Sheet>
                                    <SheetTrigger asChild>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="text-muted-foreground hover:text-primary"
                                        >
                                            <Settings2 className="h-4 w-4"/>
                                        </Button>
                                    </SheetTrigger>
                                    <SheetContent side="right"
                                                  className="w-[400px] overflow-y-auto bg-background/95 backdrop-blur">
                                        <SheetHeader>
                                            <SheetTitle>Advanced Settings</SheetTitle>
                                            <SheetDescription>
                                                Configure additional layout and behavior options.
                                            </SheetDescription>
                                        </SheetHeader>
                                        <Separator className="my-4"/>
                                    </SheetContent>
                                </Sheet>
                            </div>
                        </div>
                    </Card>

                    <div className="flex-1">
                        <ArmaniLayout
                            layoutVariant={settings.layout}
                            density={settings.density}
                            animationPreset={settings.animation}
                            size={settings.size}
                            quickReferenceType={settings.quickReferenceType}
                            splitRatio={settings.splitRatio}
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
