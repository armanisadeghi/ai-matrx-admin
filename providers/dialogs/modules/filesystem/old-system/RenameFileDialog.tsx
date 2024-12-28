
import { useFileSystem } from "@/providers/FileSystemProvider";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { createStandardDialog } from "../../../factory/usCreateDialog";

export const RenameFileDialog = () => {
    const { currentPath, renameCurrentItem } = useFileSystem();
    const fileName = currentPath[currentPath.length - 1] || '';
    const [newName, setNewName] = useState(fileName);

    const dialogConfig = createStandardDialog({
        id: 'filesystem.rename',
        title: 'Rename File',
        description: 'Enter a new name for the file',
        content: (close) => (
            <div className="space-y-4">
                <Input
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="New file name"
                />
                <div className="flex justify-end space-x-2">
                    <Button variant="outline" onClick={close}>
                        Cancel
                    </Button>
                    <Button 
                        onClick={async () => {
                            await renameCurrentItem(newName);
                            close();
                        }}
                    >
                        Rename
                    </Button>
                </div>
            </div>
        ),
    });

    return dialogConfig;
};
