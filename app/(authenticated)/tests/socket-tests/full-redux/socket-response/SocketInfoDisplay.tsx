import { useSelector } from "react-redux";
import { memo } from "react";
import { selectResponseInfoByListenerId } from '@/lib/redux/socket-io/selectors';
import { formatJson } from "@/utils/json/json-cleaner-utility";

// Individual component for Info array - only rerenders when info changes
const SocketInfoDisplay = memo(({ eventName }: { eventName: string }) => {
    const info = useSelector(selectResponseInfoByListenerId(eventName));
    return (
      <div className="text-gray-700 dark:text-gray-300 border-border rounded-md p-3">
        <span className="font-medium">Info:</span>
        {info.length > 0 ? (
          <pre className="whitespace-pre-wrap break-words text-sm mt-1 bg-gray-100 dark:bg-zinc-800 p-2 rounded-md">
            {formatJson(info)}
          </pre>
        ) : (
          <div className="mt-1 text-gray-400 dark:text-gray-500">No info</div>
        )}
      </div>
    );
  });
  
  export default SocketInfoDisplay;