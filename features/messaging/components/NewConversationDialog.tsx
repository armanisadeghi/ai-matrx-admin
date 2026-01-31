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
  const currentUserId = user?.activeUser?.matrix_id || user?.activeUser?.matrixId;

  const { createConversation } = useConversations(currentUserId || null);
  const supabase = createClient();

  // Search for users by email or name
  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim() || searchQuery.length < 2) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    setError(null);

    try {
      const query = searchQuery.toLowerCase().trim();

      // Search by email or name
      const { data, error: searchError } = await supabase
        .from("users")
        .select("matrix_id, first_name, last_name, full_name, email, picture, preferred_picture")
        .or(`email.ilike.%${query}%,full_name.ilike.%${query}%,first_name.ilike.%${query}%`)
        .neq("matrix_id", currentUserId) // Exclude current user
        .limit(10);

      if (searchError) {
        setError(searchError.message);
        return;
      }

      setSearchResults(data || []);
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
        const conversationId = await createConversation(selectedUser.matrix_id);
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
    const name = user.full_name || user.first_name || user.email;
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
            Search for a user by email or name to start a conversation.
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
                  placeholder="Enter email or name..."
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
                  key={result.matrix_id}
                  onClick={() => handleSelectUser(result)}
                  disabled={isCreating}
                  className={cn(
                    "w-full flex items-center gap-3 p-3 text-left transition-colors",
                    "hover:bg-zinc-50 dark:hover:bg-zinc-800",
                    isCreating && "opacity-50 cursor-not-allowed"
                  )}
                >
                  <Avatar className="h-10 w-10">
                    <AvatarImage
                      src={result.preferred_picture || result.picture || undefined}
                      alt={result.full_name || result.email || ""}
                    />
                    <AvatarFallback className="bg-primary/10 text-primary">
                      {getInitials(result)}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">
                      {result.full_name || result.first_name || "Unknown User"}
                    </p>
                    <div className="flex items-center gap-1 text-xs text-zinc-500 dark:text-zinc-400">
                      <Mail className="h-3 w-3" />
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
