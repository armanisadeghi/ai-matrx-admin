'use client';
import React, { useState } from 'react';
import { SheetPresentation } from '@/components/matrx/ArmaniForm/action-system/presentation/SheetPresentation';
import { Button } from '@/components/ui/Button';
import { EntitySheet } from '@/components/matrx/ArmaniForm/field-components/EntitySheet';

const Page: React.FC = () => {
    const [open, setOpen] = useState(false);

    return (
        <main className="min-h-screen flex items-center justify-center bg-background">
            {/* EntitySheet Component */}
            <EntitySheet
                trigger={
                    <button
                        className="bg-primary text-primary-foreground px-4 py-2 rounded"
                        onClick={() => setOpen(true)}
                    >
                        Open Sheet
                    </button>
                }
                position="right"
                size="lg"
                showClose={true}
                title="Test Sheet"
                description="This is a test description for the EntitySheet."
                footer={
                    <div className="flex justify-end space-x-2">
                        <button
                            className="bg-secondary text-secondary-foreground px-4 py-2 rounded"
                            onClick={() => setOpen(false)}
                        >
                            Cancel
                        </button>
                        <button
                            className="bg-accent text-accent-foreground px-4 py-2 rounded"
                            onClick={() => alert('Action confirmed')}
                        >
                            Confirm
                        </button>
                    </div>
                }
                className="custom-class-for-testing"
                open={open}
                onOpenChange={setOpen}
            >
                <div className="p-4">
                    <p>This is the content inside the EntitySheet.</p>
                    <p>You can add any custom content or components here.</p>
                </div>
            </EntitySheet>
        </main>
    );
};

// const Page: React.FC = () => {
//     const [isOpen, setIsOpen] = useState(false);
//
//     return (
//         <main className="min-h-screen flex items-center justify-center bg-gray-50">
//             {/* Trigger Button */}
//             <SheetPresentation
//                 trigger={
//                     <Button
//                         onClick={() => setIsOpen(true)}
//                         className="px-4 py-2 bg-blue-500 text-white rounded"
//                     >
//                         Open Sheet
//                     </Button>
//                 }
//                 title="Example Sheet"
//                 description="This is an example description for the sheet."
//                 content={
//                     <div className="p-4">
//                         <p>
//                             This is some example content rendered inside the sheet.
//                         </p>
//                     </div>
//                 }
//                 variant="default"
//                 onOpenChange={(open) => setIsOpen(open)}
//                 config={{
//                     position: 'right',
//                     size: 'lg',
//                     density: 'compact',
//                 }}
//                 className="custom-sheet-class"
//                 controls={[
//                     {
//                         label: 'Close',
//                         action: () => setIsOpen(false),
//                         variant: 'secondary',
//                     },
//                 ]}
//             />
//         </main>
//     );
// };

export default Page;
