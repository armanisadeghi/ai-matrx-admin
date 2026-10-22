// BookmarkManagerActions.jsx
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { SettingsIcon } from "lucide-react";
import BookmarkManager from "./BookmarkManager";

const BookmarkManagerActions = ({ jsonStr }: { jsonStr: string }) => {
  const [isManagerOpen, setIsManagerOpen] = useState(false);

  return (
    <div className="flex space-x-2">
      <Button
        icon={<SettingsIcon />} aria-label="Manage Bookmarks"
        variant="outline"
        onClick={() => setIsManagerOpen(true)}
        title="Manage Bookmarks"
      />
      <BookmarkManager open={isManagerOpen} onOpenChange={setIsManagerOpen} />
    </div>
  );
};

export default BookmarkManagerActions;
