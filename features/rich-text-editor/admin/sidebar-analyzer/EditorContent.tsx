'use client';

import React, { useState } from 'react';
import { Textarea } from '@/components/ui/textarea';

import { Switch } from '@/components/ui';
import { useEditorContext } from '@/providers/rich-text-editor/Provider';


const EditorContent = ({ editorId }: { editorId: string }) => {
    const [showTokenIds, setShowTokenIds] = useState(false);
    const context = useEditorContext();
    const state = context.getEditorState(editorId);
    
    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Current Text Content</label>
                <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Show Token IDs</span>
                    <Switch
                        checked={showTokenIds}
                        onCheckedChange={setShowTokenIds}
                    />
                </div>
            </div>
            <Textarea 
                readOnly
                value={context.getEncodedText(editorId)}
                className="min-h-[100px] font-mono"
            />
            <div className="space-y-1">
                <div className="text-sm font-medium">Raw State</div>
                <pre className="bg-muted/40 rounded-md p-3 text-xs font-mono whitespace-pre-wrap">
                    {JSON.stringify(state, null, 2)}
                </pre>
            </div>
        </div>
    );
};

export default EditorContent;