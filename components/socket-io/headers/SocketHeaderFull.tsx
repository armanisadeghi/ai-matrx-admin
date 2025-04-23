"use client";

import React, { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Wifi, WifiOff, Shield, ShieldOff, Radio, CheckCircle, XCircle } from "lucide-react";
import { Input, Label, Switch, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Button } from "@/components/ui";
import { getAvailableServices, getTasksForService, getAvailableNamespaces } from "@/constants/socket-schema";
import { FiRefreshCw } from "react-icons/fi";
import {
  selectIsConnected,
  selectIsAuthenticated,
  selectNamespace,
  selectSocketUrl,
  selectPrimaryConnectionId,
} from "@/lib/redux/socket-io/selectors";
import {
  changeConnectionUrl,
  changeNamespace,
  disconnectConnection,
  addConnection,
} from "@/lib/redux/socket-io/slices/socketConnectionsSlice";
import { RootState } from "@/lib/redux/store";

interface SocketHeaderProps {
  testMode?: boolean;
  onTestModeChange?: (testMode: boolean) => void;
}

interface StatusIndicatorProps {
  isActive: boolean;
  label: string;
  icon: {
    active: React.ReactNode;
    inactive: React.ReactNode;
  };
}

// Placeholder StatusIndicator component (replace with your actual implementation)
const StatusIndicator: React.FC<StatusIndicatorProps> = ({ isActive, label, icon }) => (
  <div className="flex items-center space-x-1">
    {isActive ? icon.active : icon.inactive}
    <span>{label}</span>
  </div>
);

export function SocketHeaderFull({ testMode=false, onTestModeChange=()=>{} }: SocketHeaderProps) {
  const dispatch = useDispatch();

  // Selectors for Redux state
  const isConnected = useSelector((state: RootState) => selectIsConnected(state));
  const isAuthenticated = useSelector((state: RootState) => selectIsAuthenticated(state));
  const currentNamespace = useSelector((state: RootState) => selectNamespace(state));
  const currentUrl = useSelector((state: RootState) => selectSocketUrl(state));
  const primaryConnectionId = useSelector((state: RootState) => selectPrimaryConnectionId(state));

  // Local state
  const [streamEnabled, setStreamEnabled] = useState(false); // Placeholder: replace with Redux if managed
  const [isResponseActive, setIsResponseActive] = useState(false); // Placeholder: replace with Redux if managed
  const [namespace, setNamespace] = useState(currentNamespace || "/UserSession");
  const [customNamespace, setCustomNamespace] = useState(false);
  const [customNamespaceValue, setCustomNamespaceValue] = useState("");
  const [selectedServer, setSelectedServer] = useState(currentUrl || "");
  const [service, setService] = useState("");
  const [taskType, setTaskType] = useState("");

  // Available servers (adjust as needed based on your constants)
  const availableServers = [
    "https://server.app.matrxserver.com",
    "https://gpu.app.matrxserver.com",
    "http://localhost:8000",
  ];

  // Sync local state with Redux state
  useEffect(() => {
    setNamespace(currentNamespace);
    setSelectedServer(currentUrl);
  }, [currentNamespace, currentUrl]);

  // Handle namespace change
  const handleNamespaceChange = (value: string) => {
    if (value === "custom") {
      setCustomNamespace(true);
      setCustomNamespaceValue("");
    } else {
      setCustomNamespace(false);
      setNamespace(value);
      dispatch(changeNamespace({ connectionId: primaryConnectionId, namespace: value }));
    }
  };

  // Handle custom namespace submission
  const handleCustomNamespaceSubmit = () => {
    if (customNamespaceValue) {
      setNamespace(customNamespaceValue);
      setCustomNamespace(false);
      dispatch(
        changeNamespace({ connectionId: primaryConnectionId, namespace: customNamespaceValue })
      );
    }
  };

  // Handle server change
  const handleServerChange = (value: string) => {
    setSelectedServer(value);
    dispatch(changeConnectionUrl({ connectionId: primaryConnectionId, url: value }));
  };

  // Handle reset
  const handleReset = () => {
    setSelectedServer("https://server.app.matrxserver.com");
    setNamespace("/UserSession");
    setCustomNamespace(false);
    setCustomNamespaceValue("");
    dispatch(
      changeConnectionUrl({
        connectionId: primaryConnectionId,
        url: "https://server.app.matrxserver.com",
      })
    );
    dispatch(changeNamespace({ connectionId: primaryConnectionId, namespace: "/UserSession" }));
  };

  return (
    <div className="p-4 pb-6 space-y-4 bg-gray-200 dark:bg-gray-900 border-3 border-gray-300 dark:border-gray-600 rounded-3xl">
      <div className="flex flex-wrap gap-4 justify-between items-center">
        <div className="flex space-x-3">
          <h3 className="text-lg font-bold pr-4">Matrx Admin Socket.IO Tester</h3>
          <StatusIndicator
            isActive={isConnected}
            label="Connected"
            icon={{
              active: <Wifi className="h-4 w-4" />,
              inactive: <WifiOff className="h-4 w-4" />,
            }}
          />
          <StatusIndicator
            isActive={isAuthenticated}
            label="Authenticated"
            icon={{
              active: <Shield className="h-4 w-4" />,
              inactive: <ShieldOff className="h-4 w-4" />,
            }}
          />
          <StatusIndicator
            isActive={streamEnabled}
            label="Stream Enabled"
            icon={{
              active: <Radio className="h-4 w-4" />,
              inactive: <Radio className="h-4 w-4" />,
            }}
          />
          <StatusIndicator
            isActive={isResponseActive}
            label="Response Active"
            icon={{
              active: <CheckCircle className="h-4 w-4" />,
              inactive: <XCircle className="h-4 w-4" />,
            }}
          />
        </div>
        <div className="flex items-center space-x-4">
          <Switch checked={streamEnabled} onCheckedChange={setStreamEnabled} />
          <Label>Streaming</Label>
          <Switch checked={testMode} onCheckedChange={onTestModeChange} />
          <Label>Test Mode</Label>
          <Button
            onClick={handleReset}
            disabled={namespace === "/UserSession" && selectedServer === "https://server.app.matrxserver.com"}
            variant="ghost"
          >
            <FiRefreshCw className="h-4 w-4" />
            Reset
          </Button>
        </div>
      </div>

      <div className="grid md:grid-cols-4 gap-3">
        {/* Namespace Selection */}
        <div>
          {customNamespace ? (
            <div className="flex space-x-2">
              <Input
                value={customNamespaceValue}
                onChange={(e) => setCustomNamespaceValue(e.target.value)}
                placeholder="Enter namespace (e.g., /CustomNamespace)"
              />
              <Button onClick={handleCustomNamespaceSubmit} disabled={!customNamespaceValue}>
                Apply
              </Button>
              <Button
                onClick={handleReset}
                disabled={namespace === "/UserSession" && selectedServer === "https://server.app.matrxserver.com"}
                variant="ghost"
              >
                <FiRefreshCw className="h-4 w-4" />
                Reset
              </Button>
            </div>
          ) : (
            <Select value={namespace} onValueChange={handleNamespaceChange}>
              <SelectTrigger className="bg-gray-200 dark:bg-gray-900 border-1 border-gray-400 dark:border-gray-500 rounded-3xl">
                <SelectValue placeholder="Select a namespace..." />
              </SelectTrigger>
              <SelectContent>
                {getAvailableNamespaces().map(({ value, label }, index) => (
                  <SelectItem
                    key={`${value}-${index}`}
                    value={value}
                    className="bg-gray-200 dark:bg-gray-900 hover:bg-gray-300 dark:hover:bg-gray-800 cursor-pointer"
                  >
                    {label}
                  </SelectItem>
                ))}
                <SelectItem
                  value="custom"
                  className="bg-gray-200 dark:bg-gray-900 hover:bg-gray-300 dark:hover:bg-gray-800 cursor-pointer"
                >
                  Custom
                </SelectItem>
              </SelectContent>
            </Select>
          )}
        </div>

        {/* Server Selection */}
        <div>
          <Select value={selectedServer || ""} onValueChange={handleServerChange}>
            <SelectTrigger className="bg-gray-200 dark:bg-gray-900 border-1 border-gray-400 dark:border-gray-500 rounded-3xl">
              <SelectValue placeholder="Select a server..." />
            </SelectTrigger>
            <SelectContent>
              {availableServers.map((server, index) => (
                <SelectItem
                  key={`${server}-${index}`}
                  value={server}
                  className="bg-gray-200 dark:bg-gray-900 hover:bg-gray-300 dark:hover:bg-gray-800 cursor-pointer"
                >
                  {server}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Service Selection */}
        <div>
          <Select
            value={service}
            onValueChange={(value) => {
              setService(value);
              setTaskType(""); // Reset task type when service changes
            }}
          >
            <SelectTrigger className="bg-gray-200 dark:bg-gray-900 border-1 border-gray-400 dark:border-gray-500 rounded-3xl">
              <SelectValue placeholder="Select a service..." />
            </SelectTrigger>
            <SelectContent>
              {getAvailableServices().map(({ value, label }) => (
                <SelectItem
                  key={value}
                  value={value}
                  className="bg-gray-200 dark:bg-gray-900 hover:bg-gray-300 dark:hover:bg-gray-800 cursor-pointer"
                >
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Task Type Selection */}
        <div>
          <Select value={taskType} onValueChange={setTaskType} disabled={!service}>
            <SelectTrigger className="bg-gray-200 dark:bg-gray-900 border-1 border-gray-400 dark:border-gray-500 rounded-3xl">
              <SelectValue placeholder={service ? "Select a task type..." : "Select service first"} />
            </SelectTrigger>
            <SelectContent>
              {getTasksForService(service).map(({ value, label }) => (
                <SelectItem
                  key={`${service}-${value}`}
                  value={value}
                  className="bg-gray-200 dark:bg-gray-900 hover:bg-gray-300 dark:hover:bg-gray-800 cursor-pointer"
                >
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}