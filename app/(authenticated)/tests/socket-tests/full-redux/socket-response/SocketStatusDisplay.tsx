import { useSelector } from "react-redux";
import { memo } from "react";
import { selectResponseEnded } from '@/lib/redux/socket-io/selectors';

const SocketStatusDisplay = memo(({ eventName }: { eventName: string }) => {
    const ended = useSelector(selectResponseEnded(eventName));
    return (
      <div className="text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 rounded-md p-3">
        <span className="font-medium">Status:</span>
        {ended ? (
          <span className="ml-2 text-green-600 dark:text-green-400">Task Ended</span>
        ) : (
          <span className="ml-2 text-blue-600 dark:text-blue-400">In Progress</span>
        )}
      </div>
    );
  });
  
  export default SocketStatusDisplay;