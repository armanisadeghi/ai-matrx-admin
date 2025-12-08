import { useSelector } from "react-redux";
import { memo } from "react";
import { formatJson } from "@/utils/json/json-cleaner-utility";
import { selectResponseDataByListenerId } from '@/lib/redux/socket-io/selectors';

// Individual component for Data array - only rerenders when data changes
const SocketDataDisplay = memo(({ eventName }: { eventName: string }) => {
    const data = useSelector(selectResponseDataByListenerId(eventName));
    return (
      <div className="text-gray-700 dark:text-gray-300 border-border rounded-md p-3">
        <span className="font-medium">Data:</span>
        {data.length > 0 ? (
          <pre className="whitespace-pre-wrap break-words text-sm mt-1 bg-gray-100 dark:bg-zinc-800 p-2 rounded-md">
            {formatJson(data)}
          </pre>
        ) : (
          <div className="mt-1 text-gray-400 dark:text-gray-500">No data</div>
        )}
      </div>
    );
  });
  
  export default SocketDataDisplay;