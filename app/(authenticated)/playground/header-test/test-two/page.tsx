'use client';

import { getSimplifiedLayoutProps } from '@/app/entities/layout/configs';
import EntityCreateRecordSheet from '@/app/entities/layout/EntityCreateRecordSheet';
import { UnifiedLayoutProps } from '@/components/matrx/Entity';
import AddTemplateMessages from '@/components/playground/messages/AddTemplateMessages';
import { Button } from '@/components/ui/button';
import { useState } from 'react';

const getLayoutOptions = (): UnifiedLayoutProps => {
    const layoutProps = getSimplifiedLayoutProps({
        entityKey: 'recipe',
        formComponent: 'MINIMAL',
        quickReferenceType: 'LIST',
        isExpanded: true,
        handlers: {},
        excludeFields: ['id'],
        defaultShownFields: ['name', 'description', 'tags', 'status','version','isPublic'],
        density: 'compact',
        size: 'sm',
    });
    return layoutProps;
};

export default function page() {
    const [open, setOpen] = useState(false);

    const handleClose = () => {
        setOpen(false);
    };

    return (
        <div>
            <Button onClick={() => setOpen(true)}>Create Recipe</Button>
            <EntityCreateRecordSheet
                selectedEntity='recipe'
                unifiedLayoutProps={getLayoutOptions()}
                title='Create A New Recipe'
                open={open}
                onOpenChange={setOpen}
                postCreationOptions={true}
            >
                <AddTemplateMessages 
                    onClose={handleClose}
                    onError={(error) => {
                        console.error('Error adding messages:', error);
                        // You might want to show an error toast here
                    }}
                />
            </EntityCreateRecordSheet>
        </div>
    );
}