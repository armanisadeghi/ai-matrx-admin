import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { RootState, useAppDispatch } from '@/lib/redux';
import { setPreference } from '@/lib/redux/slices/userPreferencesSlice';
import { 
    playNotificationSound, 
    requestNotificationPermission,
    getNotificationPermission,
    isNotificationSupported 
} from '@/features/messaging/utils/notificationSound';
import { Volume2, Bell, BellRing, BellOff, Info } from 'lucide-react';

const MessagingPreferences = () => {
    const dispatch = useAppDispatch();
    const messaging = useSelector((state: RootState) => state.userPreferences.messaging);
    const [notificationStatus, setNotificationStatus] = useState<'granted' | 'denied' | 'default' | 'unsupported'>('default');

    // Check notification permission status on mount
    useEffect(() => {
        setNotificationStatus(getNotificationPermission());
    }, []);

    const handleSwitchChange = (preference: string) => (checked: boolean) => {
        dispatch(setPreference({ module: 'messaging', preference, value: checked }));
    };

    const handleVolumeChange = (value: number[]) => {
        dispatch(setPreference({ module: 'messaging', preference: 'notificationVolume', value: value[0] }));
    };

    const handleTestSound = () => {
        playNotificationSound(messaging.notificationVolume);
    };

    const handleEnableDesktopNotifications = async () => {
        const granted = await requestNotificationPermission();
        setNotificationStatus(getNotificationPermission());
        if (granted) {
            dispatch(setPreference({ module: 'messaging', preference: 'showDesktopNotifications', value: true }));
        }
    };

    const handleDisableDesktopNotifications = () => {
        dispatch(setPreference({ module: 'messaging', preference: 'showDesktopNotifications', value: false }));
    };

    return (
        <div className="space-y-6">
            <div className="grid gap-6">
                {/* Notification Sound Toggle */}
                <div className="flex items-center justify-between">
                    <div className="space-y-1">
                        <Label htmlFor="notificationSoundEnabled" className="flex items-center gap-2">
                            <Volume2 className="h-4 w-4" />
                            Notification Sound
                        </Label>
                        <p className="text-sm text-muted-foreground">
                            Play a sound when you receive a new message
                        </p>
                    </div>
                    <Switch
                        id="notificationSoundEnabled"
                        checked={messaging.notificationSoundEnabled}
                        onCheckedChange={handleSwitchChange('notificationSoundEnabled')}
                    />
                </div>

                {/* Volume Slider - only shown when sounds are enabled */}
                {messaging.notificationSoundEnabled && (
                    <div className="space-y-3 pl-6 border-l-2 border-muted">
                        <div className="flex items-center justify-between">
                            <Label htmlFor="notificationVolume">Volume</Label>
                            <span className="text-sm text-muted-foreground">{messaging.notificationVolume}%</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <Slider
                                id="notificationVolume"
                                value={[messaging.notificationVolume]}
                                onValueChange={handleVolumeChange}
                                max={100}
                                min={0}
                                step={5}
                                className="flex-1"
                            />
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleTestSound}
                                className="shrink-0"
                            >
                                Test
                            </Button>
                        </div>
                        <p className="text-xs text-muted-foreground">
                            No browser permission required for sounds
                        </p>
                    </div>
                )}

                {/* Desktop Notifications Section */}
                <div className="pt-4 border-t">
                    <div className="flex items-center justify-between">
                        <div className="space-y-1">
                            <Label htmlFor="showDesktopNotifications" className="flex items-center gap-2">
                                <BellRing className="h-4 w-4" />
                                Desktop Notifications
                            </Label>
                            <p className="text-sm text-muted-foreground">
                                Show browser notifications when you're on another tab
                            </p>
                        </div>
                        
                        {/* Show different UI based on permission status */}
                        {notificationStatus === 'unsupported' ? (
                            <span className="text-sm text-muted-foreground">Not supported</span>
                        ) : notificationStatus === 'denied' ? (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <BellOff className="h-4 w-4" />
                                Blocked
                            </div>
                        ) : notificationStatus === 'granted' ? (
                            <Switch
                                id="showDesktopNotifications"
                                checked={messaging.showDesktopNotifications}
                                onCheckedChange={handleDisableDesktopNotifications}
                            />
                        ) : (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleEnableDesktopNotifications}
                            >
                                <Bell className="h-4 w-4 mr-2" />
                                Enable
                            </Button>
                        )}
                    </div>

                    {/* Show helper text for denied state */}
                    {notificationStatus === 'denied' && (
                        <Alert className="mt-3">
                            <Info className="h-4 w-4" />
                            <AlertDescription>
                                Notifications are blocked by your browser. To enable them, click the lock icon 
                                in your browser's address bar and allow notifications for this site.
                            </AlertDescription>
                        </Alert>
                    )}
                </div>
            </div>
        </div>
    );
};

export default MessagingPreferences;
