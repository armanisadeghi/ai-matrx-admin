import React, {ReactNode} from 'react';
import {Card} from '@/components/ui/card';
import { ContentLayoutProps } from './types';
import {layoutConfigs} from "@/app/(authenticated)/tests/dynamic-layouts/layoutConfigs";
import {ContentLayout} from "@/app/(authenticated)/tests/dynamic-layouts/basic-layout-options/LayoutOptions";



// Example usage demonstration with typed components
const LayoutDemo: React.FC = () => {
    const DemoCard: React.FC<{ title: string }> = ({title}) => (
        <Card className="p-4">
            <h3 className="font-medium">{title}</h3>
            <p className="text-sm text-gray-500">Sample content for {title}</p>
        </Card>
    );

    return (
        <div className="space-y-8 p-4">
            {/* Single Column Demo */}
            <ContentLayout
                type="single"
                variant="standard"
                primaryContent={<DemoCard title="Single Column Content"/>}
            />

            {/* Two Column Demo */}
            <ContentLayout
                type="twoColumn"
                variant="primaryLeft"
                primaryContent={<DemoCard title="Primary Content"/>}
                secondaryContent={<DemoCard title="Secondary Content"/>}
            />

            {/* Grid Demo */}
            <ContentLayout
                type="grid"
                variant="cards"
                items={[
                    <DemoCard title="Grid Item 1"/>,
                    <DemoCard title="Grid Item 2"/>,
                    <DemoCard title="Grid Item 3"/>,
                    <DemoCard title="Grid Item 4"/>,
                ]}
            />
        </div>
    );
};

export default LayoutDemo;
