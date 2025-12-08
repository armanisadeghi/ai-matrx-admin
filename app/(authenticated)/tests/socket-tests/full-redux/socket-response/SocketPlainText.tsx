import { memo } from "react";
import { useSelector } from "react-redux";
import { selectResponseTextByListenerId } from '@/lib/redux/socket-io/selectors';

const SocketPlainTextDisplay = memo(({ eventName }: { eventName: string }) => {
    const text = useSelector(selectResponseTextByListenerId(eventName));
    return (
      <div className="text-gray-700 dark:text-gray-300 border-border rounded-md p-3">
        <span className="font-medium">Text:</span>
        {text ? (
          <pre className="mt-1 whitespace-pre-wrap">{text}</pre>
        ) : (
          <div className="mt-1 text-gray-400 dark:text-gray-500">No text data</div>
        )}
      </div>
    );
  });
  
  export default SocketPlainTextDisplay;