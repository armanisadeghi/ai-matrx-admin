import React from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useFileSystem } from '@/providers/FileSystemProvider';
import { ValidatedEnterInput } from '@/components/ui/matrx/input-intel';

interface RenameDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (value: string) => Promise<void>;
}

export const RenameDialog: React.FC<RenameDialogProps> = ({
    isOpen,
    onClose,
    onSubmit
}) => {
    const { currentPath, getCurrentItemType } = useFileSystem();
    const type = getCurrentItemType();
    const currentName = currentPath[currentPath.length - 1] || '';
    const [newName, setNewName] = React.useState(currentName);

    React.useEffect(() => {
        setNewName(currentName);
    }, [currentName]);

    const handleSubmit = async (value?: string) => {
        if (!value) return;
        await onSubmit(value);
        setNewName('');
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Rename {type}</DialogTitle>
                </DialogHeader>
                <div className="py-4">
                    <ValidatedEnterInput
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        onEnter={handleSubmit}
                        validations={[
                            'notBlank',
                            { type: 'maxLength', params: 255 },
                            {
                                type: 'regex',
                                params: /^[^<>:"/\\|?*]+$/,
                                errorMessage: `${type} name contains invalid characters`
                            }
                        ]}
                        placeholder={`Enter new ${type} name`}
                        autoFocus
                    />
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button onClick={() => handleSubmit(newName)}>
                        Rename
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};