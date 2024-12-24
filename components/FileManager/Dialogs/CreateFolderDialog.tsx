import React from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {ValidatedEnterInput} from "@/components/ui/matrx/input-intel";

interface CreateFolderDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (folderName: string) => Promise<void>;
}

export const CreateFolderDialog: React.FC<CreateFolderDialogProps> = ({
    isOpen,
    onClose,
    onSubmit
}) => {
    const [folderName, setFolderName] = React.useState('');

    const handleSubmit = async (value?: string) => {
        if (value) {
            await onSubmit(value);
            setFolderName('');
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Create new folder</DialogTitle>
                </DialogHeader>
                <div className="py-4">
                    <ValidatedEnterInput
                        value={folderName}
                        onChange={(e) => setFolderName(e.target.value)}
                        onEnter={handleSubmit}
                        validations={[
                            'notBlank',
                            { type: 'maxLength', params: 255 },
                            {
                                type: 'regex',
                                params: /^[^<>:"/\\|?*]+$/,
                                errorMessage: 'Folder name contains invalid characters'
                            }
                        ]}
                        placeholder="Enter folder name"
                        autoFocus
                    />
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button onClick={() => handleSubmit(folderName)}>
                        Create
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
