import React, { useState, useEffect } from 'react';
import FileSystemManager from '@/utils/file-operations/FileSystemManager'; // Adjust the import path as needed

const StorageTestUI = () => {
  const [selectedBucket, setSelectedBucket] = useState('userContent');
  const [buckets, setBuckets] = useState([]);
  const [folderName, setFolderName] = useState('');
  const [file, setFile] = useState(null);
  const [status, setStatus] = useState('');
  
  const fileSystemManager = FileSystemManager.getInstance();

  // Fetch available buckets on mount
  useEffect(() => {
    const fetchBuckets = async () => {
      const availableBuckets = await fileSystemManager.getBuckets();
      setBuckets(availableBuckets);
    };
    fetchBuckets();
  }, []);

  // Handle folder creation
  const handleCreateFolder = async () => {
    if (!folderName) {
      setStatus('Please enter a folder name');
      return;
    }

    setStatus('Creating folder...');
    const success = await fileSystemManager.createFolder(selectedBucket, folderName);
    setStatus(success ? `Folder "${folderName}" created successfully` : 'Failed to create folder');
    setFolderName('');
  };

  // Handle file upload
  const handleUploadFile = async (path = '') => {
    if (!file) {
      setStatus('Please select a file');
      return;
    }

    setStatus('Uploading file...');
    const filePath = path ? `${path}/${file.name}` : file.name;
    const success = await fileSystemManager.uploadFile(selectedBucket, filePath, file);
    setStatus(success ? `File "${file.name}" uploaded successfully` : 'Failed to upload file');
    setFile(null);
  };

  // Handle file upload inside created folder
  const handleUploadToFolder = async () => {
    if (!folderName) {
      setStatus('Please create a folder first');
      return;
    }
    await handleUploadFile(folderName);
  };

  return (
    <div style={{ padding: '20px', maxWidth: '600px', margin: '0 auto' }}>
      <h2>Storage Test UI</h2>

      {/* Bucket Selection */}
      <div style={{ marginBottom: '20px' }}>
        <label htmlFor="bucketSelect">Select Bucket: </label>
        <select
          id="bucketSelect"
          value={selectedBucket}
          onChange={(e) => setSelectedBucket(e.target.value)}
        >
          <option value="userContent">userContent (RLS)</option>
          <option value="any-file">any-file (No RLS)</option>
          {/* You can dynamically populate this if needed */}
          {buckets.map(bucket => (
            <option key={bucket.name} value={bucket.name}>
              {bucket.name}
            </option>
          ))}
        </select>
      </div>

      {/* Folder Creation */}
      <div style={{ marginBottom: '20px' }}>
        <h3>Create Folder</h3>
        <input
          type="text"
          value={folderName}
          onChange={(e) => setFolderName(e.target.value)}
          placeholder="Enter folder name"
          style={{ marginRight: '10px', padding: '5px' }}
        />
        <button 
          onClick={handleCreateFolder}
          style={{ padding: '5px 10px' }}
        >
          Create Folder
        </button>
      </div>

      {/* File Upload */}
      <div style={{ marginBottom: '20px' }}>
        <h3>Upload File</h3>
        <input
          type="file"
          onChange={(e) => setFile(e.target.files[0])}
          style={{ marginBottom: '10px' }}
        />
        <div>
          <button
            onClick={() => handleUploadFile()}
            style={{ padding: '5px 10px', marginRight: '10px' }}
          >
            Upload to Bucket Root
          </button>
          <button
            onClick={handleUploadToFolder}
            style={{ padding: '5px 10px' }}
          >
            Upload to Folder
          </button>
        </div>
      </div>

      {/* Status */}
      {status && (
        <div style={{ 
          marginTop: '20px', 
          padding: '10px', 
          background: status.includes('success') ? '#e6ffe6' : '#ffe6e6',
          borderRadius: '5px'
        }}>
          {status}
        </div>
      )}
    </div>
  );
};

export default StorageTestUI;