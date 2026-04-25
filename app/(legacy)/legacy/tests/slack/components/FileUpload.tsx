import React, { useState, useRef } from 'react';
import { FileUploadOptions, SlackClient, SlackMessage } from '../slackClientUtils';

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
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [statusMessage, setStatusMessage] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [shouldNotify, setShouldNotify] = useState(true);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      setUploadStatus('idle');
      setStatusMessage('');
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
      setUploadStatus('uploading');
      setProgress(10); // Start progress
      setStatusMessage('Preparing upload...');

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
        // First attempt to join the channel to ensure we have access
        try {
          setStatusMessage('Joining channel...');
          await client.joinChannel(channelId);
        } catch (joinError) {
          console.log('Channel join attempt (may fail for private channels):', joinError);
          // Continue anyway - might be a private channel where we're already a member
        }

        setStatusMessage('Uploading file...');

        const options: FileUploadOptions = {
          channel: channelId,
          file,
          filename: file.name,
          title: file.name,
          initialComment: initialComment || undefined
        };

        const result = await client.uploadFile(options);

        // Check if we need to manually send a notification
        if (shouldNotify && result.files && result.files.length > 0 && !result.notification_sent) {
          try {
            setStatusMessage('Sending notification...');
            // This method is now handled in the SlackClient
          } catch (notifyError) {
            console.warn('Error sending notification:', notifyError);
            // Non-fatal error, continue
          }
        }

        clearInterval(progressInterval);
        setProgress(100);
        setUploadStatus('success');
        setStatusMessage('File uploaded successfully!');
        resetForm();

        if (onSuccess) {
          onSuccess(result);
        }
      } catch (error: any) {
        clearInterval(progressInterval);
        setProgress(0);
        setUploadStatus('error');
        setStatusMessage(`Error: ${error.message || 'Unknown error'}`);

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

  const formatFileSize = (bytes: number): string => {
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
                <span>({formatFileSize(file.size)})</span>
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

          <div className="mb-4">
            <label className="flex items-center text-sm">
              <input
                  type="checkbox"
                  checked={shouldNotify}
                  onChange={(e) => setShouldNotify(e.target.checked)}
                  className="mr-2"
              />
              Send notification message when file is uploaded
            </label>
          </div>

          {progress > 0 && (
              <div className="w-full bg-gray-200 rounded-full h-2.5 mb-4 dark:bg-gray-700">
                <div
                    className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
                    style={{ width: `${progress}%` }}
                ></div>
                <p className="text-xs mt-1 text-gray-500">{statusMessage || `Uploading... ${Math.round(progress)}%`}</p>
              </div>
          )}

          {uploadStatus === 'error' && statusMessage && (
              <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded dark:bg-red-900 dark:border-red-800 dark:text-red-300">
                {statusMessage}
              </div>
          )}

          {uploadStatus === 'success' && statusMessage && (
              <div className="mb-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded dark:bg-green-900 dark:border-green-800 dark:text-green-300">
                {statusMessage}
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