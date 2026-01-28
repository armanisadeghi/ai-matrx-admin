import {
    ContextMenu,
    ContextMenuContent,
    ContextMenuItem,
    ContextMenuSeparator,
    ContextMenuTrigger,
} from "@/components/ui/context-menu/context-menu";
import {
    Copy,
    Mail,
    Zap,
    Share2,
    Ban,
} from "lucide-react";

export default function WithIcons() {
    return (
        <ContextMenu>
            <ContextMenuTrigger className="grid h-[150px] w-[300px] place-items-center rounded border-2 border-dashed p-4 text-center text-sm">
                Right click here to manage folder sharing
            </ContextMenuTrigger>
            <ContextMenuContent className="w-64">
                <ContextMenuItem>
                    <Share2 className="mr-2 size-4" />
                    Share folder with others
                </ContextMenuItem>
                <ContextMenuItem>
                    <Ban className="mr-2 size-4" />
                    Unshare folder
                </ContextMenuItem>
                <ContextMenuItem>
                    <Zap className="mr-2 size-4" />
                    Change sharing permissions
                </ContextMenuItem>
                <ContextMenuSeparator />
                <ContextMenuItem>
                    <Copy className="mr-2 size-4" />
                    Copy share link
                </ContextMenuItem>
                <ContextMenuItem>
                    <Mail className="mr-2 size-4" />
                    Email share link
                </ContextMenuItem>
            </ContextMenuContent>
        </ContextMenu>
    );
}
