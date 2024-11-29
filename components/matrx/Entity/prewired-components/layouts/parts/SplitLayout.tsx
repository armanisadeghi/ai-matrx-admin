// SplitLayout.tsx
import React from 'react';
import {Card, CardContent, CardHeader, CardTitle} from '@/components/ui/card';
import {ScrollArea} from "@/components/ui/scroll-area";
import {Button} from '@/components/ui/button';
import {Maximize2, Minimize2} from 'lucide-react';
import {TooltipProvider, Tooltip, TooltipTrigger, TooltipContent} from "@/components/ui/tooltip";
import {cn} from '@/lib/utils';
import {densityConfig} from "@/config/ui/entity-layout-config";
import {EnhancedCard} from './EnhancedCard';
import EntityContent from "@/components/matrx/Entity/prewired-components/development/EntityContent";
import EntitySelection from "@/components/matrx/Entity/prewired-components/entity-management/EntitySelection";
import {UnifiedLayoutProps} from "../types";


export const SplitLayout: React.FC<UnifiedLayoutProps> = (
    {
        layoutState: {
            selectedEntity,
            isExpanded,
            rightColumnRef,
            selectHeight
        },
        QuickReferenceComponent,
        formStyleOptions: {
            splitRatio = 20,
            ...formStyleOptions
        },
        dynamicStyleOptions: {
            density = 'normal',
        },
        handlers: {
            setIsExpanded,
            handleEntityChange
        }
    }) => (
    <div className="relative h-full overflow-hidden">
        <div
            className={cn(
                "grid h-full overflow-hidden",
                isExpanded ? 'grid-cols-1' : 'grid-cols-[minmax(300px,1fr)_1fr]',
                densityConfig[density].spacing
            )}
            style={{
                gridTemplateColumns: isExpanded ? '1fr' : `${splitRatio}% ${100 - splitRatio}%`
            }}
        >
            {!isExpanded && (
                <div className="flex flex-col gap-4 min-w-0">
                    <EnhancedCard>
                        <CardContent className="p-2">
                            <EntitySelection
                                selectedEntity={selectedEntity}
                                onEntityChange={handleEntityChange}
                                layout="sideBySide"
                                selectHeight={selectHeight}
                                density={density}
                            />
                        </CardContent>
                    </EnhancedCard>

                    {selectedEntity && (
                        <EnhancedCard cardRef={rightColumnRef}>
                            <CardHeader>
                                <CardTitle className={densityConfig[density].fontSize}>
                                    Quick Reference
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-0">
                                <ScrollArea className={densityConfig[density].maxHeight}>
                                    {QuickReferenceComponent}
                                </ScrollArea>
                            </CardContent>
                        </EnhancedCard>
                    )}
                </div>
            )}

            <div className="min-w-0 relative">
                {selectedEntity && (
                    <EnhancedCard className="h-full">
                        <div className="absolute top-4 right-4 z-20 flex gap-2">
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => setIsExpanded(!isExpanded)}
                                        >
                                            {isExpanded ?
                                             <Minimize2 className={densityConfig[density].iconSize}/> :
                                             <Maximize2 className={densityConfig[density].iconSize}/>
                                            }
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <p>{isExpanded ? 'Show sidebar' : 'Hide sidebar'}</p>
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        </div>
                        <CardContent className="p-0 pr-4">
                            <EntityContent
                                entityKey={selectedEntity}
                                density={density}
                                formOptions={formStyleOptions}
                            />
                        </CardContent>
                    </EnhancedCard>
                )}
            </div>
        </div>
    </div>
);

export default SplitLayout;
