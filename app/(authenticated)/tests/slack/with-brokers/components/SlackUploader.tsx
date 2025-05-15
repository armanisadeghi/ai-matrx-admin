// components/SlackUploader.tsx
'use client';

import { useState } from 'react';
import { useAppDispatch, useAppSelector } from '@/lib/redux';
import { brokerConceptActions, brokerConceptSelectors } from '@/lib/redux/brokerSlice';
import { useServerBrokerSync } from '@/lib/redux/brokerSlice';

const BROKER_IDS = {
  token: { source: 'api', itemId: 'slack_token' },
  channels: { source: 'slack', itemId: 'slack_channels' },
  filename: { source: 'slack', itemId: 'slack_filename' },
  title: { source: 'slack', itemId: 'slack_title' },
  initialComment: { source: 'slack', itemId: 'slack_initial_comment' },
} as const;

export function SlackUploader() {
  const dispatch = useAppDispatch();
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  // Get current broker values
  const token = useAppSelector(state => 
    brokerConceptSelectors.selectText(state, BROKER_IDS.token)
  );
  const channels = useAppSelector(state => 
    brokerConceptSelectors.selectText(state, BROKER_IDS.channels)
  );
  const filename = useAppSelector(state => 
    brokerConceptSelectors.selectText(state, BROKER_IDS.filename)
  );
  const title = useAppSelector(state => 
    brokerConceptSelectors.selectText(state, BROKER_IDS.title)
  );
  const initialComment = useAppSelector(state => 
    brokerConceptSelectors.selectText(state, BROKER_IDS.initialComment)
  );

  // Sync brokers to server
  useServerBrokerSync({
    brokers: Object.values(BROKER_IDS),
    syncOnChange: true,
    syncInterval: 0 // Only sync on changes
  });

  const handleUpload = async () => {
    if (!file || !token || !channels) {
      alert('Please provide token, channels, and select a file');
      return;
    }

    setUploading(true);
    
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/slack/upload-broker', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();
      
      if (result.ok) {
        alert('File uploaded successfully!');
      } else {
        alert(`Upload failed: ${result.error}`);
      }
    } catch (error) {
      console.error('Upload error:', error);
      alert('Upload failed. Check console for details.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <label className="text-slate-800 dark:text-slate-200">Slack Token:</label>
        <input
          type="password"
          value={token || ''}
          onChange={(e) => dispatch(brokerConceptActions.setText({
            idArgs: BROKER_IDS.token,
            text: e.target.value
          }))}
          className="border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 p-2 w-full rounded-md focus:ring-2 focus:ring-slate-400 dark:focus:ring-slate-500"
        />
      </div>

      <div className="space-y-1">
        <label className="text-slate-800 dark:text-slate-200">Channel ID:</label>
        <input
          type="text"
          value={channels || ''}
          onChange={(e) => dispatch(brokerConceptActions.setText({
            idArgs: BROKER_IDS.channels,
            text: e.target.value
          }))}
          className="border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 p-2 w-full rounded-md focus:ring-2 focus:ring-slate-400 dark:focus:ring-slate-500"
        />
      </div>

      <div className="space-y-1">
        <label className="text-slate-800 dark:text-slate-200">Filename (optional):</label>
        <input
          type="text"
          value={filename || ''}
          onChange={(e) => dispatch(brokerConceptActions.setText({
            idArgs: BROKER_IDS.filename,
            text: e.target.value
          }))}
          className="border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 p-2 w-full rounded-md focus:ring-2 focus:ring-slate-400 dark:focus:ring-slate-500"
        />
      </div>

      <div className="space-y-1">
        <label className="text-slate-800 dark:text-slate-200">Title (optional):</label>
        <input
          type="text"
          value={title || ''}
          onChange={(e) => dispatch(brokerConceptActions.setText({
            idArgs: BROKER_IDS.title,
            text: e.target.value
          }))}
          className="border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 p-2 w-full rounded-md focus:ring-2 focus:ring-slate-400 dark:focus:ring-slate-500"
        />
      </div>

      <div className="space-y-1">
        <label className="text-slate-800 dark:text-slate-200">Initial Comment (optional):</label>
        <textarea
          value={initialComment || ''}
          onChange={(e) => dispatch(brokerConceptActions.setText({
            idArgs: BROKER_IDS.initialComment,
            text: e.target.value
          }))}
          className="border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 p-2 w-full rounded-md focus:ring-2 focus:ring-slate-400 dark:focus:ring-slate-500"
          rows={3}
        />
      </div>

      <div className="space-y-1">
        <label className="text-slate-800 dark:text-slate-200">File:</label>
        <input
          type="file"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
          className="border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 p-2 w-full rounded-md focus:ring-2 focus:ring-slate-400 dark:focus:ring-slate-500"
        />
      </div>

      <button
        onClick={handleUpload}
        disabled={uploading || !file}
        className="bg-slate-600 hover:bg-slate-700 dark:bg-slate-700 dark:hover:bg-slate-600 text-white px-4 py-2 rounded-md transition-colors disabled:opacity-50"
      >
        {uploading ? 'Uploading...' : 'Upload to Slack'}
      </button>
    </div>
  );
}