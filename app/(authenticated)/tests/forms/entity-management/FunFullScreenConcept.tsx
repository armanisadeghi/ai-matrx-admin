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
import {Button} from "@/components/ui";
import {
    Settings2,
    Layout,
    Layers,
    Monitor,
    SquareActivity,
    PanelLeftClose,
    PanelLeftOpen,
    Rows,
    Columns,
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
import {cn} from '@nextui-org/react';
import {
    AnimationPreset,
    ComponentDensity,
    ComponentSize,
    LayoutVariant,
    QuickReferenceComponentType,
    SelectOption,
    animationPresetOptions,
    densityOptions,
    componentSizeOptions,
    formLayoutOptions,
    quickReferenceComponentOptions
} from '@/types/componentConfigTypes';
import {EntityLayout} from "@/components/matrx/Entity/prewired-components";

const EntityPageClient = () => {
    const [settings, setSettings] = useState({
        layout: 'split' as LayoutVariant,
        density: 'normal' as ComponentDensity,
        animation: 'smooth' as AnimationPreset,
        size: 'md' as ComponentSize,
        quickReference: 'cardsEnhanced' as QuickReferenceComponentType,
        isFullScreen: false,
    });

    const [showControls, setShowControls] = useState(true);
    const [isCompactControls, setIsCompactControls] = useState(false);

    const SelectControl = <T extends string | number>({
                                                          label,
                                                          icon: Icon,
                                                          value,
                                                          options,
                                                          onChange,
                                                      }: {
        label: string;
        icon: React.ElementType;
        value: T;
        options: SelectOption<T>[];
        onChange: (value: T) => void;
    }) => (
        <div className={cn(
            "flex gap-2",
            isCompactControls ? "flex-row items-center" : "flex-col",
        )}>
            <div className="flex items-center gap-2 min-w-[120px]">
                <Icon className="h-4 w-4 text-muted-foreground"/>
                <span className="text-sm font-medium text-foreground">{label}</span>
            </div>
            <Select value={value.toString()} onValueChange={(val) => onChange(val as T)}>
                <SelectTrigger className={cn(
                    "bg-card border-input",
                    isCompactControls ? "w-[140px]" : "w-full"
                )}>
                    <SelectValue/>
                </SelectTrigger>
                <SelectContent className="bg-popover border-border">
                    {options.map(option => (
                        <SelectItem
                            key={option.key}
                            value={option.value.toString()}
                            className="hover:bg-accent hover:text-accent-foreground"
                        >
                            {option.label}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
    );


    const ControlPanel = () => (
        <div className={cn(
            "w-full transition-all duration-200",
            isCompactControls ? "space-y-2" : "space-y-4"
        )}>
            <div className={cn(
                "flex items-center justify-between",
                isCompactControls ? "flex-row flex-wrap gap-4" : "flex-col gap-4"
            )}>
                <SelectControl
                    label="Layout"
                    icon={Layout}
                    value={settings.layout}
                    options={formLayoutOptions}
                    onChange={(value: LayoutVariant) =>
                        setSettings(prev => ({...prev, layout: value}))}
                />

                <SelectControl
                    label="Density"
                    icon={Layers}
                    value={settings.density}
                    options={densityOptions}
                    onChange={(value: ComponentDensity) =>
                        setSettings(prev => ({...prev, density: value}))}
                />

                <SelectControl
                    label="Animation"
                    icon={SquareActivity}
                    value={settings.animation}
                    options={animationPresetOptions}
                    onChange={(value: AnimationPreset) =>
                        setSettings(prev => ({...prev, animation: value}))}
                />

                <SelectControl
                    label="Size"
                    icon={Monitor}
                    value={settings.size}
                    options={componentSizeOptions}
                    onChange={(value: ComponentSize) =>
                        setSettings(prev => ({...prev, size: value}))}
                />

                <SelectControl
                    label="Quick Reference"
                    icon={Monitor}
                    value={settings.quickReference}
                    options={quickReferenceComponentOptions}
                    onChange={(value: QuickReferenceComponentType) =>
                        setSettings(prev => ({...prev, quickReference: value}))}
                />

                <div className={cn(
                    "flex items-center",
                    isCompactControls ? "gap-2" : "w-full justify-between"
                )}>
                    <Switch
                        id="fullscreen"
                        checked={settings.isFullScreen}
                        onCheckedChange={(checked) =>
                            setSettings(prev => ({...prev, isFullScreen: checked}))}
                        className="data-[state=checked]:bg-primary"
                    />
                    <Label htmlFor="fullscreen" className="text-sm text-muted-foreground">
                        Full Screen
                    </Label>
                </div>
            </div>
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
                    {showControls && (
                        <Card
                            className="rounded-none border-x-0 border-t-0 bg-card/50 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                            <div className="p-4">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-2">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => setIsCompactControls(!isCompactControls)}
                                            className="text-muted-foreground hover:text-primary"
                                        >
                                            {isCompactControls ? <Rows/> : <Columns/>}
                                        </Button>
                                        <Separator orientation="vertical" className="h-4"/>
                                        <span className="text-sm font-medium text-foreground">
                                            Layout Controls
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2">
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
                                            <SheetContent className="bg-background border-border">
                                                <SheetHeader>
                                                    <SheetTitle>Layout Settings</SheetTitle>
                                                    <SheetDescription>
                                                        Customize the appearance and behavior of the interface.
                                                    </SheetDescription>
                                                </SheetHeader>
                                                <Separator className="my-4"/>
                                                <div className="py-4">
                                                    <ControlPanel/>
                                                </div>
                                            </SheetContent>
                                        </Sheet>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => setShowControls(false)}
                                            className="text-muted-foreground hover:text-primary"
                                        >
                                            <PanelLeftClose className="h-4 w-4"/>
                                        </Button>
                                    </div>
                                </div>
                                <ControlPanel/>
                            </div>
                        </Card>
                    )}

                    {!showControls && (
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setShowControls(true)}
                            className="absolute top-2 right-2 z-10 bg-background/80 backdrop-blur-sm hover:bg-primary hover:text-primary-foreground"
                        >
                            <PanelLeftOpen className="h-4 w-4"/>
                        </Button>
                    )}

                    <div className="flex-1">
                        <EntityLayout
                            layoutVariant={settings.layout}
                            density={settings.density}
                            animationPreset={settings.animation}
                            size={settings.size}
                            quickReferenceType={settings.quickReference}
                            className="h-full"
                        />
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

export default EntityPageClient;
