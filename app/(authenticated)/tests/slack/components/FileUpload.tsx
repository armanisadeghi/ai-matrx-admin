import React, { useState, useRef } from 'react';
import { FileUploadOptions, SlackClient } from '../slackClientUtils';

interface FileUploadProps {
  token: string;
  channelId: string;
  onSuccess?: (result: any) => void;
  onError?: (error: Error) => void;
  disabled?: boolean;
}

const FileUpload: React.FC<FileUploadProps> = ({
                                                 token,
                                                 channelId,
                                                 onSuccess,
                                                 onError,
                                                 disabled = false
                                               }) => {
  const [file, setFile] = useState<File | null>(null);
  const [initialComment, setInitialComment] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
    }
  };

  const handleCommentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInitialComment(e.target.value);
  };

  const resetForm = () => {
    setFile(null);
    setInitialComment('');
    setProgress(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleUpload = async () => {
    if (!token || !channelId || !file) return;

    try {
      setIsUploading(true);
      setProgress(10); // Start progress

      const client = new SlackClient(token);

      // Simulate progress during upload
      const progressInterval = setInterval(() => {
        setProgress(prev => {
          const increment = Math.random() * 5 + 2; // Random increment between 2-7%
          const newValue = prev + increment;
          return newValue < 90 ? newValue : prev; // Cap at 90% until complete
        });
      }, 800);

      try {
        const options: FileUploadOptions = {
          channel: channelId,
          file,
          filename: file.name,
          title: file.name,
          initialComment: initialComment || undefined
        };

        const result = await client.uploadFile(options);

        clearInterval(progressInterval);
        setProgress(100);
        resetForm();

        if (onSuccess) {
          onSuccess(result);
        }
      } catch (error: any) {
        clearInterval(progressInterval);

        if (onError) {
          onError(error);
        }

        // Show complete error in console for debugging
        console.error('File upload error:', error);
      }
    } finally {
      setIsUploading(false);
    }
  };

  const getFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
      <div className="w-full space-y-4">
        <div className="border border-gray-300 rounded-md p-4">
          <div className="mb-4">
            <label className="block text-sm mb-1">File</label>
            <input
                ref={fileInputRef}
                type="file"
                onChange={handleFileChange}
                disabled={isUploading || disabled}
                className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {file && (
              <div className="flex items-center text-sm text-gray-400 mb-4">
                <span className="mr-2">{file.name}</span>
                <span>({getFileSize(file.size)})</span>
              </div>
          )}

          <div className="mb-4">
            <label className="block text-sm mb-1">Comment (optional)</label>
            <textarea
                value={initialComment}
                onChange={handleCommentChange}
                disabled={isUploading || disabled}
                placeholder="Add a comment with your file..."
                className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-transparent h-20"
            />
          </div>

          {progress > 0 && (
              <div className="w-full bg-gray-200 rounded-full h-2.5 mb-4 dark:bg-gray-700">
                <div
                    className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
                    style={{ width: `${progress}%` }}
                ></div>
                <p className="text-xs mt-1 text-gray-500">Uploading... {Math.round(progress)}%</p>
              </div>
          )}

          <button
              onClick={handleUpload}
              disabled={!file || isUploading || disabled}
              className="bg-blue-600 hover:bg-blue-700 text-white rounded-md px-4 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isUploading ? 'Uploading...' : 'Upload to Slack'}
          </button>
        </div>
      </div>
  );
};

export default FileUpload;