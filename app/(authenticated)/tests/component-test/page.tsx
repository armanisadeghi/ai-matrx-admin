'use client';

import React from 'react';
import ImageDisplay from '@/components/ui/image-display';
import TextDivider from '@/components/matrx/TextDivider';
import ColorPicker from '@/components/ui/color-picker';
import { Card } from '@/components/ui/card';


const imageSrc = "https://images.unsplash.com/photo-1575186083127-03641b958f61";
const testAltText = "A beautiful woman";


const TestPage = () => {
    return (
        <>
            <TextDivider text="ImageDisplay"/>
                <Card>
            <ImageDisplay
                src={imageSrc}
                alt={testAltText}
            />
            </Card>
            <TextDivider text=""/>

            {/* Add more components here following the same pattern */}

            <TextDivider text="ColorPicker"/>
            <ColorPicker />
            <TextDivider text=""/>

            <TextDivider text="AnotherComponent"/>
            {/* Place your next component here */}
            <TextDivider text=""/>

            <TextDivider text="AnotherComponent"/>
            {/* Place your next component here */}
            <TextDivider text=""/>

            <TextDivider text="AnotherComponent"/>
            {/* Place your next component here */}
            <TextDivider text=""/>

            <TextDivider text="AnotherComponent"/>
            {/* Place your next component here */}
            <TextDivider text=""/>

            <TextDivider text="AnotherComponent"/>
            {/* Place your next component here */}
            <TextDivider text=""/>

            <TextDivider text="AnotherComponent"/>
            {/* Place your next component here */}
            <TextDivider text=""/>

            <TextDivider text="AnotherComponent"/>
            {/* Place your next component here */}
            <TextDivider text=""/>

            <TextDivider text="AnotherComponent"/>
            {/* Place your next component here */}
            <TextDivider text=""/>

            <TextDivider text="AnotherComponent"/>
            {/* Place your next component here */}
            <TextDivider text=""/>

        </>
    );
};

export default TestPage;
