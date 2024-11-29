// StackedLayout.tsx
import React from 'react';
import {motion, AnimatePresence} from 'framer-motion';
import {CardContent} from '@/components/ui/card';
import {ScrollArea} from "@/components/ui/scroll-area";
import {Button} from '@/components/ui/button';
import {Plus} from 'lucide-react';
import {cn} from '@/lib/utils';
import {densityConfig} from "@/config/ui/entity-layout-config";
import {EnhancedCard} from './EnhancedCard';
import {LayoutHeader} from './LayoutHeader';
import EntityContent from "@/components/matrx/Entity/prewired-components/development/EntityContent";
import EntitySelection from "@/components/matrx/Entity/prewired-components/entity-management/EntitySelection";
import {UnifiedLayoutProps} from "../types";

export const StackedLayout: React.FC<UnifiedLayoutProps> = (
    {
        layoutState: {
            selectedEntity,
            rightColumnRef,
            selectHeight
        },
        QuickReferenceComponent,
        formStyleOptions,
        dynamicStyleOptions: {
            density = 'normal',
        },
        handlers: {
            handleEntityChange,
            onCreateEntityClick
        }
    }) => (
    <div
        className={cn(
            "flex flex-col h-full overflow-hidden",
            densityConfig[density].spacing
        )}
    >
        <div className="flex-shrink-0">
            <EnhancedCard>
                <LayoutHeader
                    title="Entity Selection"
                    tooltip="Select an entity to begin working"
                    density={density}
                />
                <CardContent>
                    <EntitySelection
                        selectedEntity={selectedEntity}
                        onEntityChange={handleEntityChange}
                        layout="stacked"
                        selectHeight={selectHeight}
                        density={density}
                    />
                </CardContent>
            </EnhancedCard>
        </div>

        {selectedEntity && (
            <>
                <div className="flex-shrink-0">
                    <EnhancedCard cardRef={rightColumnRef}>
                        <LayoutHeader
                            title="Quick Reference"
                            tooltip="Quickly select or create records"
                            density={density}
                            actions={
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={onCreateEntityClick}
                                    className={densityConfig[density].buttonSize}
                                >
                                    <Plus className={densityConfig[density].iconSize}/>
                                    <span className="ml-2">New Record</span>
                                </Button>
                            }
                        />
                        <CardContent className="p-0">
                            <ScrollArea className={cn(
                                densityConfig[density].maxHeight,
                                "px-4"
                            )}>
                                {QuickReferenceComponent}
                            </ScrollArea>
                        </CardContent>
                    </EnhancedCard>
                </div>

                <div className="flex-1 min-h-0">
                    <EnhancedCard className="h-full">
                        <EntityContent
                            entityKey={selectedEntity}
                            density={density}
                            formOptions={formStyleOptions}
                        />
                    </EnhancedCard>
                </div>
            </>
        )}
    </div>
);

export default StackedLayout;
