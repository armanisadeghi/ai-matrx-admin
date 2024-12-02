// File Location: components/socket/recipes/RecipeSocketHeader.tsx
import React, {useState} from "react";
import {Wifi, WifiOff, Shield, ShieldOff, Radio} from 'lucide-react';
import {
    Input,
    Label,
    Switch,
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui';
import {
    AVAILABLE_NAMESPACES,
    AVAILABLE_SERVICES,
    SERVICE_EVENTS
} from '@/lib/redux/socket/constants/task-context';

interface StatusIndicatorProps {
    isActive: boolean;
    label: string;
    icon: {
        active: React.ReactNode;
        inactive: React.ReactNode;
    };
}

const StatusIndicator = ({isActive, label, icon}: StatusIndicatorProps) => (
    <div className="flex items-center space-x-2">
        <div className={`${isActive ? 'text-green-500' : 'text-red-500'}`}>
            {isActive ? icon.active : icon.inactive}
        </div>
        <span className="text-sm text-muted-foreground">{label}</span>
    </div>
);

interface RecipeSocketHeaderProps {
    namespace: string;
    event: string;
    streamEnabled: boolean;
    setNamespace: (value: string) => void;
    setEvent: (value: string) => void;
    setStreamEnabled: (value: boolean) => void;
    isConnected: boolean;
    isAuthenticated: boolean;
}

export function RecipeSocketHeader(
    {
        namespace,
        event,
        streamEnabled,
        setNamespace,
        setEvent,
        setStreamEnabled,
        isConnected,
        isAuthenticated
    }: RecipeSocketHeaderProps) {
    const [customNamespace, setCustomNamespace] = useState(false);
    const [customEvent, setCustomEvent] = useState(false);
    const [selectedService, setSelectedService] = useState('RecipeService');

    return (
        <div className="p-4 space-y-4 bg-card">
            <div className="flex flex-wrap gap-4 justify-between items-center">
                <div className="flex space-x-4">
                    <StatusIndicator
                        isActive={isConnected}
                        label="Connected"
                        icon={{
                            active: <Wifi className="h-4 w-4"/>,
                            inactive: <WifiOff className="h-4 w-4"/>
                        }}
                    />
                    <StatusIndicator
                        isActive={isAuthenticated}
                        label="Authenticated"
                        icon={{
                            active: <Shield className="h-4 w-4"/>,
                            inactive: <ShieldOff className="h-4 w-4"/>
                        }}
                    />
                    <StatusIndicator
                        isActive={streamEnabled}
                        label="Streaming"
                        icon={{
                            active: <Radio className="h-4 w-4"/>,
                            inactive: <Radio className="h-4 w-4"/>
                        }}
                    />
                </div>
                <div className="flex items-center space-x-2">
                    <Switch
                        checked={streamEnabled}
                        onCheckedChange={setStreamEnabled}
                    />
                    <Label>Enable Streaming</Label>
                </div>
            </div>

            <div className="grid md:grid-cols-3 gap-4">
                <div className="space-y-2">
                    <Label>Namespace</Label>
                    {customNamespace ? (
                        <Input
                            value={namespace}
                            onChange={(e) => setNamespace(e.target.value)}
                            className="mt-1"
                        />
                    ) : (
                         <Select
                             value={namespace}
                             onValueChange={(value) => {
                                 if (value === 'custom') {
                                     setCustomNamespace(true);
                                 } else {
                                     setNamespace(value);
                                 }
                             }}
                         >
                             <SelectTrigger>
                                 <SelectValue placeholder="Select namespace..."/>
                             </SelectTrigger>
                             <SelectContent>
                                 {Object.entries(AVAILABLE_NAMESPACES).map(([key, label]) => (
                                     <SelectItem key={key} value={key}>
                                         {label}
                                     </SelectItem>
                                 ))}
                             </SelectContent>
                         </Select>
                     )}
                </div>

                <div className="space-y-2">
                    <Label>Service</Label>
                    <Select
                        value={selectedService}
                        onValueChange={setSelectedService}
                    >
                        <SelectTrigger>
                            <SelectValue placeholder="Select service..."/>
                        </SelectTrigger>
                        <SelectContent>
                            {Object.entries(AVAILABLE_SERVICES).map(([key, label]) => (
                                <SelectItem key={key} value={key}>
                                    {label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-2">
                    <Label>Event</Label>
                    {customEvent ? (
                        <Input
                            value={event}
                            onChange={(e) => setEvent(e.target.value)}
                            className="mt-1"
                        />
                    ) : (
                         <Select
                             value={event}
                             onValueChange={(value) => {
                                 if (value === 'custom') {
                                     setCustomEvent(true);
                                 } else {
                                     setEvent(value);
                                 }
                             }}
                         >
                             <SelectTrigger>
                                 <SelectValue placeholder="Select event..."/>
                             </SelectTrigger>
                             <SelectContent>
                                 {SERVICE_EVENTS[selectedService as keyof typeof SERVICE_EVENTS]?.map((eventName) => (
                                     <SelectItem key={eventName} value={eventName}>
                                         {eventName}
                                     </SelectItem>
                                 ))}
                             </SelectContent>
                         </Select>
                     )}
                </div>
            </div>
        </div>
    );
}
