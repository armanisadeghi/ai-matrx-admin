'use client';
import React, { useState } from 'react';
import { SheetPresentation } from '@/components/matrx/ArmaniForm/action-system/presentation/SheetPresentation';
import { Button } from '@/components/ui/Button';

const Page: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false);

    console.log("Page State - isOpen:", isOpen);

    return (
        <main className="min-h-screen flex items-center justify-center bg-background">
            {/* Trigger Button */}
            <SheetPresentation
                trigger={
                    <Button
                        onClick={() => {
                            console.log("Trigger Button Clicked");
                            setIsOpen(true);
                        }}
                        className="bg-primary text-primary-foreground px-4 py-2 rounded"
                    >
                        Open Sheet
                    </Button>
                }
                title="Example Sheet"
                description="This is an example description for the sheet."
                content={
                    <div className="p-4">
                        <p>Rendered inside the sheet.</p>
                    </div>
                }
                variant="default"
                onOpenChange={(open) => {
                    console.log("SheetPresentation onOpenChange triggered:", open);
                    setIsOpen(open);
                }}
                config={{
                    position: 'right',
                    size: 'lg',
                    density: 'compact',
                    closeOnOutsideClick: true,
                    closeOnEscape: true,
                }}
                className="custom-sheet-class"
                controls={{
                    showClose: true,
                    showCancel: true,
                    showSave: true,
                    showConfirm: true,
                    onSave: () => {
                        console.log("Save Button Clicked");
                        alert("Saved!");
                    },
                    onCancel: () => {
                        console.log("Cancel Button Clicked");
                        setIsOpen(false);
                    },
                    onConfirm: () => {
                        console.log("Confirm Button Clicked");
                        alert("Confirmed!");
                    },
                }}
            />
        </main>
    );
};

export default Page;
