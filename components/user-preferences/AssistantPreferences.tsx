import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { RootState } from '@/lib/redux/store';
import { setPreference } from '@/lib/redux/slices/userPreferencesSlice';

const AssistantPreferences = () => {
    const dispatch = useDispatch();
    const assistantPreferences = useSelector((state: RootState) => state.userPreferences.assistant);

    const handleSwitchChange = (preference: string) => (checked: boolean) => {
        dispatch(setPreference({ module: 'assistant', preference, value: checked }));
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <Label htmlFor="alwaysActive">Always Active</Label>
                <Switch
                    id="alwaysActive"
                    checked={assistantPreferences.alwaysActive}
                    onCheckedChange={handleSwitchChange('alwaysActive')}
                />
            </div>
            <div className="flex items-center justify-between">
                <Label htmlFor="alwaysWatching">Always Watching</Label>
                <Switch
                    id="alwaysWatching"
                    checked={assistantPreferences.alwaysWatching}
                    onCheckedChange={handleSwitchChange('alwaysWatching')}
                />
            </div>
            {/* Add more controls for useAudio, name, isPersonal, etc. */}
        </div>
    );
};

export default AssistantPreferences;
