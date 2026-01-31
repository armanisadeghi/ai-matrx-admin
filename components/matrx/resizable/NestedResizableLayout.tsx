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
    sections: (ContentSection | NestedSection)[];
}

export type Section = ContentSection | NestedSection;

interface NestedResizableLayoutProps {
    sections: Section[];
    className?: string;
}

const DefaultPanel: React.FC<{ children: React.ReactNode }> = ({children}) => (
    <div className="h-full w-full bg-background p-4 overflow-auto">
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

    // Calculate default sizes for nested sections
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
            <ResizablePanelGroup orientation="vertical" className="h-full">
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

export function NestedResizableLayout(
    {
        sections,
        className = ''
    }: NestedResizableLayoutProps) {
    const defaultSizes = sections.map(section =>
        section.defaultSize || (100 / sections.length)
    );

    return (
        <div className={`h-[calc(100vh-4rem)] ${className}`}>
            <ResizablePanelGroup orientation="horizontal">
                {sections.map((section, index) => (
                    <React.Fragment key={index}>
                        <RenderSection
                            section={section}
                            defaultSize={defaultSizes[index]}
                        />
                        {index < sections.length - 1 && <ResizableHandle/>}
                    </React.Fragment>
                ))}
            </ResizablePanelGroup>
        </div>
    );
}
