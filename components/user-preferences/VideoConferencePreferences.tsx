import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import type { RootState } from '@/lib/redux/store';
import { setPreference } from '@/lib/redux/slices/userPreferencesSlice';

const row = "flex items-center justify-between px-4 py-3.5 border-b border-border/40 last:border-b-0";
const rowLabel = "text-sm font-medium";

const VideoConferencePreferences = () => {
    const dispatch = useDispatch();
    const prefs = useSelector((state: RootState) => state.userPreferences.videoConference);
    const handle = (preference: string) => (value: string) => dispatch(setPreference({ module: 'videoConference', preference, value }));

    return (
        <div>
            <div className={row}>
                <Label htmlFor="background" className={rowLabel}>Background</Label>
                <Select value={prefs.background} onValueChange={handle('background')}>
                    <SelectTrigger id="background" className="w-36 h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="default">Default</SelectItem>
                        <SelectItem value="blur">Blur</SelectItem>
                        <SelectItem value="custom">Custom Image</SelectItem>
                        <SelectItem value="none">None</SelectItem>
                    </SelectContent>
                </Select>
            </div>
            <div className={row}>
                <Label htmlFor="filter" className={rowLabel}>Video Filter</Label>
                <Select value={prefs.filter} onValueChange={handle('filter')}>
                    <SelectTrigger id="filter" className="w-36 h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="default">Default</SelectItem>
                        <SelectItem value="none">None</SelectItem>
                        <SelectItem value="grayscale">Grayscale</SelectItem>
                        <SelectItem value="warm">Warm</SelectItem>
                        <SelectItem value="cool">Cool</SelectItem>
                        <SelectItem value="vivid">Vivid</SelectItem>
                    </SelectContent>
                </Select>
            </div>
            <div className={row}>
                <Label htmlFor="defaultCamera" className={rowLabel}>Camera</Label>
                <Select value={prefs.defaultCamera} onValueChange={handle('defaultCamera')}>
                    <SelectTrigger id="defaultCamera" className="w-36 h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="default">System Default</SelectItem>
                        <SelectItem value="front">Front</SelectItem>
                        <SelectItem value="rear">Rear</SelectItem>
                        <SelectItem value="external">External</SelectItem>
                    </SelectContent>
                </Select>
            </div>
            <div className={row}>
                <Label htmlFor="defaultMicrophone" className={rowLabel}>Microphone</Label>
                <Select value={prefs.defaultMicrophone} onValueChange={handle('defaultMicrophone')}>
                    <SelectTrigger id="defaultMicrophone" className="w-36 h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="default">System Default</SelectItem>
                        <SelectItem value="builtin">Built-in</SelectItem>
                        <SelectItem value="external">External</SelectItem>
                        <SelectItem value="headset">Headset</SelectItem>
                    </SelectContent>
                </Select>
            </div>
            <div className={row}>
                <Label htmlFor="defaultSpeaker" className={rowLabel}>Speaker</Label>
                <Select value={prefs.defaultSpeaker} onValueChange={handle('defaultSpeaker')}>
                    <SelectTrigger id="defaultSpeaker" className="w-36 h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="default">System Default</SelectItem>
                        <SelectItem value="builtin">Built-in</SelectItem>
                        <SelectItem value="external">External</SelectItem>
                        <SelectItem value="headset">Headset</SelectItem>
                    </SelectContent>
                </Select>
            </div>
            <div className={row}>
                <Label htmlFor="defaultMeetingType" className={rowLabel}>Meeting Type</Label>
                <Select value={prefs.defaultMeetingType} onValueChange={handle('defaultMeetingType')}>
                    <SelectTrigger id="defaultMeetingType" className="w-36 h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="default">Default</SelectItem>
                        <SelectItem value="video">Video Call</SelectItem>
                        <SelectItem value="audio">Audio Only</SelectItem>
                        <SelectItem value="screen-share">Screen Share</SelectItem>
                        <SelectItem value="webinar">Webinar</SelectItem>
                    </SelectContent>
                </Select>
            </div>
            <div className={row}>
                <Label htmlFor="defaultLayout" className={rowLabel}>Layout</Label>
                <Select value={prefs.defaultLayout} onValueChange={handle('defaultLayout')}>
                    <SelectTrigger id="defaultLayout" className="w-36 h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="default">Default</SelectItem>
                        <SelectItem value="grid">Grid</SelectItem>
                        <SelectItem value="speaker">Speaker</SelectItem>
                        <SelectItem value="gallery">Gallery</SelectItem>
                        <SelectItem value="spotlight">Spotlight</SelectItem>
                    </SelectContent>
                </Select>
            </div>
            <div className={row}>
                <Label htmlFor="defaultNotesType" className={rowLabel}>Meeting Notes</Label>
                <Select value={prefs.defaultNotesType} onValueChange={handle('defaultNotesType')}>
                    <SelectTrigger id="defaultNotesType" className="w-36 h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="default">Default</SelectItem>
                        <SelectItem value="transcript">Transcript</SelectItem>
                        <SelectItem value="summary">AI Summary</SelectItem>
                        <SelectItem value="action-items">Action Items</SelectItem>
                        <SelectItem value="manual">Manual</SelectItem>
                    </SelectContent>
                </Select>
            </div>
            <div className={row}>
                <Label htmlFor="AiActivityLevel" className={rowLabel}>AI Activity</Label>
                <Select value={prefs.AiActivityLevel} onValueChange={handle('AiActivityLevel')}>
                    <SelectTrigger id="AiActivityLevel" className="w-36 h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="default">Default</SelectItem>
                        <SelectItem value="off">Off</SelectItem>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                    </SelectContent>
                </Select>
            </div>
        </div>
    );
};

export default VideoConferencePreferences;
