"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Upload } from 'lucide-react';
import { PromptImporter } from '@/features/prompts';
import { useRouter } from 'next/navigation';

export function ImportPromptButton() {
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();

  return (
    <>
      <Button
        onClick={() => setIsOpen(true)}
        variant="outline"
        className="border-blue-300 text-blue-600 hover:bg-blue-50 dark:border-blue-700 dark:text-blue-400 dark:hover:bg-blue-950/30"
      >
        <Upload className="h-4 w-4 mr-2" />
        Import
      </Button>

      <PromptImporter
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        onImportSuccess={(promptId) => {
          setIsOpen(false);
          // Refresh the page to show the new prompt
          router.refresh();
        }}
      />
    </>
  );
}

