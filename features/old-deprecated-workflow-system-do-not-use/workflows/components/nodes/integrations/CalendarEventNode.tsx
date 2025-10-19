import { memo } from "react";
import { Handle, Position } from "reactflow";
import { Calendar, Clock, Users, MapPin } from "lucide-react";

function CalendarEventNode({ data, isConnectable }) {
    const eventStatus = data.eventStatus || "upcoming"; // 'upcoming', 'in-progress', 'completed'

    return (
        <div className="border border-gray-300 rounded-lg bg-textured shadow-md w-52">
            <div className="absolute -left-3 top-1/2 transform -translate-y-1/2">
                <div className="flex items-center justify-center w-6 h-6 bg-purple-300 dark:bg-gray-700 rounded-md">
                    <Calendar className="h-4 w-4 text-purple-600 dark:text-gray-300" />
                </div>
            </div>

            <div className="p-4">
                <div className="flex items-center">
                    <div className="bg-gray-100 dark:bg-gray-700 p-2 rounded-lg mr-3">
                        <Calendar className="h-6 w-6 text-gray-700 dark:text-gray-300" />
                    </div>
                    <div>
                        <div className="font-medium text-sm text-gray-900 dark:text-gray-100">{data.label}</div>
                        {data.subLabel && <div className="text-xs text-gray-500 dark:text-gray-400">{data.subLabel}</div>}
                    </div>
                </div>

                {/* Event Time */}
                {(data.startTime || data.endTime) && (
                    <div className="mt-2 flex items-center">
                        <Clock className="h-3 w-3 text-gray-500 dark:text-gray-400 mr-1" />
                        <div className="text-xs text-gray-700 dark:text-gray-300">
                            {data.startTime}
                            {data.endTime ? ` - ${data.endTime}` : ""}
                        </div>
                    </div>
                )}

                {/* Event Location */}
                {data.location && (
                    <div className="mt-1 flex items-center">
                        <MapPin className="h-3 w-3 text-gray-500 dark:text-gray-400 mr-1" />
                        <div className="text-xs text-gray-700 dark:text-gray-300 truncate">{data.location}</div>
                    </div>
                )}

                {/* Attendees */}
                {data.attendees && (
                    <div className="mt-1 flex items-center">
                        <Users className="h-3 w-3 text-gray-500 dark:text-gray-400 mr-1" />
                        <div className="text-xs text-gray-700 dark:text-gray-300">
                            {typeof data.attendees === "number" ? `${data.attendees} attendees` : data.attendees}
                        </div>
                    </div>
                )}

                {/* Event Status */}
                <div className="mt-2 flex items-center">
                    <div className="text-xs text-gray-500 dark:text-gray-400 mr-2">Status:</div>
                    {eventStatus === "upcoming" && (
                        <div className="flex items-center text-blue-500 text-xs">
                            <div className="h-2 w-2 rounded-full bg-blue-500 mr-1"></div>
                            Upcoming
                        </div>
                    )}
                    {eventStatus === "in-progress" && (
                        <div className="flex items-center text-green-500 text-xs">
                            <div className="h-2 w-2 rounded-full bg-green-500 mr-1"></div>
                            In Progress
                        </div>
                    )}
                    {eventStatus === "completed" && (
                        <div className="flex items-center text-gray-500 text-xs">
                            <div className="h-2 w-2 rounded-full bg-gray-500 mr-1"></div>
                            Completed
                        </div>
                    )}
                </div>
            </div>

            <Handle type="target" position={Position.Left} isConnectable={isConnectable} className="w-3 h-3 bg-gray-400" />
            <Handle type="source" position={Position.Right} isConnectable={isConnectable} className="w-3 h-3 bg-gray-400" />
        </div>
    );
}

export default memo(CalendarEventNode);
