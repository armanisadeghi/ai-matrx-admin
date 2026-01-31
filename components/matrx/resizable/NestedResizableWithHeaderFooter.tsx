import React from 'react';
import {
    ResizablePanel,
    ResizablePanelGroup,
    ResizableHandle,
} from '@/components/ui/resizable';

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
    direction: 'horizontal' | 'vertical';
    sections: (ContentSection | NestedSection)[];
}

export type Section = ContentSection | NestedSection;

interface NestedResizableLayoutProps {
    layout: Section;
    className?: string;
}

const DefaultPanel: React.FC<{ children: React.ReactNode }> = ({children}) => (
    <div className="h-full w-full p-4 overflow-auto">
        {children}
    </div>
);

const RenderSection: React.FC<{
    section: Section;
    defaultSize: number;
}> = ({section, defaultSize}) => {
    if (section.type === 'content') {
        return (
            <ResizablePanel
                defaultSize={defaultSize}
                minSize={section.minSize || 10}
                maxSize={section.maxSize || 90}
                collapsible={section.collapsible}
            >
                <DefaultPanel>
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
            defaultSize={defaultSize}
            minSize={section.minSize || 10}
            maxSize={section.maxSize || 90}
            collapsible={section.collapsible}
        >
            <ResizablePanelGroup orientation={section.direction} className="h-full">
                {section.sections.map((nestedSection, idx) => (
                    <React.Fragment key={idx}>
                        <RenderSection
                            section={nestedSection}
                            defaultSize={nestedDefaultSizes[idx]}
                        />
                        {idx < section.sections.length - 1 && <ResizableHandle/>}
                    </React.Fragment>
                ))}
            </ResizablePanelGroup>
        </ResizablePanel>
    );
};

export function NestedResizableWithHeaderFooter({
    layout,
        className = ''
    }: NestedResizableLayoutProps) {
    return (
        <div className={`h-[calc(100vh-4rem)] bg-background ${className}`}>
            <ResizablePanelGroup orientation={layout.type === 'nested' ? layout.direction : 'horizontal'}>
                <RenderSection
                    section={layout}
                    defaultSize={100}
                />
            </ResizablePanelGroup>
        </div>
    );
}
