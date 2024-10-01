import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RootState } from '@/lib/redux/store';
import { setPreference } from '@/lib/redux/slices/userPreferencesSlice';

const DisplayPreferences = () => {
    const dispatch = useDispatch();
    const displayPreferences = useSelector((state: RootState) => state.userPreferences.display);

    const handleSwitchChange = (preference: string) => (checked: boolean) => {
        dispatch(setPreference({ module: 'display', preference, value: checked }));
    };

    const handleSelectChange = (preference: string) => (value: string) => {
        dispatch(setPreference({ module: 'display', preference, value }));
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <Label htmlFor="darkMode">Dark Mode</Label>
                <Switch
                    id="darkMode"
                    checked={displayPreferences.darkMode}
                    onCheckedChange={handleSwitchChange('darkMode')}
                />
            </div>
            <div className="space-y-2">
                <Label htmlFor="theme">Theme</Label>
                <Select value={displayPreferences.theme} onValueChange={handleSelectChange('theme')}>
                    <SelectTrigger id="theme">
                        <SelectValue placeholder="Select a theme" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="default">Default</SelectItem>
                        <SelectItem value="night">Night</SelectItem>
                        <SelectItem value="forest">Forest</SelectItem>
                    </SelectContent>
                </Select>
            </div>
            {/* Add more preference controls here */}
        </div>
    );
};

export default DisplayPreferences;