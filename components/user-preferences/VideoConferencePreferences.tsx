import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RootState } from '@/lib/redux/store';
import { setPreference } from '@/lib/redux/slices/userPreferencesSlice';
import { Label } from "@/components/ui/label";

const VideoConferencePreferences = () => {
    const dispatch = useDispatch();
    const videoConferencePreferences = useSelector((state: RootState) => state.userPreferences.videoConference);

    const handleSelectChange = (preference: string) => (value: string) => {
        dispatch(setPreference({ module: 'videoConference', preference, value }));
    };

    return (
        <div className="space-y-6">
            <div className="space-y-2">
                <Label htmlFor="background">Background</Label>
                <Select value={videoConferencePreferences.background} onValueChange={handleSelectChange('background')}>
                    <SelectTrigger id="background">
                        <SelectValue placeholder="Select a background" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="default">Default</SelectItem>
                        <SelectItem value="blur">Blur</SelectItem>
                    </SelectContent>
                </Select>
            </div>
            <div className="space-y-2">
                <Label htmlFor="filter">Filter</Label>
                <Select value={videoConferencePreferences.filter} onValueChange={handleSelectChange('filter')}>
                    <SelectTrigger id="filter">
                        <SelectValue placeholder="Select a filter" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        <SelectItem value="grayscale">Grayscale</SelectItem>
                    </SelectContent>
                </Select>
            </div>
            {/* Add more controls such as defaultCamera, defaultMicrophone, etc. */}
        </div>
    );
};

export default VideoConferencePreferences;
