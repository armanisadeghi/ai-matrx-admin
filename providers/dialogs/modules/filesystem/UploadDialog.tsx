// UploadDialog.tsx
import { useCallback, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useAppDispatch } from "@/lib/redux";
import { createFileSystemSlice } from "@/lib/redux/fileSystem/slice";
import { createStandardDialog } from "../../factory/CreateDialog";
import { useFileSystem } from '@/lib/redux/fileSystem/Provider';

export const UploadDialog = () => {
  const dispatch = useAppDispatch();
  const { activeBucket } = useFileSystem();
  const slice = createFileSystemSlice(activeBucket);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [overwrite, setOverwrite] = useState(false);

  const handleUpload = useCallback(
    async (file: File, close: () => void) => {
      try {
        await dispatch(
          slice.actions.uploadFile({
            file,
            options: {
              overwrite,
              contentType: file.type, // Let the file's native type be used
            }
          })
        ).unwrap();
        close();
      } catch (error) {
        console.error("Failed to upload:", error);
      }
    },
    [dispatch, slice.actions, overwrite]
  );

  return createStandardDialog({
    id: "filesystem.upload",
    title: "Upload File",
    description: "Select a file to upload",
    content: (close) => (
      <div className="space-y-4">
        <input
          type="file"
          ref={fileInputRef}
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleUpload(file, close);
          }}
        />
        <div className="flex items-center space-x-2">
          <Checkbox
            id="overwrite"
            checked={overwrite}
            onCheckedChange={(checked) => setOverwrite(checked as boolean)}
          />
          <label htmlFor="overwrite" className="text-sm">
            Overwrite if file exists
          </label>
        </div>
        <Button 
          onClick={() => fileInputRef.current?.click()}
          className="w-full"
        >
          Select File
        </Button>
      </div>
    ),
  });
};