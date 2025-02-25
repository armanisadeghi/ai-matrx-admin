// BookmarkManagerActions.jsx
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { SettingsIcon } from 'lucide-react';
import BookmarkManager from './BookmarkManager';

const BookmarkManagerActions = ({ jsonStr }) => {
  const [isManagerOpen, setIsManagerOpen] = useState(false);

  return (
    <div className="flex space-x-2">
      <Button
        size="sm"
        variant="ghost"
        onClick={() => setIsManagerOpen(true)}
        title="Manage Bookmarks"
      >
        <SettingsIcon className="w-4 h-4" />
      </Button>
      <BookmarkManager open={isManagerOpen} onOpenChange={setIsManagerOpen} />
    </div>
  );
};

export default BookmarkManagerActions;