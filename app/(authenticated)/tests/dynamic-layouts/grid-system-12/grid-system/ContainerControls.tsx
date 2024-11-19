import {Button} from "@/components/ui/button"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import {Input} from "@/components/ui/input"
import { Container } from "./gridTypes";
import {useState} from "react";
import { MoreVertical } from "lucide-react";

interface ContainerControlsProps {
    container: Container;
    isActive: boolean;
    onActivate: () => void;
    onRename: (newName: string) => void;
    onReset: () => void;
    onDelete: () => void;
    validationStatus: boolean;
    colorInfo: { bg: string; text: string };
}

export const ContainerControls: React.FC<ContainerControlsProps> = (
    {
        container,
        isActive,
        onActivate,
        onRename,
        onReset,
        onDelete,
        validationStatus,
        colorInfo,
    }) => {
    const [isRenaming, setIsRenaming] = useState(false);
    const [newName, setNewName] = useState(container.name);

    return (
        <div className="relative flex items-center gap-1">
            <Button
                size="sm"
                variant={isActive ? "default" : "outline"}
                className={`
                    ${colorInfo.bg} 
                    ${colorInfo.text} 
                    text-xs
                    ${!validationStatus && container.boxes.length > 0 ? 'border-2 border-yellow-500' : ''}
                `}
                onClick={onActivate}
            >
                {container.name} ({container.boxes.length})
                {!validationStatus && container.boxes.length > 0 && (
                    <span className="absolute -top-1 -right-1 w-2 h-2 bg-yellow-500 rounded-full"/>
                )}
            </Button>

            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <span className="sr-only">Open menu</span>
                        <MoreVertical className="h-4 w-4"/>
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setIsRenaming(true)}>
                        Rename
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={onReset}>
                        Reset
                    </DropdownMenuItem>
                    <DropdownMenuItem className="text-red-600" onClick={onDelete}>
                        Delete
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>

            <Dialog open={isRenaming} onOpenChange={setIsRenaming}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>Rename Container</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <Input
                            value={newName}
                            onChange={(e) => setNewName(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && newName.trim()) {
                                    onRename(newName);
                                    setIsRenaming(false);
                                }
                            }}
                        />
                        <Button
                            onClick={() => {
                                if (newName.trim()) {
                                    onRename(newName);
                                    setIsRenaming(false);
                                }
                            }}
                        >
                            Save
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
};

