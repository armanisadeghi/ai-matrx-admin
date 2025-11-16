// EntityLayout.tsx
import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { CardContent } from "@/components/ui/card";
import { EntityError } from "@/lib/redux/entity/types/stateTypes";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { densityConfig, containerVariants } from "@/config/ui/entity-layout-config";
import { UnifiedLayoutProps } from "@/components/matrx/Entity/prewired-components/layouts/types";
import EnhancedCard from "@/components/matrx/Entity/prewired-components/layouts/parts/EnhancedCard";
import UnifiedLayoutRenderer from "./parts/UnifiedLayoutRenderer";

export interface ArmaniLayoutProps {
    unifiedLayoutProps: UnifiedLayoutProps;
    className?: string;
}

const ArmaniLayout: React.FC<ArmaniLayoutProps> = ({
    unifiedLayoutProps,
    className,
}) => {
    // Extract values from unified props
    const density = unifiedLayoutProps.dynamicStyleOptions.density;
    const animationPreset = unifiedLayoutProps.dynamicStyleOptions.animationPreset;
    
    // Local state for error handling (since this is specific to ArmaniLayout)
    const [error, setError] = useState<EntityError | null>(null);

    return (
        <div className={cn("w-full h-full relative overflow-hidden", densityConfig[density].spacing, className)}>
            <AnimatePresence mode="sync">
                <motion.div
                    className="h-full"
                    variants={containerVariants[animationPreset]}
                    initial="initial"
                    animate="animate"
                    exit="exit"
                >
                    <UnifiedLayoutRenderer 
                        unifiedLayoutProps={unifiedLayoutProps}
                        className="h-full"
                    />
                </motion.div>
            </AnimatePresence>

            <AnimatePresence>
                {error && (
                    <motion.div
                        className="fixed bottom-4 right-4 z-50"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 20 }}
                    >
                        <EnhancedCard className="bg-destructive text-destructive-foreground">
                            <CardContent className="flex items-center gap-2">
                                <p>{error.message}</p>
                                <Button variant="ghost" size="icon" onClick={() => setError(null)} className="text-destructive-foreground">
                                    <ArrowLeft className={densityConfig[density].iconSize} />
                                </Button>
                            </CardContent>
                        </EnhancedCard>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default ArmaniLayout;
