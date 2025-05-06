"use client";
import React, { ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { classColorOptions } from "@/components/official/styles";



interface SectionCardProps {
    title: string;
    description?: string;
    descriptionNode?: ReactNode;
    children: ReactNode;
    footer?: ReactNode;
    gridCols?: number; // Number of columns for the grid
    gridGap?: string; // Gap between grid items
    autoGrid?: boolean; // Whether to enable auto grid or not
    headerActions?: ReactNode; // Add header actions support for buttons
    color?: keyof typeof classColorOptions;
}

const SectionCard: React.FC<SectionCardProps> = ({
    title,
    description,
    descriptionNode,
    children,
    footer,
    gridCols = 3,
    gridGap = "1rem",
    autoGrid = false,
    headerActions,
    color = "rose",
}) => {
    
    const getGridClasses = () => {
        if (!autoGrid) return "";

        // Tailwind grid classes based on columns
        const gridColsClass =
            {
                1: "grid-cols-1",
                2: "grid-cols-1 sm:grid-cols-2",
                3: "grid-cols-1 sm:grid-cols-2 md:grid-cols-3",
                4: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4",
                5: "grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5",
                6: "grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6",
            }[gridCols] || "grid-cols-1 sm:grid-cols-2 md:grid-cols-3";

        return `grid ${gridColsClass} gap-${gridGap}`;
    };

    const getCardClasses = () => {
        return classColorOptions[color];
    };
    

    return (
        <Card className={getCardClasses().card}>
            <CardHeader className={getCardClasses().cardHeader}>
                <div className="grid md:grid-cols-[1fr_auto] gap-4 md:items-center">
                    <div className="flex flex-col gap-1">
                        <CardTitle className={getCardClasses().cardTitle}>{title}</CardTitle>
                        {description && !descriptionNode && <div className={getCardClasses().cardDescription}>{description}</div>}
                        {descriptionNode && <div className={getCardClasses().cardDescriptionNode}>{descriptionNode}</div>}
                    </div>
                    {headerActions && <div className="flex items-center">{headerActions}</div>}
                </div>
            </CardHeader>
            <CardContent className={autoGrid ? getGridClasses() : ""}>{children}</CardContent>
            {footer && (
                <CardFooter className={getCardClasses().cardFooter}>{footer}</CardFooter>
            )}
        </Card>
    );
};

export default SectionCard;
