"use client";

import React, { useState, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Search, Loader2, User, Mail } from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/utils/supabase/client";
import { useAppSelector } from "@/lib/redux";
import { useConversations } from "@/hooks/useSupabaseMessaging";
import type { UserBasicInfo } from "../types";

interface NewConversationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConversationCreated: (conversationId: string) => void;
}

export function NewConversationDialog({
  open,
  onOpenChange,
  onConversationCreated,
}: NewConversationDialogProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<UserBasicInfo[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const user = useAppSelector((state) => state.user);
  const currentUserId = user?.id;

  const { createConversation } = useConversations(currentUserId || null);
  const supabase = createClient();

  // Search for users by email using lookup_user_by_email function
  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim() || searchQuery.length < 2) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    setError(null);

    try {
      const query = searchQuery.toLowerCase().trim();

      // Use the existing lookup_user_by_email function
      const { data: lookupResult, error: lookupError } = await supabase
        .rpc('lookup_user_by_email', { lookup_email: query });

      if (lookupError) {
        console.error('Lookup error:', lookupError);
        // Fall back to direct search if RPC fails
      }

      // Convert lookup result to UserBasicInfo format
      const results: UserBasicInfo[] = [];

      if (lookupResult && lookupResult.length > 0) {
        for (const row of lookupResult) {
          if (row.user_id !== currentUserId) {
            // Get additional user info
            const { data: userInfo } = await supabase
              .rpc('get_dm_user_info', { p_user_id: row.user_id });
            
            if (userInfo && userInfo[0]) {
              results.push(userInfo[0]);
            } else {
              // Fallback with basic info
              results.push({
                user_id: row.user_id,
                email: row.user_email,
                display_name: row.user_email?.split('@')[0] || 'User',
                avatar_url: null,
              });
            }
          }
        }
      }

      setSearchResults(results);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Search failed");
    } finally {
      setIsSearching(false);
    }
  }, [searchQuery, currentUserId, supabase]);

  // Handle user selection
  const handleSelectUser = useCallback(
    async (selectedUser: UserBasicInfo) => {
      if (!currentUserId) return;

      setIsCreating(true);
      setError(null);

      try {
        const conversationId = await createConversation(selectedUser.user_id);
        onConversationCreated(conversationId);
        onOpenChange(false);
        
        // Reset state
        setSearchQuery("");
        setSearchResults([]);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to create conversation");
      } finally {
        setIsCreating(false);
      }
    },
    [currentUserId, createConversation, onConversationCreated, onOpenChange]
  );

  // Get initials from name
  const getInitials = (user: UserBasicInfo): string => {
    const name = user.display_name || user.email;
    if (!name) return "?";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New Conversation</DialogTitle>
          <DialogDescription>
            Search for a user by email to start a conversation.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Search Input */}
          <div className="space-y-2">
            <Label htmlFor="search">Find User</Label>
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                <Input
                  id="search"
                  placeholder="Enter email address..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  className="pl-9"
                />
              </div>
              <Button
                variant="secondary"
                onClick={handleSearch}
                disabled={isSearching || searchQuery.length < 2}
              >
                {isSearching ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Search"
                )}
              </Button>
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <div className="text-sm text-red-500 dark:text-red-400">{error}</div>
          )}

          {/* Search Results */}
          {searchResults.length > 0 && (
            <div className="border rounded-lg divide-y divide-zinc-200 dark:divide-zinc-800">
              {searchResults.map((result) => (
                <button
                  key={result.user_id}
                  onClick={() => handleSelectUser(result)}
                  disabled={isCreating}
                  className={cn(
                    "w-full flex items-start gap-3 p-3 text-left transition-colors",
                    "hover:bg-zinc-50 dark:hover:bg-zinc-800",
                    isCreating && "opacity-50 cursor-not-allowed"
                  )}
                >
                  <Avatar className="h-10 w-10 flex-shrink-0">
                    <AvatarImage
                      src={result.avatar_url || undefined}
                      alt={result.display_name || result.email || ""}
                    />
                    <AvatarFallback className="bg-primary/10 text-primary">
                      {getInitials(result)}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0 pt-0.5">
                    <p className="text-sm font-medium leading-tight text-zinc-900 dark:text-zinc-100 truncate">
                      {result.display_name || "Unknown User"}
                    </p>
                    <div className="flex items-center gap-1 text-xs leading-tight text-zinc-500 dark:text-zinc-400 mt-0.5">
                      <Mail className="h-3 w-3 flex-shrink-0" />
                      <span className="truncate">{result.email || "No email"}</span>
                    </div>
                  </div>

                  {isCreating && (
                    <Loader2 className="h-4 w-4 animate-spin text-zinc-400" />
                  )}
                </button>
              ))}
            </div>
          )}

          {/* No Results */}
          {searchQuery.length >= 2 && !isSearching && searchResults.length === 0 && (
            <div className="flex flex-col items-center py-8 text-center">
              <User className="h-12 w-12 text-zinc-300 dark:text-zinc-600 mb-2" />
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                No users found matching "{searchQuery}"
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default NewConversationDialog;
