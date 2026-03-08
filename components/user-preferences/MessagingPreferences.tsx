import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { RootState } from "@/lib/redux/store";
import { useAppDispatch } from "@/lib/redux/hooks";
import { setPreference } from '@/lib/redux/slices/userPreferencesSlice';
import {
    playNotificationSound,
    requestNotificationPermission,
    getNotificationPermission,
    isNotificationSupported,
} from '@/features/messaging/utils/notificationSound';
import { Volume2, Bell, BellRing, BellOff, Info } from 'lucide-react';

const row = "flex items-center justify-between px-4 py-3.5 border-b border-border/40 last:border-b-0";
const rowLabel = "text-sm font-medium";

const MessagingPreferences = () => {
    const dispatch = useAppDispatch();
    const messaging = useSelector((state: RootState) => state.userPreferences.messaging);
    const [notificationStatus, setNotificationStatus] = useState<'granted' | 'denied' | 'default' | 'unsupported'>('default');

    useEffect(() => { setNotificationStatus(getNotificationPermission()); }, []);

    const handleSwitchChange = (preference: string) => (checked: boolean) => {
        dispatch(setPreference({ module: 'messaging', preference, value: checked }));
    };
    const handleVolumeChange = (value: number[]) => {
        dispatch(setPreference({ module: 'messaging', preference: 'notificationVolume', value: value[0] }));
    };
    const handleTestSound = () => playNotificationSound(messaging.notificationVolume);
    const handleEnableDesktopNotifications = async () => {
        const granted = await requestNotificationPermission();
        setNotificationStatus(getNotificationPermission());
        if (granted) dispatch(setPreference({ module: 'messaging', preference: 'showDesktopNotifications', value: true }));
    };
    const handleDisableDesktopNotifications = () => {
        dispatch(setPreference({ module: 'messaging', preference: 'showDesktopNotifications', value: false }));
    };

    return (
        <div>
            <div className={row}>
                <Label htmlFor="notificationSoundEnabled" className={rowLabel}>Notification Sound</Label>
                <Switch id="notificationSoundEnabled" checked={messaging.notificationSoundEnabled} onCheckedChange={handleSwitchChange('notificationSoundEnabled')} />
            </div>

            {messaging.notificationSoundEnabled && (
                <div className="px-4 py-3.5 border-b border-border/40 space-y-2">
                    <div className="flex items-center justify-between">
                        <Label htmlFor="notificationVolume" className={rowLabel}>Volume</Label>
                        <span className="text-xs text-muted-foreground">{messaging.notificationVolume}%</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <Slider id="notificationVolume" value={[messaging.notificationVolume]} onValueChange={handleVolumeChange} max={100} min={0} step={5} className="flex-1" />
                        <Button variant="outline" size="sm" onClick={handleTestSound} className="shrink-0 h-8 text-xs">Test</Button>
                    </div>
                </div>
            )}

            <div className={row}>
                <Label className={rowLabel}>Desktop Notifications</Label>
                {notificationStatus === 'unsupported' ? (
                    <span className="text-xs text-muted-foreground">Not supported</span>
                ) : notificationStatus === 'denied' ? (
                    <span className="flex items-center gap-1 text-xs text-muted-foreground"><BellOff className="h-3.5 w-3.5" />Blocked</span>
                ) : notificationStatus === 'granted' ? (
                    <Switch id="showDesktopNotifications" checked={messaging.showDesktopNotifications} onCheckedChange={handleDisableDesktopNotifications} />
                ) : (
                    <Button variant="outline" size="sm" onClick={handleEnableDesktopNotifications} className="h-8 text-xs gap-1">
                        <Bell className="h-3.5 w-3.5" />Enable
                    </Button>
                )}
            </div>

            {notificationStatus === 'denied' && (
                <div className="px-4 pb-3">
                    <Alert>
                        <Info className="h-4 w-4" />
                        <AlertDescription className="text-xs">
                            Notifications are blocked. Click the lock icon in your browser's address bar to allow them.
                        </AlertDescription>
                    </Alert>
                </div>
            )}
        </div>
    );
};

export default MessagingPreferences;
