"use client";
import React, { useState } from 'react';
import { SettingsIcon } from 'lucide-react';
import { IconButton } from "@ai-matrx/design-system";
import UnifiedBookmarkManager from './UnifiedBookmarkManager';

interface BookmarkManagerActionsProps {
  jsonStr: string;
  configKey?: string;
}

const BookmarkManagerActions: React.FC<BookmarkManagerActionsProps> = ({ jsonStr, configKey }) => {
  const [isManagerOpen, setIsManagerOpen] = useState(false);

  return (
    <div className="flex">
      <IconButton variant="ghost" onClick={() => setIsManagerOpen(true)} tooltip="Manage Bookmarks" icon={SettingsIcon} />
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