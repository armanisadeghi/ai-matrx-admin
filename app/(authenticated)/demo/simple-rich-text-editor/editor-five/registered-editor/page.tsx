'use client';
import React, { useState } from 'react';
import RegisteredEditor from './RegisteredEditor';

const Page: React.FC = () => {
    const EDITOR_ID = 'main-editor';
    const SAMPLE_TEXT = `Lorem ipsum dolor sit amet, consectetur adipiscing elit.`;
    const [text, setText] = useState('');

    return (
        <div className='flex w-full h-full min-h-96 border border-blue-500'>
            <RegisteredEditor
                componentId={EDITOR_ID}
                className='w-full border border-gray-300 dark:border-red-700 rounded-md'
                initialContent={SAMPLE_TEXT}
                onTextChange={setText}
            />
        </div>
    );
};

export default Page;
