import { useAppSelector } from "@/lib/redux";
import { selectTaskListenerIds } from "@/lib/redux/socket-io";
import { TruncatedList } from "./StatusIndicator";
import { CompactListDisplay } from "./CompactListDisplay";


export const TaskListenerIdsList = ({ taskId }: { taskId: string }) => {
    const listenerIds = useAppSelector((state) => selectTaskListenerIds(state, taskId));

    return <TruncatedList items={listenerIds} label="Listener IDs" maxDisplay={2} />;
};




export const TaskListenerIdsDisplay = ({ taskId }: { taskId: string }) => {
    const listenerIds = useAppSelector((state) => selectTaskListenerIds(state, taskId));

    return <CompactListDisplay items={listenerIds} label="Listener IDs" displayCount={1} isCopyable={true} />;
};

