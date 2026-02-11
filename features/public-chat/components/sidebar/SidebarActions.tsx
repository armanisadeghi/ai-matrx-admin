'use client';

import { useState } from 'react';
import {
    Plus, Sparkles, Search, Building2, FolderKanban,
    CheckSquare, X, Image, Video, AudioLines, ChevronRight,
} from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

// ============================================================================
// TYPES
// ============================================================================

interface SidebarActionsProps {
    onNewChat: () => void;
    searchQuery: string;
    onSearchChange: (query: string) => void;
}

// ============================================================================
// ACTION ROW
// ============================================================================

function ActionRow({
    icon: Icon,
    label,
    onClick,
    children,
}: {
    icon: React.ComponentType<{ className?: string }>;
    label: string;
    onClick?: () => void;
    children?: React.ReactNode;
}) {
    if (children) {
        return children;
    }

    return (
        <button
            onClick={onClick}
            className="flex items-center gap-2.5 w-full px-2.5 py-1.5 rounded-md text-foreground/80 hover:bg-accent/50 hover:text-foreground transition-colors text-left group"
        >
            <Icon className="h-3.5 w-3.5 text-muted-foreground group-hover:text-foreground transition-colors flex-shrink-0" />
            <span className="text-xs">{label}</span>
        </button>
    );
}

// ============================================================================
// PLACEHOLDER DROPDOWN ROW
// ============================================================================

function PlaceholderDropdownRow({
    icon: Icon,
    label,
}: {
    icon: React.ComponentType<{ className?: string }>;
    label: string;
}) {
    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2.5 w-full px-2.5 py-1.5 rounded-md text-foreground/80 hover:bg-accent/50 hover:text-foreground transition-colors text-left group">
                    <Icon className="h-3.5 w-3.5 text-muted-foreground group-hover:text-foreground transition-colors flex-shrink-0" />
                    <span className="text-xs flex-1">{label}</span>
                    <ChevronRight className="h-3 w-3 text-muted-foreground/50 flex-shrink-0" />
                </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" side="right" sideOffset={8} className="w-44">
                <DropdownMenuItem disabled className="text-[11px] text-muted-foreground">
                    Coming soon
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

// ============================================================================
// SIDEBAR ACTIONS
// ============================================================================

export function SidebarActions({ onNewChat, searchQuery, onSearchChange }: SidebarActionsProps) {
    const [showSearch, setShowSearch] = useState(false);

    const handleSearchToggle = () => {
        if (showSearch) {
            onSearchChange('');
            setShowSearch(false);
        } else {
            setShowSearch(true);
        }
    };

    return (
        <div className="px-1.5 py-1.5 border-b border-border">
            {/* New Chat */}
            <ActionRow icon={Plus} label="New Chat" onClick={onNewChat} />

            {/* Generate — dropdown with sub-options */}
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <button className="flex items-center gap-2.5 w-full px-2.5 py-1.5 rounded-md text-foreground/80 hover:bg-accent/50 hover:text-foreground transition-colors text-left group">
                        <Sparkles className="h-3.5 w-3.5 text-muted-foreground group-hover:text-foreground transition-colors flex-shrink-0" />
                        <span className="text-xs flex-1">Generate</span>
                        <ChevronRight className="h-3 w-3 text-muted-foreground/50 flex-shrink-0" />
                    </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" side="right" sideOffset={8} className="w-40">
                    <DropdownMenuItem className="text-xs gap-2">
                        <Image className="h-3.5 w-3.5" /> Image
                    </DropdownMenuItem>
                    <DropdownMenuItem className="text-xs gap-2">
                        <Video className="h-3.5 w-3.5" /> Video
                    </DropdownMenuItem>
                    <DropdownMenuItem className="text-xs gap-2">
                        <AudioLines className="h-3.5 w-3.5" /> Audio
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>

            {/* Search — toggles inline search */}
            <ActionRow icon={Search} label="Search" onClick={handleSearchToggle} />

            {/* Inline search input — slides in when active */}
            {showSearch && (
                <div className="px-2 pb-1 pt-0.5">
                    <div className="relative">
                        <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                        <input
                            type="text"
                            placeholder="Search..."
                            value={searchQuery}
                            onChange={(e) => onSearchChange(e.target.value)}
                            autoFocus
                            className="w-full pl-6.5 pr-6 py-1 text-xs rounded-md bg-muted/50 text-foreground placeholder:text-muted-foreground outline-none focus:bg-muted/80 transition-colors border-0"
                            style={{ fontSize: '16px', paddingLeft: '1.625rem' }}
                        />
                        {searchQuery && (
                            <button
                                onClick={() => onSearchChange('')}
                                className="absolute right-1.5 top-1/2 -translate-y-1/2 p-0.5 rounded text-muted-foreground hover:text-foreground"
                            >
                                <X className="h-3 w-3" />
                            </button>
                        )}
                    </div>
                </div>
            )}

            {/* Placeholder dropdowns */}
            <PlaceholderDropdownRow icon={Building2} label="Organization" />
            <PlaceholderDropdownRow icon={FolderKanban} label="Project" />
            <PlaceholderDropdownRow icon={CheckSquare} label="Tasks" />
        </div>
    );
}

export default SidebarActions;
