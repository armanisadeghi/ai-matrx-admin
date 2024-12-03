'use client';
import React from 'react';
import { NestedResizableLayout, Section } from '@/components/matrx/resizable/NestedResizableLayout';
import { EntitySelectionSection } from './EntitySelectionSection';
import { QuickReferenceSection } from './QuickReferenceSection';
import { EntityDataSection } from './EntityDataSection';
import { UnifiedLayoutProps } from "@/components/matrx/Entity";
import { DEFAULT_RESIZABLE_LAYOUT_OPTIONS } from '@/app/(authenticated)/tests/forms/entity-management-smart-fields/configs';


export const SmartResizableLayout: React.FC<UnifiedLayoutProps> = (unifiedLayoutProps) => {
    const selectedEntity = unifiedLayoutProps.layoutState?.selectedEntity || null;
    const options = unifiedLayoutProps.resizableLayoutOptions || DEFAULT_RESIZABLE_LAYOUT_OPTIONS;


    const {
        leftColumnWidth,
        topLeftHeight,
        minColumnWidth,
        minSectionHeight,
        quickRefCollapsible,
        leftColumnCollapsible
    } = options;

    const sections: Section[] = [
        {
            type: 'nested',
            defaultSize: leftColumnWidth,
            minSize: minColumnWidth,
            maxSize: 40,
            collapsible: leftColumnCollapsible,
            sections: [
                {
                    type: 'content',
                    content: <EntitySelectionSection {...unifiedLayoutProps} />,
                    defaultSize: topLeftHeight,
                    minSize: minSectionHeight,
                    maxSize: 30,
                    collapsible: false
                },
                {
                    type: 'content',
                    content: selectedEntity && <QuickReferenceSection {...unifiedLayoutProps} />,
                    defaultSize: 100 - topLeftHeight,
                    minSize: minSectionHeight,
                    collapsible: quickRefCollapsible
                }
            ]
        },
        {
            type: 'content',
            content: selectedEntity && <EntityDataSection {...unifiedLayoutProps} />,
            defaultSize: 100 - leftColumnWidth,
            minSize: minColumnWidth,
            collapsible: false
        }
    ];

    return <NestedResizableLayout sections={sections} />;
};

export default SmartResizableLayout;
