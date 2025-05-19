"use client";
import React, { useState } from 'react';
import { SettingsIcon } from 'lucide-react';
import { IconButton } from "@/components/official/TextIconButton";
import UnifiedBookmarkManager from './UnifiedBookmarkManager';

interface BookmarkManagerActionsProps {
  jsonStr: string;
  configKey?: string;
}

const BookmarkManagerActions: React.FC<BookmarkManagerActionsProps> = ({ jsonStr, configKey }) => {
  const [isManagerOpen, setIsManagerOpen] = useState(false);

  return (
    <div className="flex">
      <IconButton
        size="sm"
        variant="ghost"
        onClick={() => setIsManagerOpen(true)}
        tooltip="Manage Bookmarks"
        icon={<SettingsIcon className="w-4 h-4" />}
        className="h-8 w-8"
      />
      <UnifiedBookmarkManager 
        open={isManagerOpen} 
        onOpenChange={setIsManagerOpen}
        isDialog={true}
        currentConfigKey={configKey}
      />
    </div>
  );
};

export default BookmarkManagerActions;