'use client';

import React, {useCallback} from 'react';
import {
    ResizablePanel,
    ResizablePanelGroup,
    ResizableHandle,
} from '@/components/ui/resizable';
import {PanelLeftClose} from 'lucide-react';
import {cn} from '@/utils';
import {useLayout} from './LayoutProvider';
import {ModuleHeader} from '@/components/matrx/navigation';
import {filteredPages, MODULE_HOME, MODULE_NAME} from './config';

interface BaseSection {
    defaultSize?: number;
    minSize?: number;
    maxSize?: number;
    collapsible?: boolean;
}

interface ContentSection extends BaseSection {
    type: 'content';
    content: React.ReactNode;
}

interface NestedSection extends BaseSection {
    type: 'nested';
    sections: (ContentSection | NestedSection)[];
}

export type Section = ContentSection | NestedSection;

interface NestedResizableLayoutProps {
    sections: Section[];
    className?: string;
    children?: React.ReactNode;
}

export const CollapsibleHeader: React.FC<{
    onCollapse?: () => void;
    isCollapsed?: boolean;
    className?: string;
}> = ({onCollapse, isCollapsed, className}) => {
    return (
        <div className={cn("flex items-center justify-end h-6 px-2 bg-muted/50", className)}>
            <button
                onClick={onCollapse}
                className="p-1 hover:bg-muted rounded-sm transition-colors"
            >
                <PanelLeftClose
                    className={cn(
                        "h-4 w-4 transition-transform",
                        isCollapsed ? "rotate-180" : ""
                    )}
                />
            </button>
        </div>
    );
};

const DefaultPanel: React.FC<{
    children: React.ReactNode;
    collapsible?: boolean;
    onCollapse?: () => void;
    isCollapsed?: boolean;
}> = ({children, collapsible, onCollapse, isCollapsed}) => (
    <div className="h-full w-full flex flex-col">
        {collapsible && (
            <CollapsibleHeader
                onCollapse={onCollapse}
                isCollapsed={isCollapsed}
            />
        )}
        <div className="flex-1 bg-background p-4 overflow-auto">
            {children}
        </div>
    </div>
);

const RenderSection: React.FC<{
    section: Section;
    defaultSize: number;
    onCollapse?: () => void;
    isCollapsed?: boolean;
}> = ({section, defaultSize, onCollapse, isCollapsed}) => {
    const actualSize = isCollapsed ? 0 : defaultSize;

    if (section.type === 'content') {
        return (
            <ResizablePanel
                defaultSize={actualSize}
                collapsible={section.collapsible}
            >
                <DefaultPanel
                    collapsible={section.collapsible}
                    onCollapse={onCollapse}
                    isCollapsed={isCollapsed}
                >
                    {section.content}
                </DefaultPanel>
            </ResizablePanel>
        );
    }

    const nestedDefaultSizes = section.sections.map(s =>
        s.defaultSize || (100 / section.sections.length)
    );

    return (
        <ResizablePanel
            defaultSize={actualSize}
            collapsible={section.collapsible}
        >
            <ResizablePanelGroup direction="vertical" className="h-full">
                {section.sections.map((nestedSection, idx) => (
                    <React.Fragment key={idx}>
                        <RenderSection
                            section={nestedSection}
                            defaultSize={nestedDefaultSizes[idx]}
                            onCollapse={onCollapse}
                            isCollapsed={isCollapsed}
                        />
                        {idx < section.sections.length - 1 && <ResizableHandle/>}
                    </React.Fragment>
                ))}
            </ResizablePanelGroup>
        </ResizablePanel>
    );
};

export function ModuleLayout(
    {
        sections,
        className = '',
        children
    }: NestedResizableLayoutProps) {
    const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';
    const {options, updateOptions} = useLayout();

    // Handle children by appending it as the main content section if not already included
    const effectiveSections = React.useMemo(() => {
        if (!children) return sections;

        const childrenSection = sections.find(section =>
            section.type === 'content' && section.content === children
        );

        if (childrenSection) return sections;

        return [
            ...sections,
            {
                type: 'content' as const,
                content: children,
                defaultSize: 100 - sections.reduce((acc, section) => acc + (section.defaultSize || 0), 0)
            }
        ];
    }, [sections, children]);

    const defaultSizes = effectiveSections.map(section =>
        section.defaultSize || (100 / effectiveSections.length)
    );

    return (
        <div className="h-full flex flex-col">
            {options.header?.show && (
                <ModuleHeader
                    pages={filteredPages}
                    currentPath={currentPath}
                    moduleHome={MODULE_HOME}
                    moduleName={MODULE_NAME}
                />
            )}
            <div className={cn("flex-1", className)}>
                <ResizablePanelGroup direction="horizontal">
                    {effectiveSections.map((section, index) => (
                        <React.Fragment key={index}>
                            <RenderSection
                                section={section}
                                defaultSize={defaultSizes[index]}
                                onCollapse={() => {
                                    const isCollapsed = options.leftSections?.[index]?.collapsible;
                                    updateOptions({
                                        leftSections: options.leftSections?.map((s, i) =>
                                            i === index ? {...s, collapsible: !isCollapsed} : s
                                        )
                                    });
                                }}
                                isCollapsed={options.leftSections?.[index]?.collapsible}
                            />
                            {index < effectiveSections.length - 1 && <ResizableHandle/>}
                        </React.Fragment>
                    ))}
                </ResizablePanelGroup>
            </div>
        </div>
    );
}