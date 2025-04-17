'use client';
import { SimpleAudioPlayer } from './AudioPage';

export default function AudioTestPage() {
  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-xl font-bold mb-6">Audio Context Initialization Test</h1>
      
      <div className="max-w-md mx-auto">
        <SimpleAudioPlayer />
        
        <div className="mt-6 p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-900">
          <h3 className="font-medium mb-2">How this works:</h3>
          <ol className="list-decimal pl-5 space-y-1 text-sm">
            <li>First, click "Initialize Audio Context" to set up the audio system</li>
            <li>Then click "Play Test Sound" to verify the audio is working</li>
            <li>This two-step approach ensures compatibility with browser autoplay policies</li>
            <li>Check your browser console for detailed logs</li>
          </ol>
        </div>
      </div>
    </div>
  );
}