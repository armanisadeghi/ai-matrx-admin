import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
    ContextMenu,
    ContextMenuContent,
    ContextMenuItem,
    ContextMenuSeparator,
    ContextMenuTrigger,
} from "@/components/ui/context-menu";

import {
    Bell,
    Bookmark,
    Cog,
    Edit,
    Image,
    Lock,
    Logout,
    Pencil,
    Share,
    User,
    UserPlus,
    Users,
} from "@mynaui/icons-react";

export default function WithAvatar() {
    return (
        <ContextMenu>
            <ContextMenuTrigger className="flex cursor-pointer items-center gap-2 p-4 text-xs">
                <Avatar className="size-8">
                    <AvatarFallback>PJ</AvatarFallback>
                </Avatar>
                <span className="font-medium">Right Click Here</span>
            </ContextMenuTrigger>
            <ContextMenuContent className="w-64">
                <ContextMenuItem>
                    <User className="mr-2 size-4" stroke={2} />
                    View Profile
                </ContextMenuItem>
                <ContextMenuItem>
                    <Edit className="mr-2 size-4" stroke={2} />
                    Edit Profile
                </ContextMenuItem>
                <ContextMenuItem>
                    <Image className="mr-2 size-4" stroke={2} />
                    Change Avatar
                </ContextMenuItem>
                <ContextMenuItem>
                    <Pencil className="mr-2 size-4" stroke={2} />
                    Update Bio
                </ContextMenuItem>
                <ContextMenuSeparator />
                <ContextMenuItem>
                    <Bookmark className="mr-2 size-4" stroke={2} />
                    View Bookmarks
                </ContextMenuItem>
                <ContextMenuItem>
                    <Share className="mr-2 size-4" stroke={2} />
                    View Shared Bookmarks
                </ContextMenuItem>
                <ContextMenuSeparator />
                <ContextMenuItem>
                    <UserPlus className="mr-2 size-4" stroke={2} />
                    Manage Followers
                </ContextMenuItem>
                <ContextMenuItem>
                    <Users className="mr-2 size-4" stroke={2} />
                    Manage Following
                </ContextMenuItem>
                <ContextMenuSeparator />
                <ContextMenuItem>
                    <Cog className="mr-2 size-4" stroke={2} />
                    Account Settings
                </ContextMenuItem>
                <ContextMenuItem>
                    <Lock className="mr-2 size-4" stroke={2} />
                    Privacy Settings
                </ContextMenuItem>
                <ContextMenuItem>
                    <Bell className="mr-2 size-4" stroke={2} />
                    Notification Settings
                </ContextMenuItem>
                <ContextMenuSeparator />
                <ContextMenuItem>
                    <Logout className="mr-2 size-4" stroke={2} />
                    Logout
                </ContextMenuItem>
            </ContextMenuContent>
        </ContextMenu>
    );
}
