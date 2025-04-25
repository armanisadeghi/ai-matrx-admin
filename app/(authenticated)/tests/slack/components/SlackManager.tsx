import { useState, useEffect } from 'react';
import {SlackChannel, SlackClient, SlackMessage} from '../slackClientUtils';

const SlackManager = () => {
  const [token, setToken] = useState('');
  const [channels, setChannels] = useState<SlackChannel[]>([]);
  const [selectedChannel, setSelectedChannel] = useState('');
  const [message, setMessage] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [savedTokens, setSavedTokens] = useState<string[]>([]);

  // Load saved tokens on the component mount
  useEffect(() => {
    const tokens = localStorage.getItem('slackTokens');
    if (tokens) {
      const parsedTokens = JSON.parse(tokens);
      setSavedTokens(parsedTokens);
      // Use the first token by default if available
      if (parsedTokens.length > 0) {
        setToken(parsedTokens[0]);
      }
    }
  }, []);

  // Fetch channels when token changes
  useEffect(() => {
    if (token) {
      fetchChannels();
    }
  }, [token]);

  const fetchChannels = async () => {
    try {
      setLoading(true);
      setError('');
      const client = new SlackClient(token);
      const channelsList = await client.listChannels();
      setChannels(channelsList);
      setLoading(false);
    } catch (err) {
      setLoading(false);
      setError('Failed to fetch channels. Please check your token.');
      console.error(err);
    }
  };

  const handleTokenChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setToken(e.target.value);
  };

  const saveToken = () => {
    if (!token) return;

    if (!savedTokens.includes(token)) {
      const newTokens = [...savedTokens, token];
      localStorage.setItem('slackTokens', JSON.stringify(newTokens));
      setSavedTokens(newTokens);
      setSuccess('Token saved successfully!');
      setTimeout(() => setSuccess(''), 3000);
    }
  };

  const selectToken = (savedToken: string) => {
    setToken(savedToken);
  };

  const removeToken = (tokenToRemove: string) => {
    const newTokens = savedTokens.filter(t => t !== tokenToRemove);
    localStorage.setItem('slackTokens', JSON.stringify(newTokens));
    setSavedTokens(newTokens);

    if (token === tokenToRemove) {
      setToken(newTokens.length > 0 ? newTokens[0] : '');
    }
  };

  const handleChannelChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedChannel(e.target.value);
  };

  const handleMessageChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
    }
  };

  const sendMessage = async () => {
    if (!token || !selectedChannel || !message) {
      setError('Please provide token, select a channel, and enter a message');
      return;
    }

    try {
      setLoading(true);
      setError('');
      const client = new SlackClient(token);

      const slackMessage: SlackMessage = {
        channel: selectedChannel,
        text: message
      };

      try {
        await client.sendMessage(slackMessage);
        setSuccess('Message sent successfully!');
        setMessage('');
      } catch (err: any) {
        // Handle specific Slack errors
        if (err.message?.includes('not_in_channel')) {
          setError('Bot is not in this channel. Attempting to join...');

          // Try to join manually and send again
          const joined = await client.joinChannel(selectedChannel);
          if (joined) {
            try {
              await client.sendMessage(slackMessage);
              setSuccess('Bot joined channel and sent message successfully!');
              setMessage('');
            } catch (innerErr) {
              setError('Failed to send message after joining channel. You may need to manually invite the bot using /invite @YourBotName');
            }
          } else {
            setError('Failed to join channel. This might be a private channel - please manually invite the bot using /invite @YourBotName');
          }
        } else if (err.message?.includes('channel_not_found')) {
          setError('Channel not found. Please select a valid channel.');
        } else if (err.message?.includes('invalid_auth')) {
          setError('Authentication failed. Your token may be invalid or expired.');
        } else {
          setError(`Failed to send message: ${err.message}`);
        }
      }

      setLoading(false);
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setLoading(false);
      setError('Failed to send message');
      console.error(err);
    }
  };

  const uploadFile = async () => {
    if (!token || !selectedChannel || !file) {
      setError('Please provide token, select a channel, and choose a file');
      return;
    }

    try {
      setLoading(true);
      setError('');
      const client = new SlackClient(token);

      await client.uploadFile(selectedChannel, file, file.name);
      setSuccess('File uploaded successfully!');
      setFile(null);
      setLoading(false);

      // Reset file input
      const fileInput = document.getElementById('file-input') as HTMLInputElement;
      if (fileInput) {
        fileInput.value = '';
      }

      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setLoading(false);
      setError('Failed to upload file');
      console.error(err);
    }
  };

  return (
      <div className="max-w-4xl mx-auto">
        {/* Token Management */}
        <div className="mb-8 p-4 rounded shadow border border-gray-500">
          <h2 className="text-xl font-semibold mb-4">Token Management</h2>

          <div className="flex flex-col md:flex-row gap-4 mb-4">
            <input
                type="text"
                value={token}
                onChange={handleTokenChange}
                placeholder="Enter Slack OAuth token (xoxb-...)"
                className="flex-grow p-2 border rounded bg-transparent"
            />
            <button
                onClick={saveToken}
                className="bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700"
            >
              Save Token
            </button>
          </div>

          {savedTokens.length > 0 && (
              <div className="mt-4">
                <h3 className="font-medium mb-2">Saved Tokens:</h3>
                <div className="flex flex-wrap gap-2">
                  {savedTokens.map((savedToken, index) => (
                      <div key={index} className="flex items-center bg-gray-700 p-2 rounded">
                        <button
                            onClick={() => selectToken(savedToken)}
                            className="text-gray-50 hover:text-gray-100 mr-2"
                        >
                          {savedToken.substring(0, 12)}...
                        </button>
                        <button
                            onClick={() => removeToken(savedToken)}
                            className="text-red-500 hover:text-red-700"
                        >
                          ✕
                        </button>
                      </div>
                  ))}
                </div>
              </div>
          )}
        </div>

        {/* Channel and Messaging */}
        <div className="mb-8 p-4 rounded shadow border border-gray-500">
          <h2 className="text-xl font-semibold mb-4">Send a Message</h2>

          <div className="mb-4">
            <label className="block mb-2">Channel:</label>
            <select
                value={selectedChannel}
                onChange={handleChannelChange}
                className="w-full p-2 border rounded bg-transparent"
                disabled={loading || channels.length === 0}
            >
              <option value="">Select a channel</option>
              {channels.map(channel => (
                  <option key={channel.id} value={channel.id} className="bg-gray-700">
                    #{channel.name}
                  </option>
              ))}
            </select>
            {channels.length === 0 && token && !loading && (
                <button
                    onClick={fetchChannels}
                    className="mt-2 bg-green-500 text-white py-1 px-3 rounded text-sm hover:bg-green-600"
                >
                  Refresh Channels
                </button>
            )}
          </div>

          <div className="mb-4">
            <label className="block mb-2">Message:</label>
            <textarea
                value={message}
                onChange={handleMessageChange}
                placeholder="Type your message here..."
                className="w-full p-2 border rounded h-32 bg-transparent"
                disabled={loading}
            />
          </div>

          <button
              onClick={sendMessage}
              className="bg-green-500 text-white py-2 px-4 rounded hover:bg-green-600 disabled:bg-gray-400"
              disabled={loading || !token || !selectedChannel || !message}
          >
            {loading ? 'Sending...' : 'Send Message'}
          </button>
        </div>

        {/* File Upload */}
        <div className="mb-8 p-4 rounded shadow border border-gray-500">
          <h2 className="text-xl font-semibold mb-4">Upload a File</h2>

          <div className="mb-4">
            <label className="block mb-2">Select File:</label>
            <input
                id="file-input"
                type="file"
                onChange={handleFileChange}
                className="w-full p-2 border rounded"
                disabled={loading}
            />
          </div>

          <button
              onClick={uploadFile}
              className="bg-purple-500 text-white py-2 px-4 rounded hover:bg-purple-600 disabled:bg-gray-400"
              disabled={loading || !token || !selectedChannel || !file}
          >
            {loading ? 'Uploading...' : 'Upload File'}
          </button>
        </div>

        {/* Status Messages */}
        {error && (
            <div className="p-3 bg-red-100 border border-red-400 text-red-700 rounded mb-4">
              {error}
            </div>
        )}

        {success && (
            <div className="p-3 bg-green-100 border border-green-400 text-green-700 rounded mb-4">
              {success}
            </div>
        )}
      </div>
  );
};

export default SlackManager;