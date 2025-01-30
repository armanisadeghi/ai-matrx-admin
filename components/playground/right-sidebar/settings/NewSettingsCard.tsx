import React from 'react';
import { Button } from "@/components/ui/button";
import { SquarePlus } from "lucide-react";
import { MatrxGradientCard } from "../../../matrx/MatrxGradientCard";
import { cn } from '@/utils';

interface NewSettingsCardProps {
    onCreateNew: () => void;
    isDisabled: boolean;
    className?: string;
}

export const NewSettingsCard: React.FC<NewSettingsCardProps> = ({
    onCreateNew,
    isDisabled,
    className
}) => {
    return (
        <MatrxGradientCard
            title="Add Custom Settings"
            subtitle="Use up to 4 different sets of settings to generate your ideal result"
            description="Choose from different AI Models, Providers and Endpoints. Adjust the temperature, response format, and tools to generate your ideal result."
            className={cn("w-full text-sm sm:text-base", className)}
            containerClassName="bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500"
            headerClassName="py-4"
            contentClassName="flex flex-col items-center justify-center p-4"
            allowTitleWrap={true}
            allowDescriptionWrap={true}
        >
            <Button
                variant="outline"
                onClick={onCreateNew}
                disabled={isDisabled}
                className="w-full h-16 mt-6 bg-background/80 backdrop-blur-sm 
                          hover:bg-background/90 transition-all duration-300
                          flex items-center justify-center gap-2 px-3
                          text-xs sm:text-sm"
            >
                <SquarePlus className="w-4 h-4 flex-shrink-0" />
                <span className="font-medium whitespace-normal text-center leading-tight">
                    Create New Settings
                </span>
            </Button>
        </MatrxGradientCard>
    );
};

export default NewSettingsCard;