// EntityPageClientLayout.tsx
'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { EntityControlSet } from './entity-control-set';
import ArmaniLayout from '@/components/matrx/Entity/prewired-components/layouts/ArmaniLayout';
import { cn } from '@/utils/cn';
import { ENTITY_PAGE_DEFAULTS } from './constants';
import { Button, Card } from "@/components/ui";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";

const EntityPageLayout = () => {
    const [settings, setSettings] = useState(ENTITY_PAGE_DEFAULTS);
    const [showControls, setShowControls] = useState(true);

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
                    <Card className="rounded-none border-x-0 border-t-0 bg-card/50 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                        <div className="p-2">
                            <div className="flex items-start gap-2">
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => setShowControls(!showControls)}
                                    className="shrink-0 text-muted-foreground hover:text-primary"
                                >
                                    {showControls ? <PanelLeftClose className="h-4 w-4"/> : <PanelLeftOpen className="h-4 w-4"/>}
                                </Button>

                                {showControls && (
                                    <div className="flex-1">
                                        <EntityControlSet
                                            settings={settings}
                                            setSettings={setSettings}
                                        />
                                    </div>
                                )}
                            </div>
                        </div>
                    </Card>

                    <div className="flex-1 overflow-hidden">
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
                                formColumns: settings.formOptions.formColumns,
                                formDirection: settings.formOptions.formDirection,
                                formEnableSearch: settings.formOptions.formEnableSearch,
                                formIsSinglePage: !settings.formOptions.formVariation.includes('MultiStep'),
                                formIsFullPage: settings.formOptions.formVariation.includes('fullWidth'),
                                floatingLabel: settings.formOptions.floatingLabel,
                                showLabel: settings.formOptions.showLabel,
                                textSize: settings.formOptions.textSize,
                                inlineEntityOptions: settings.inlineEntityOptions,
                            }}
                            className="h-full"
                        />
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

export default EntityPageLayout;
