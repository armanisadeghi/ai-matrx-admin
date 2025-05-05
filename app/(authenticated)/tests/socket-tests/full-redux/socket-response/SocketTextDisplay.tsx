'use client';

import { memo } from 'react';
import { useSelector } from 'react-redux';
import dynamic from 'next/dynamic';
import { selectResponseTextByListenerId } from '@/lib/redux/socket-io/selectors';



const ReactMarkdown = dynamic(() => import("react-markdown"), { ssr: false });

const SocketTextDisplay = memo(({ eventName }: { eventName: string }) => {
  const text = useSelector(selectResponseTextByListenerId(eventName));
  return (
    <div className="text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 rounded-md p-3">
      <span className="font-medium">Text:</span>
      {text ? (
        <div className="mt-1">
          <ReactMarkdown>{text}</ReactMarkdown>
        </div>
      ) : (
        <div className="mt-1 text-gray-400 dark:text-gray-500">No text data</div>
      )}
    </div>
  );
});

export default SocketTextDisplay;