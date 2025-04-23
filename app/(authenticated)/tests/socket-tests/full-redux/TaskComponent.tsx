"use client";

import React, { useState, useEffect } from "react";
import { RootState } from "@/lib/redux/store";
import { useAppSelector, useAppDispatch } from "@/lib/redux/hooks";
import { createTask, startTask } from "@/lib/redux/socket-io/socketThunks";
import {
  selectIsConnected,
  selectSocketUrl,
  selectNamespace,
  selectPrimaryConnectionId,
  selectConnectionById,
} from "@/lib/redux/socket-io/selectors";
import {
  changeConnectionUrl,
  changeNamespace,
} from "@/lib/redux/socket-io/slices/socketConnectionsSlice";
import { deleteTask } from "@/lib/redux/socket-io/slices/socketTasksSlice";
import SocketServerSelect from "./socket-options/SocketServerSelect";
import NamespaceSelect from "./socket-options/NamespaceSelect";
import ServiceSelect from "./socket-options/ServiceSelect";
import TaskSelect from "./socket-options/TaskSelect";
import TaskDataFields from "./socket-options/TaskDataFields";
import TaskDataFieldsAdvanced from "./socket-options/TaskDataFieldsAdvanced";
import EventsList from "./socket-options/EventsList";
import TaskResponses from "./socket-options/TaskResponses";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const TaskComponent: React.FC = () => {
  const dispatch = useAppDispatch();
  const primaryConnectionId = useAppSelector((state: RootState) => selectPrimaryConnectionId(state));

  const [selectedConnectionId, setSelectedConnectionId] = useState<string>(primaryConnectionId);

  // Local state
  const [service, setService] = useState<string>("");
  const [taskName, setTaskName] = useState<string>("");
  const [taskId, setTaskId] = useState<string | null>(null);
  const [useAdvancedFields, setUseAdvancedFields] = useState<boolean>(false);

  // Selectors for Redux state
  const isConnected = useAppSelector((state: RootState) => selectIsConnected(state, selectedConnectionId));
  const currentUrl = useAppSelector((state: RootState) => selectSocketUrl(state, selectedConnectionId));
  const currentNamespace = useAppSelector((state: RootState) => selectNamespace(state, selectedConnectionId));

  const connections = useAppSelector((state: RootState) =>
    Object.values(state.socketConnections.connections)
  );


  // Log state changes for debugging
  useEffect(() => {
    console.log("TaskComponent: service changed:", service);
  }, [service]);

  useEffect(() => {
    console.log("TaskComponent: taskName changed:", taskName);
  }, [taskName]);

  useEffect(() => {
    console.log("TaskComponent: selectedConnectionId changed:", selectedConnectionId);
  }, [selectedConnectionId]);

  // Create task when service and taskName are set
  useEffect(() => {
    if (service && taskName) {
      const newTaskId = dispatch(createTask(service, taskName, undefined, selectedConnectionId));
      setTaskId(newTaskId);
    } else {
      setTaskId(null);
    }
  }, [service, taskName, selectedConnectionId, dispatch]);

  // Handle service change
  const handleServiceChange = (newService: string) => {
    console.log("handleServiceChange called with:", newService);
    setService(newService);
    setTaskName(""); // Reset task when service changes
    setTaskId(null); // Clear taskId
  };

  // Handle task change
  const handleTaskChange = (newTask: string) => {
    console.log("handleTaskChange called with:", newTask);
    setTaskName(newTask);
  };

  // Handle submit
  const handleSubmit = () => {
    if (service && taskName && taskId && isConnected) {
      dispatch(startTask(service, taskName, {}, selectedConnectionId)); // Task data is already in Redux
      dispatch(deleteTask(taskId)); // Clear task from store
      setService("");
      setTaskName("");
      setTaskId(null);
    }
  };

  // Handle connection change
  const handleConnectionChange = (connectionId: string) => {
    setSelectedConnectionId(connectionId);
    // Update Redux state to reflect the selected connection
    const connection = connections.find((conn) => conn.connectionId === connectionId);
    if (connection) {
      dispatch(
        changeConnectionUrl({ connectionId, url: connection.url })
      );
      dispatch(
        changeNamespace({ connectionId, namespace: connection.namespace })
      );
    }
  };

  return (
    <div className="w-full h-full flex flex-col bg-zinc-100 dark:bg-zinc-850 text-gray-800 dark:text-gray-100">
      <h2 className="text-2xl font-bold px-6 pt-6 pb-4 text-gray-900 dark:text-gray-50">
        Task Builder
      </h2>
      <div className="flex flex-row flex-1 overflow-hidden px-6 pb-6 gap-6">
        <div className="w-1/2 flex flex-col overflow-hidden">
          <div className="space-y-4 h-full overflow-y-auto pr-2">
            {/* Connection Selection */}
            <div>
              <Label htmlFor="connection-select" className="text-sm text-gray-700 dark:text-gray-300">
                Connection
              </Label>
              <Select
                value={selectedConnectionId}
                onValueChange={handleConnectionChange}
              >
                <SelectTrigger
                  id="connection-select"
                  className="bg-zinc-200 dark:bg-zinc-900 border-1 border-gray-400 dark:border-gray-500 rounded-3xl"
                >
                  <SelectValue placeholder="Select a connection..." />
                </SelectTrigger>
                <SelectContent>
                  {connections.map((conn) => (
                    <SelectItem
                      key={conn.connectionId}
                      value={conn.connectionId}
                      className="bg-zinc-200 dark:bg-zinc-900 hover:bg-zinc-300 dark:hover:bg-zinc-800 cursor-pointer"
                    >
                      {conn.connectionId} ({conn.url}{conn.namespace})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <SocketServerSelect />
            <NamespaceSelect />
            <ServiceSelect value={service} onServiceChange={handleServiceChange} />
            <TaskSelect
              service={service}
              value={taskName}
              onTaskChange={handleTaskChange}
            />

            {/* Toggle between simple and advanced field components */}
            <div className="flex items-center space-x-2 py-2">
              <Switch
                id="advanced-mode"
                checked={useAdvancedFields}
                onCheckedChange={setUseAdvancedFields}
              />
              <Label
                htmlFor="advanced-mode"
                className="text-sm text-gray-700 dark:text-gray-300"
              >
                Use Advanced Form Fields
              </Label>
            </div>

            {useAdvancedFields ? (
              <TaskDataFieldsAdvanced
                taskId={taskId}
                taskName={taskName}
                isConnected={isConnected}
                onSubmit={handleSubmit}
              />
            ) : (
              <TaskDataFields
                taskId={taskId}
                taskName={taskName}
                isConnected={isConnected}
                onSubmit={handleSubmit}
              />
            )}

            <EventsList />
          </div>
        </div>

        {/* Right side - Response details - scrollable */}
        <div className="w-1/2 flex flex-col overflow-hidden">
          <h3 className="text-lg font-medium mb-4 text-gray-800 dark:text-gray-200">
            Task Responses
          </h3>
          <TaskResponses taskId={taskId} />
        </div>
      </div>
    </div>
  );
};

export default TaskComponent;