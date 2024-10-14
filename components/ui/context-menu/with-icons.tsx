import {
    ContextMenu,
    ContextMenuContent,
    ContextMenuItem,
    ContextMenuSeparator,
    ContextMenuTrigger,
} from "@/components/ui/context-menu/context-menu";
// Install MynaUI Icons from mynaui.com/icons
import {
    Copy,
    Envelope,
    Lightning,
    Share,
    SlashCircle,
} from "@mynaui/icons-react";

export default function WithIcons() {
    return (
        <ContextMenu>
            <ContextMenuTrigger className="grid h-[150px] w-[300px] place-items-center rounded border-2 border-dashed p-4 text-center text-sm">
                Right click here to manage folder sharing
            </ContextMenuTrigger>
            <ContextMenuContent className="w-64">
                <ContextMenuItem>
                    <Share className="mr-2 size-4" stroke={2} />
                    Share folder with others
                </ContextMenuItem>
                <ContextMenuItem>
                    <SlashCircle className="mr-2 size-4" stroke={2} />
                    Unshare folder
                </ContextMenuItem>
                <ContextMenuItem>
                    <Lightning className="mr-2 size-4" stroke={2} />
                    Change sharing permissions
                </ContextMenuItem>
                <ContextMenuSeparator />
                <ContextMenuItem>
                    <Copy className="mr-2 size-4" stroke={2} />
                    Copy share link
                </ContextMenuItem>
                <ContextMenuItem>
                    <Envelope className="mr-2 size-4" stroke={2} />
                    Email share link
                </ContextMenuItem>
            </ContextMenuContent>
        </ContextMenu>
    );
}
