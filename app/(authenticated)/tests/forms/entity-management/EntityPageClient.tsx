// EntityPageClientLayout.tsx
'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { EntityControlSet } from './entity-control-set';
import EntityControlSetStacked from './entity-control-set-stacked';
import ArmaniLayout from '@/components/matrx/Entity/prewired-components/layouts/ArmaniLayout';
import { cn } from '@/lib/utils';
import { Button, Card } from "@/components/ui";
import { PanelLeftClose, PanelLeftOpen, Grid3X3, AlignJustify } from "lucide-react";
import { getUnifiedLayoutProps } from '@/app/entities/layout/configs';
import { UnifiedLayoutProps } from '@/components/matrx/Entity/prewired-components/layouts/types';
import { ADDITIONAL_SETTINGS_DEFAULTS } from './constants';

const EntityPageLayout = () => {
    // Initialize with central config defaults - always returns complete UnifiedLayoutProps
    const [unifiedProps, setUnifiedProps] = useState<UnifiedLayoutProps>(() => 
        getUnifiedLayoutProps({
            entityKey: 'registeredFunction',
            formComponent: 'DEFAULT',
            quickReferenceType: 'list',
            formLayoutType: 'split',
            density: 'normal',
            isExpanded: false,
        })
    );

    // Additional settings not yet part of unified structure
    const [additionalSettings, setAdditionalSettings] = useState(ADDITIONAL_SETTINGS_DEFAULTS);

    const [showControls, setShowControls] = useState(true);
    const [activeControlSet, setActiveControlSet] = useState<'stacked' | 'horizontal'>('stacked');


    return (
        <div className="h-full w-full bg-background">
            <motion.div
                className={cn(
                    "relative w-full h-full",
                    additionalSettings.isFullScreen && "fixed inset-0 z-50"
                )}
                layout
            >
                <div className="h-full flex flex-col">
                    <Card className="rounded-none border-x-0 border-t-0 bg-card/50 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                        <div className="p-2">
                            <div className="flex items-start gap-2">
                                <div className="flex flex-col gap-1 shrink-0">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => setShowControls(!showControls)}
                                        className="text-muted-foreground hover:text-primary"
                                    >
                                        {showControls ? <PanelLeftClose className="h-4 w-4"/> : <PanelLeftOpen className="h-4 w-4"/>}
                                    </Button>
                                    
                                    {showControls && (
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => setActiveControlSet(activeControlSet === 'stacked' ? 'horizontal' : 'stacked')}
                                            className="h-8 w-8 text-muted-foreground hover:text-primary"
                                            title={`Switch to ${activeControlSet === 'stacked' ? 'horizontal' : 'stacked'} layout`}
                                        >
                                            {activeControlSet === 'stacked' ? <Grid3X3 className="h-3 w-3"/> : <AlignJustify className="h-3 w-3"/>}
                                        </Button>
                                    )}
                                </div>

                                {showControls && (
                                    <div className="flex-1">
                                        {activeControlSet === 'stacked' ? (
                                            <EntityControlSetStacked
                                                unifiedProps={unifiedProps}
                                                setUnifiedProps={setUnifiedProps}
                                                additionalSettings={additionalSettings}
                                                setAdditionalSettings={setAdditionalSettings}
                                            />
                                        ) : (
                                            <EntityControlSet
                                                unifiedProps={unifiedProps}
                                                setUnifiedProps={setUnifiedProps}
                                                additionalSettings={additionalSettings}
                                                setAdditionalSettings={setAdditionalSettings}
                                            />
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </Card>

                    <div className="flex-1 overflow-hidden">
                        <ArmaniLayout
                            unifiedLayoutProps={unifiedProps}
                            className="h-full"
                        />
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

export default EntityPageLayout;
