'use client';

import React, { useRef, useState } from 'react';
import { Upload, X, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { useAppDispatch } from '@/lib/redux/hooks';
import { createFileSystemSlice } from '@/lib/redux/fileSystem/slice';
import { AvailableBuckets } from '@/lib/redux/fileSystem/types';
import { useToastManager } from '@/hooks/useToastManager';
import { formatBytes } from '@/components/ui/file-preview/utils/formatting';

interface MobileFileUploadProps {
  bucket: AvailableBuckets;
  onUploadComplete?: () => void;
}

interface UploadingFile {
  file: File;
  status: 'pending' | 'uploading' | 'success' | 'error';
  error?: string;
}

export default function MobileFileUpload({ bucket, onUploadComplete }: MobileFileUploadProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dispatch = useAppDispatch();
  const toast = useToastManager('files');
  const slice = createFileSystemSlice(bucket);
  const { actions } = slice;

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setUploadingFiles(files.map(file => ({ file, status: 'pending' })));
    setIsOpen(true);
  };

  const handleUpload = async () => {
    if (uploadingFiles.length === 0) return;

    setIsUploading(true);
    const updatedFiles: UploadingFile[] = [...uploadingFiles];

    for (let i = 0; i < updatedFiles.length; i++) {
      updatedFiles[i] = { ...updatedFiles[i], status: 'uploading' };
      setUploadingFiles([...updatedFiles]);

      try {
        await dispatch(actions.uploadFile({ file: updatedFiles[i].file })).unwrap();
        updatedFiles[i] = { ...updatedFiles[i], status: 'success' };
      } catch (error) {
        console.error('Upload error:', error);
        updatedFiles[i] = {
          ...updatedFiles[i],
          status: 'error',
          error: error instanceof Error ? error.message : 'Upload failed',
        };
      }
      setUploadingFiles([...updatedFiles]);
    }

    setIsUploading(false);

    // Refresh the file list
    await dispatch(actions.listContents({ forceFetch: true }));

    const successCount = updatedFiles.filter(f => f.status === 'success').length;
    const errorCount = updatedFiles.filter(f => f.status === 'error').length;

    if (successCount > 0) {
      toast.success(`Successfully uploaded ${successCount} file${successCount > 1 ? 's' : ''}`);
      onUploadComplete?.();
    }

    if (errorCount > 0) {
      toast.error(`Failed to upload ${errorCount} file${errorCount > 1 ? 's' : ''}`);
    }

    // Close after a delay if all succeeded
    if (errorCount === 0) {
      setTimeout(() => {
        handleClose();
      }, 1500);
    }
  };

  const handleClose = () => {
    setIsOpen(false);
    setUploadingFiles([]);
    setIsUploading(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemoveFile = (index: number) => {
    setUploadingFiles(files => files.filter((_, i) => i !== index));
  };

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  const allComplete = uploadingFiles.every(f => f.status === 'success' || f.status === 'error');

  return (
    <>
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="*/*"
        className="hidden"
        onChange={handleFileSelect}
      />

      {/* Upload Button */}
      <Button
        variant="default"
        size="icon"
        onClick={handleButtonClick}
        className="h-9 w-9"
      >
        <Upload size={20} />
      </Button>

      {/* Upload Sheet */}
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetContent side="bottom" className="h-[80vh] flex flex-col">
          <SheetHeader>
            <SheetTitle>Upload Files</SheetTitle>
            <SheetDescription>
              {uploadingFiles.length} file{uploadingFiles.length !== 1 ? 's' : ''} selected for {bucket}
            </SheetDescription>
          </SheetHeader>

          {/* Files List */}
          <div className="flex-1 overflow-y-auto mt-4 space-y-2">
            {uploadingFiles.map((item, index) => (
              <div
                key={index}
                className="flex items-start gap-3 p-3 rounded-lg border bg-card"
              >
                {/* Status Icon */}
                <div className="flex-shrink-0 mt-0.5">
                  {item.status === 'pending' && (
                    <div className="h-5 w-5 rounded-full border-2 border-muted-foreground" />
                  )}
                  {item.status === 'uploading' && (
                    <Loader2 size={20} className="animate-spin text-primary" />
                  )}
                  {item.status === 'success' && (
                    <CheckCircle2 size={20} className="text-green-500" />
                  )}
                  {item.status === 'error' && (
                    <AlertCircle size={20} className="text-destructive" />
                  )}
                </div>

                {/* File Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {item.file.name}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {formatBytes(item.file.size)}
                  </p>
                  {item.error && (
                    <p className="text-xs text-destructive mt-1">{item.error}</p>
                  )}
                </div>

                {/* Remove Button */}
                {item.status === 'pending' && !isUploading && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemoveFile(index)}
                    className="flex-shrink-0 h-8 w-8"
                  >
                    <X size={16} />
                  </Button>
                )}
              </div>
            ))}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 mt-4 pb-safe">
            {!allComplete ? (
              <>
                <Button
                  variant="outline"
                  onClick={handleClose}
                  disabled={isUploading}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleUpload}
                  disabled={isUploading || uploadingFiles.length === 0}
                  className="flex-1"
                >
                  {isUploading ? (
                    <>
                      <Loader2 size={16} className="mr-2 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload size={16} className="mr-2" />
                      Upload {uploadingFiles.length} File{uploadingFiles.length !== 1 ? 's' : ''}
                    </>
                  )}
                </Button>
              </>
            ) : (
              <Button onClick={handleClose} className="w-full">
                Done
              </Button>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}

