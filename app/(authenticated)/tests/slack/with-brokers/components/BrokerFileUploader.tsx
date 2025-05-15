'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '@/lib/redux';
import { brokerConceptActions, brokerConceptSelectors } from '@/lib/redux/brokerSlice';
import { SLACK_BROKER_IDS } from './BrokerSlackClient';
import { Upload, FileText, MessageSquare, Send, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { FileUploadWithStorage, UploadedFileResult } from '@/components/ui/file-upload/FileUploadWithStorage';

export function BrokerFileUploader() {
  const dispatch = useAppDispatch();
  const [isUploading, setIsUploading] = useState(false);
  const [isSlackUploading, setIsSlackUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [statusMessage, setStatusMessage] = useState('');
  const [shouldNotify, setShouldNotify] = useState(true);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFileResult[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  
  // Get session ID from cookies once on mount
  useEffect(() => {
    // Function to get cookie by name
    const getCookie = (name: string): string | null => {
      const value = `; ${document.cookie}`;
      const parts = value.split(`; ${name}=`);
      if (parts.length === 2) return parts.pop()?.split(';').shift() || null;
      return null;
    };
    
    // Get and set session ID
    const id = getCookie('session-id');
    setSessionId(id);
    
    // If no session ID in cookies, generate one and store it
    if (!id) {
      const generatedId = `session_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
      document.cookie = `session-id=${generatedId}; path=/; max-age=86400`;
      setSessionId(generatedId);
    }
  }, []);
  
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
  
  // Handle file upload complete
  const handleUploadComplete = useCallback((results: UploadedFileResult[]) => {
    setUploadedFiles(results);
    

    if (results.length > 0) {
      const fileName = results[0].details?.filename || 'file';
      
      dispatch(brokerConceptActions.setText({
        idArgs: SLACK_BROKER_IDS.filename,
        text: fileName
      }));
      
      // Set default title to match filename if not already set
      if (!title) {
        dispatch(brokerConceptActions.setText({
          idArgs: SLACK_BROKER_IDS.title,
          text: fileName
        }));
      }
    }
    
    setUploadStatus('idle');
    setStatusMessage('');
  }, [dispatch, title]);
  
  // Handle file upload status change
  const handleUploadStatusChange = useCallback((isCurrentlyUploading: boolean) => {
    setIsUploading(isCurrentlyUploading);
  }, []);
  
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
    setUploadedFiles([]);
    setProgress(0);
    
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
  
  // Handle file upload to Slack - memoize callback
  const handleUploadToSlack = useCallback(async () => {
    if (!token || !selectedChannel || uploadedFiles.length === 0) {
      setUploadStatus('error');
      setStatusMessage('Token, channel, and file are required');
      return;
    }
    
    if (!sessionId) {
      setUploadStatus('error');
      setStatusMessage('Session ID not found. Please refresh the page and try again.');
      return;
    }
    
    let progressInterval: NodeJS.Timeout | undefined;
    
    try {
      setIsSlackUploading(true);
      setUploadStatus('uploading');
      setProgress(10);
      setStatusMessage('Preparing upload to Slack...');
      
      // Simulate progress during upload
      progressInterval = setInterval(() => {
        setProgress(prev => {
          const increment = Math.random() * 5 + 2; // Random increment between 2-7%
          const newValue = prev + increment;
          return newValue < 90 ? newValue : prev; // Cap at 90% until complete
        });
      }, 800);
      
      const fileDetails = uploadedFiles[0];
      
      // Upload the file to Slack using the stored file URL
      setStatusMessage('Uploading file to Slack...');
      const response = await fetch('/api/slack/upload-broker', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-session-id': sessionId
        },
        body: JSON.stringify({
          fileUrl: fileDetails.url,
          fileType: fileDetails.type,
          fileDetails: fileDetails.details,
          title: title || filename,
          initialComment: initialComment,
          notify: shouldNotify,
          channel: selectedChannel
        })
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
      setStatusMessage('File uploaded successfully to Slack!');
      resetForm();
      
    } catch (error: any) {
      clearInterval(progressInterval);
      setProgress(0);
      setUploadStatus('error');
      setStatusMessage(`Error: ${error.message || 'Unknown error'}`);
      console.error('File upload error:', error);
    } finally {
      setIsSlackUploading(false);
    }
  }, [token, selectedChannel, uploadedFiles, filename, title, initialComment, shouldNotify, resetForm, sessionId]);
  
  // Format file size for display - memoize function
  const formatFileSize = useCallback((bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }, []);
  
  // Memoize file display info
  const fileInfo = useMemo(() => {
    if (uploadedFiles.length === 0) return null;
    
    const file = uploadedFiles[0];
    const fileSize = file.details?.size || 0;
    const fileName = file.details?.filename || 'file';
    
    return (
      <div className="flex items-center text-sm text-slate-500 dark:text-slate-400">
        <FileText className="w-4 h-4 mr-2" />
        <span className="mr-2">{fileName}</span>
        {fileSize > 0 && <span>({formatFileSize(fileSize)})</span>}
      </div>
    );
  }, [uploadedFiles, formatFileSize]);
  
  // Don't render if not authenticated
  if (!token) {
    return null;
  }
  
  // Check if a channel is selected
  const noChannelSelected = !selectedChannel;
  
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3 mb-2">
        <div className="bg-slate-200 dark:bg-slate-800 p-2 rounded-md">
          <Upload className="w-5 h-5 text-slate-700 dark:text-slate-300" />
        </div>
        <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-200">Upload to Slack</h2>
      </div>
      
      {noChannelSelected && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-md p-3 text-sm text-amber-800 dark:text-amber-300">
          Please select a channel from the dropdown above before uploading.
        </div>
      )}
      
      <div className="space-y-4">
        <div className="space-y-2">
          <label className="block text-sm font-medium text-slate-800 dark:text-slate-200">Select File</label>
          <FileUploadWithStorage
            useMiniUploader={true}
            multiple={false}
            saveTo="private"
            onUploadComplete={handleUploadComplete}
            onUploadStatusChange={handleUploadStatusChange}
            initialFiles={uploadedFiles}
          />
        </div>
        
        {fileInfo}
        
        <div className="space-y-2">
          <label className="block text-sm font-medium text-slate-800 dark:text-slate-200">Title (optional)</label>
          <input
            type="text"
            value={title || ''}
            onChange={handleTitleChange}
            disabled={isSlackUploading}
            placeholder="Title for your file"
            className="w-full border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-md p-2 focus:ring-2 focus:ring-slate-400 dark:focus:ring-slate-500"
          />
        </div>
        
        <div className="space-y-2">
          <label className="block text-sm font-medium text-slate-800 dark:text-slate-200">Comment (optional)</label>
          <textarea
            value={initialComment}
            onChange={handleCommentChange}
            disabled={isSlackUploading}
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
          <div className="p-3 rounded-md bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700 text-red-800 dark:text-red-200 flex items-center gap-2">
            <XCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0" />
            <span>{statusMessage}</span>
          </div>
        )}
        
        {uploadStatus === 'success' && statusMessage && (
          <div className="p-3 rounded-md bg-green-100 dark:bg-green-900/30 border border-green-300 dark:border-green-700 text-green-800 dark:text-green-200 flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0" />
            <span>{statusMessage}</span>
          </div>
        )}
        
        <button
          onClick={handleUploadToSlack}
          disabled={isUploading || isSlackUploading || uploadedFiles.length === 0 || !token || !selectedChannel}
          className="flex items-center justify-center gap-2 bg-slate-600 hover:bg-slate-700 dark:bg-slate-700 dark:hover:bg-slate-600 text-white px-4 py-2 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed w-full"
        >
          {isSlackUploading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Uploading to Slack...</span>
            </>
          ) : (
            <>
              <Send className="w-5 h-5" />
              <span>Upload to Slack</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
} 