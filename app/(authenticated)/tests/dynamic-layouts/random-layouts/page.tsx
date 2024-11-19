import React from 'react';
import { Card } from '@/components/ui/card';
import {ContentLayout} from "@/app/(authenticated)/tests/dynamic-layouts/basic-layout-options/LayoutOptions";

const LayoutDemo: React.FC = () => {
    const DemoCard: React.FC<{ title: string }> = ({ title }) => (
        <Card className="p-4">
            <h3 className="font-medium">{title}</h3>
            <p className="text-sm text-gray-500">Sample content for {title}</p>
        </Card>
    );

    return (
        <div className="space-y-8 p-4">
            {/* Single Column Layouts */}
            <div>
                <h2 className="text-2xl font-bold">Single Column Layouts</h2>

                <ContentLayout
                    type="single"
                    variant="standard"
                    primaryContent={<DemoCard title="Standard Single Column" />}
                />

                <ContentLayout
                    type="single"
                    variant="narrow"
                    primaryContent={<DemoCard title="Narrow Single Column" />}
                />

                <ContentLayout
                    type="single"
                    variant="wide"
                    primaryContent={<DemoCard title="Wide Single Column" />}
                />
            </div>

            {/* Two Column Layouts */}
            <div>
                <h2 className="text-2xl font-bold">Two Column Layouts</h2>

                <ContentLayout
                    type="twoColumn"
                    variant="even"
                    primaryContent={<DemoCard title="Primary Content" />}
                    secondaryContent={<DemoCard title="Secondary Content" />}
                />

                <ContentLayout
                    type="twoColumn"
                    variant="primaryLeft"
                    primaryContent={<DemoCard title="Primary Left Content" />}
                    secondaryContent={<DemoCard title="Secondary Content" />}
                />

                <ContentLayout
                    type="twoColumn"
                    variant="primaryRight"
                    primaryContent={<DemoCard title="Primary Right Content" />}
                    secondaryContent={<DemoCard title="Secondary Content" />}
                />
            </div>

            {/* Three Column Layouts */}
            <div>
                <h2 className="text-2xl font-bold">Three Column Layouts</h2>

                <ContentLayout
                    type="threeColumn"
                    variant="equal"
                    primaryContent={<DemoCard title="Primary Content" />}
                    secondaryContent={<DemoCard title="Secondary Content" />}
                    tertiaryContent={<DemoCard title="Tertiary Content" />}
                />

                <ContentLayout
                    type="threeColumn"
                    variant="primaryCenter"
                    primaryContent={<DemoCard title="Primary Center Content" />}
                    secondaryContent={<DemoCard title="Secondary Content" />}
                    tertiaryContent={<DemoCard title="Tertiary Content" />}
                />
            </div>

            {/* Grid Layouts */}
            <div>
                <h2 className="text-2xl font-bold">Grid Layouts</h2>

                <ContentLayout
                    type="grid"
                    variant="cards"
                    items={[
                        <DemoCard title="Grid Item 1" />,
                        <DemoCard title="Grid Item 2" />,
                        <DemoCard title="Grid Item 3" />,
                        <DemoCard title="Grid Item 4" />,
                    ]}
                />

                <ContentLayout
                    type="grid"
                    variant="masonry"
                    items={[
                        <DemoCard title="Masonry Item 1" />,
                        <DemoCard title="Masonry Item 2" />,
                        <DemoCard title="Masonry Item 3" />,
                        <DemoCard title="Masonry Item 4" />,
                    ]}
                />
            </div>

            {/* List Layouts */}
            <div>
                <h2 className="text-2xl font-bold">List Layouts</h2>

                <ContentLayout
                    type="list"
                    variant="standard"
                    items={[
                        <DemoCard title="List Item 1" />,
                        <DemoCard title="List Item 2" />,
                        <DemoCard title="List Item 3" />,
                        <DemoCard title="List Item 4" />,
                    ]}
                />

                <ContentLayout
                    type="list"
                    variant="compact"
                    items={[
                        <DemoCard title="Compact Item 1" />,
                        <DemoCard title="Compact Item 2" />,
                        <DemoCard title="Compact Item 3" />,
                        <DemoCard title="Compact Item 4" />,
                    ]}
                />
            </div>
        </div>
    );
};

export default LayoutDemo;
