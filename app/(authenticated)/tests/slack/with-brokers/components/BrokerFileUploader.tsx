'use client';

import { useState, useRef, useCallback, useMemo } from 'react';
import { useAppDispatch, useAppSelector } from '@/lib/redux';
import { brokerConceptActions, brokerConceptSelectors } from '@/lib/redux/brokerSlice';
import { SLACK_BROKER_IDS } from './BrokerSlackClient';

export function BrokerFileUploader() {
  const dispatch = useAppDispatch();
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [statusMessage, setStatusMessage] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [shouldNotify, setShouldNotify] = useState(true);
  
  // Get values from brokers
  const token = useAppSelector(state => 
    brokerConceptSelectors.selectText(state, SLACK_BROKER_IDS.token)
  );
  const selectedChannel = useAppSelector(state => 
    brokerConceptSelectors.selectText(state, SLACK_BROKER_IDS.selectedChannel)
  );
  const filename = useAppSelector(state => 
    brokerConceptSelectors.selectText(state, SLACK_BROKER_IDS.filename)
  );
  const title = useAppSelector(state => 
    brokerConceptSelectors.selectText(state, SLACK_BROKER_IDS.title)
  );
  const initialComment = useAppSelector(state => 
    brokerConceptSelectors.selectText(state, SLACK_BROKER_IDS.initialComment) || ''
  );
  
  // Handle file selection - memoize callback
  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      
      // Set filename in broker
      dispatch(brokerConceptActions.setText({
        idArgs: SLACK_BROKER_IDS.filename,
        text: selectedFile.name
      }));
      
      // Set default title to match filename if not already set
      if (!title) {
        dispatch(brokerConceptActions.setText({
          idArgs: SLACK_BROKER_IDS.title,
          text: selectedFile.name
        }));
      }
      
      setUploadStatus('idle');
      setStatusMessage('');
    }
  }, [dispatch, title]);
  
  // Handle comment change - memoize callback
  const handleCommentChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    dispatch(brokerConceptActions.setText({
      idArgs: SLACK_BROKER_IDS.initialComment,
      text: e.target.value
    }));
  }, [dispatch]);
  
  // Handle title change - memoize callback
  const handleTitleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    dispatch(brokerConceptActions.setText({
      idArgs: SLACK_BROKER_IDS.title,
      text: e.target.value
    }));
  }, [dispatch]);
  
  // Reset form after upload - memoize callback
  const resetForm = useCallback(() => {
    setFile(null);
    setProgress(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    
    // Clear fields in broker
    dispatch(brokerConceptActions.setText({
      idArgs: SLACK_BROKER_IDS.filename,
      text: ''
    }));
    dispatch(brokerConceptActions.setText({
      idArgs: SLACK_BROKER_IDS.title,
      text: ''
    }));
    dispatch(brokerConceptActions.setText({
      idArgs: SLACK_BROKER_IDS.initialComment,
      text: ''
    }));
  }, [dispatch]);
  
  // Handle file upload - memoize callback
  const handleUpload = useCallback(async () => {
    if (!token || !selectedChannel || !file) {
      setUploadStatus('error');
      setStatusMessage('Token, channel, and file are required');
      return;
    }
    
    let progressInterval: NodeJS.Timeout | undefined;
    
    try {
      setIsUploading(true);
      setUploadStatus('uploading');
      setProgress(10);
      setStatusMessage('Preparing upload...');
      
      // Simulate progress during upload
      progressInterval = setInterval(() => {
        setProgress(prev => {
          const increment = Math.random() * 5 + 2; // Random increment between 2-7%
          const newValue = prev + increment;
          return newValue < 90 ? newValue : prev; // Cap at 90% until complete
        });
      }, 800);
      
      // Create FormData for upload
      const formData = new FormData();
      formData.append('file', file);
      formData.append('token', token);
      formData.append('channels', selectedChannel);
      
      // Add optional fields if available
      if (filename) {
        formData.append('filename', filename);
      }
      
      if (title) {
        formData.append('title', title);
      }
      
      if (initialComment) {
        formData.append('initial_comment', initialComment);
      }
      
      // Use shouldNotify flag
      formData.append('notify', shouldNotify ? 'true' : 'false');
      
      // Upload the file
      setStatusMessage('Uploading file...');
      const response = await fetch('/api/slack/upload-external', {
        method: 'POST',
        body: formData
      });
      
      clearInterval(progressInterval);
      
      if (!response.ok) {
        // Handle HTTP errors
        let errorMessage = `HTTP error! status: ${response.status}`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch (e) {
          // Unable to parse error response as JSON
        }
        throw new Error(errorMessage);
      }
      
      const result = await response.json();
      
      if (!result.ok) {
        throw new Error(`Error uploading file: ${result.error}`);
      }
      
      // Success
      setProgress(100);
      setUploadStatus('success');
      setStatusMessage('File uploaded successfully!');
      resetForm();
      
    } catch (error: any) {
      clearInterval(progressInterval);
      setProgress(0);
      setUploadStatus('error');
      setStatusMessage(`Error: ${error.message || 'Unknown error'}`);
      console.error('File upload error:', error);
    } finally {
      setIsUploading(false);
    }
  }, [token, selectedChannel, file, filename, title, initialComment, shouldNotify, resetForm]);
  
  // Format file size for display - memoize function
  const formatFileSize = useCallback((bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }, []);
  
  // Memoize file size display
  const fileSizeDisplay = useMemo(() => {
    if (!file) return null;
    return (
      <div className="flex items-center text-sm text-slate-500 dark:text-slate-400">
        <span className="mr-2">{file.name}</span>
        <span>({formatFileSize(file.size)})</span>
      </div>
    );
  }, [file, formatFileSize]);
  
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-200">Upload a File</h2>
      
      <div className="space-y-4">
        <div className="space-y-2">
          <label className="block text-sm font-medium text-slate-800 dark:text-slate-200">File</label>
          <input
            ref={fileInputRef}
            type="file"
            onChange={handleFileChange}
            disabled={isUploading}
            className="w-full border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-md p-2 focus:ring-2 focus:ring-slate-400 dark:focus:ring-slate-500"
          />
        </div>
        
        {fileSizeDisplay}
        
        <div className="space-y-2">
          <label className="block text-sm font-medium text-slate-800 dark:text-slate-200">Title (optional)</label>
          <input
            type="text"
            value={title || ''}
            onChange={handleTitleChange}
            disabled={isUploading}
            placeholder="Title for your file"
            className="w-full border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-md p-2 focus:ring-2 focus:ring-slate-400 dark:focus:ring-slate-500"
          />
        </div>
        
        <div className="space-y-2">
          <label className="block text-sm font-medium text-slate-800 dark:text-slate-200">Comment (optional)</label>
          <textarea
            value={initialComment}
            onChange={handleCommentChange}
            disabled={isUploading}
            placeholder="Add a comment with your file..."
            className="w-full border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-md p-2 focus:ring-2 focus:ring-slate-400 dark:focus:ring-slate-500 h-20"
          />
        </div>
        
        <div className="space-y-2">
          <label className="flex items-center text-sm text-slate-800 dark:text-slate-200">
            <input
              type="checkbox"
              checked={shouldNotify}
              onChange={(e) => setShouldNotify(e.target.checked)}
              className="mr-2 h-4 w-4 rounded border-slate-300 text-slate-600 focus:ring-slate-500"
            />
            Send notification message when file is uploaded
          </label>
        </div>
        
        {progress > 0 && (
          <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2.5 mb-2">
            <div
              className="bg-slate-600 dark:bg-slate-400 h-2.5 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            ></div>
            <p className="text-xs mt-1 text-slate-600 dark:text-slate-400">
              {statusMessage || `Uploading... ${Math.round(progress)}%`}
            </p>
          </div>
        )}
        
        {uploadStatus === 'error' && statusMessage && (
          <div className="p-3 rounded-md bg-red-100 dark:bg-red-900 border border-red-300 dark:border-red-700 text-red-800 dark:text-red-200">
            {statusMessage}
          </div>
        )}
        
        {uploadStatus === 'success' && statusMessage && (
          <div className="p-3 rounded-md bg-green-100 dark:bg-green-900 border border-green-300 dark:border-green-700 text-green-800 dark:text-green-200">
            {statusMessage}
          </div>
        )}
        
        <button
          onClick={handleUpload}
          disabled={!file || isUploading || !token || !selectedChannel}
          className="bg-slate-600 hover:bg-slate-700 dark:bg-slate-700 dark:hover:bg-slate-600 text-white px-4 py-2 rounded-md transition-colors disabled:opacity-50"
        >
          {isUploading ? 'Uploading...' : 'Upload to Slack'}
        </button>
      </div>
    </div>
  );
} 