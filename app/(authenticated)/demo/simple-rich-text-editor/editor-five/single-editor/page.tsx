'use client';

import React, { useState, useEffect } from 'react';
import { useEditorContext } from '@/features/rich-text-editor/provider/new/EditorProvider';
import { MatrxTableLoading } from '@/components/matrx/LoadingComponents';
import EditorDisplayWrapper from './EditorDisplayWrapper';

const EDITOR_ID: string = 'main-editor';

const SAMPLE_TEXT: string = `Lorem ipsum dolor sit amet, consectetur adipiscing elit.`;

const Page: React.FC = () => {
    const [isRegistered, setIsRegistered] = useState(false);
    const context = useEditorContext();

    useEffect(() => {
        if (!isRegistered) {
            context.registerEditor(EDITOR_ID);
            setIsRegistered(true);
        }
    }, [context, isRegistered]);

    if (!isRegistered) {
        return <MatrxTableLoading />;
    }

    return <EditorDisplayWrapper editorId={EDITOR_ID} initialContent={SAMPLE_TEXT} />;
};

export default Page;
