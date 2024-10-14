import {
    ContextMenu,
    ContextMenuContent,
    ContextMenuItem,
    ContextMenuShortcut,
    ContextMenuSub,
    ContextMenuSubContent,
    ContextMenuSubTrigger,
    ContextMenuTrigger,
} from "@/components/ui/context-menu";

export default function Basic() {
    return (
        <ContextMenu>
            <ContextMenuTrigger className="grid h-[150px] w-[300px] place-items-center rounded border-2 border-dashed p-4 text-center text-sm">
                Right click here to open the bookmark context menu
            </ContextMenuTrigger>
            <ContextMenuContent className="w-64">
                <ContextMenuItem>
                    Edit bookmark
                    <ContextMenuShortcut>⌘E</ContextMenuShortcut>
                </ContextMenuItem>
                <ContextMenuItem>
                    Delete bookmark
                    <ContextMenuShortcut>⌘D</ContextMenuShortcut>
                </ContextMenuItem>
                <ContextMenuItem>
                    Copy link
                    <ContextMenuShortcut>⌘C</ContextMenuShortcut>
                </ContextMenuItem>
                <ContextMenuItem>
                    Open in new tab
                    <ContextMenuShortcut>⌘T</ContextMenuShortcut>
                </ContextMenuItem>
                <ContextMenuSub>
                    <ContextMenuSubTrigger>Add to folder</ContextMenuSubTrigger>
                    <ContextMenuSubContent className="w-48">
                        <ContextMenuItem>Work</ContextMenuItem>
                        <ContextMenuItem>Personal</ContextMenuItem>
                        <ContextMenuItem>Travel</ContextMenuItem>
                        <ContextMenuItem>Create new folder</ContextMenuItem>
                    </ContextMenuSubContent>
                </ContextMenuSub>
                <ContextMenuItem>
                    Share bookmark
                    <ContextMenuShortcut>⇧⌘S</ContextMenuShortcut>
                </ContextMenuItem>
            </ContextMenuContent>
        </ContextMenu>
    );
}
