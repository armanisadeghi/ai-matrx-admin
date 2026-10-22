"use client";
import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { BookmarksDialogProps } from "./types";

const BookmarksDialog: React.FC<BookmarksDialogProps> = ({
  open,
  onOpenChange,
  bookmarks,
  onJumpToBookmark,
  onDeleteBookmark,
}) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Saved Paths</DialogTitle>
        </DialogHeader>
        <div className="max-h-96 overflow-y-auto">
          {bookmarks.length === 0 ? (
            <div className="text-center py-4 text-muted-foreground">
              No saved paths yet. Navigate to a location and save it!
            </div>
          ) : (
            <div className="space-y-3">
              {bookmarks.map((bookmark, index) => (
                <div key={index} className="border-border rounded p-3">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-medium">{bookmark.name}</h3>
                    <div className="flex gap-2">
                      <Button 
                        variant="quiet" 
                        onClick={() => onJumpToBookmark(bookmark)}
                      >
                        Go
                      </Button>
                      <Button
                        variant="quiet"
                        onClick={() => onDeleteBookmark(index)}
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                  {bookmark.description && (
                    <p className="type-body text-muted-foreground mb-2">{bookmark.description}</p>
                  )}
                  <code className="type-secondary block bg-gray-100 dark:bg-gray-800 p-2 rounded">{bookmark.path}</code>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BookmarksDialog; 