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
                        <SelectItem value="custom">Custom Image</SelectItem>
                        <SelectItem value="none">None</SelectItem>
                    </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground">
                    Background setting for video calls
                </p>
            </div>

            <div className="space-y-2">
                <Label htmlFor="filter">Video Filter</Label>
                <Select value={videoConferencePreferences.filter} onValueChange={handleSelectChange('filter')}>
                    <SelectTrigger id="filter">
                        <SelectValue placeholder="Select a filter" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="default">Default</SelectItem>
                        <SelectItem value="none">None</SelectItem>
                        <SelectItem value="grayscale">Grayscale</SelectItem>
                        <SelectItem value="warm">Warm</SelectItem>
                        <SelectItem value="cool">Cool</SelectItem>
                        <SelectItem value="vivid">Vivid</SelectItem>
                    </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground">
                    Apply visual filter to your video feed
                </p>
            </div>

            <div className="space-y-2">
                <Label htmlFor="defaultCamera">Default Camera</Label>
                <Select value={videoConferencePreferences.defaultCamera} onValueChange={handleSelectChange('defaultCamera')}>
                    <SelectTrigger id="defaultCamera">
                        <SelectValue placeholder="Select default camera" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="default">System Default</SelectItem>
                        <SelectItem value="front">Front Camera</SelectItem>
                        <SelectItem value="rear">Rear Camera</SelectItem>
                        <SelectItem value="external">External Camera</SelectItem>
                    </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground">
                    Default camera device for video calls
                </p>
            </div>

            <div className="space-y-2">
                <Label htmlFor="defaultMicrophone">Default Microphone</Label>
                <Select value={videoConferencePreferences.defaultMicrophone} onValueChange={handleSelectChange('defaultMicrophone')}>
                    <SelectTrigger id="defaultMicrophone">
                        <SelectValue placeholder="Select default microphone" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="default">System Default</SelectItem>
                        <SelectItem value="builtin">Built-in Microphone</SelectItem>
                        <SelectItem value="external">External Microphone</SelectItem>
                        <SelectItem value="headset">Headset Microphone</SelectItem>
                    </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground">
                    Default microphone device for audio input
                </p>
            </div>

            <div className="space-y-2">
                <Label htmlFor="defaultSpeaker">Default Speaker</Label>
                <Select value={videoConferencePreferences.defaultSpeaker} onValueChange={handleSelectChange('defaultSpeaker')}>
                    <SelectTrigger id="defaultSpeaker">
                        <SelectValue placeholder="Select default speaker" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="default">System Default</SelectItem>
                        <SelectItem value="builtin">Built-in Speakers</SelectItem>
                        <SelectItem value="external">External Speakers</SelectItem>
                        <SelectItem value="headset">Headset</SelectItem>
                    </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground">
                    Default speaker device for audio output
                </p>
            </div>

            <div className="space-y-2">
                <Label htmlFor="defaultMeetingType">Default Meeting Type</Label>
                <Select value={videoConferencePreferences.defaultMeetingType} onValueChange={handleSelectChange('defaultMeetingType')}>
                    <SelectTrigger id="defaultMeetingType">
                        <SelectValue placeholder="Select meeting type" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="default">Default</SelectItem>
                        <SelectItem value="video">Video Call</SelectItem>
                        <SelectItem value="audio">Audio Only</SelectItem>
                        <SelectItem value="screen-share">Screen Share</SelectItem>
                        <SelectItem value="webinar">Webinar</SelectItem>
                    </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground">
                    Default type when creating new meetings
                </p>
            </div>

            <div className="space-y-2">
                <Label htmlFor="defaultLayout">Default Layout</Label>
                <Select value={videoConferencePreferences.defaultLayout} onValueChange={handleSelectChange('defaultLayout')}>
                    <SelectTrigger id="defaultLayout">
                        <SelectValue placeholder="Select layout" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="default">Default</SelectItem>
                        <SelectItem value="grid">Grid View</SelectItem>
                        <SelectItem value="speaker">Speaker View</SelectItem>
                        <SelectItem value="gallery">Gallery View</SelectItem>
                        <SelectItem value="spotlight">Spotlight</SelectItem>
                    </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground">
                    Default layout for viewing participants
                </p>
            </div>

            <div className="space-y-2">
                <Label htmlFor="defaultNotesType">Default Notes Type</Label>
                <Select value={videoConferencePreferences.defaultNotesType} onValueChange={handleSelectChange('defaultNotesType')}>
                    <SelectTrigger id="defaultNotesType">
                        <SelectValue placeholder="Select notes type" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="default">Default</SelectItem>
                        <SelectItem value="transcript">Auto Transcript</SelectItem>
                        <SelectItem value="summary">AI Summary</SelectItem>
                        <SelectItem value="action-items">Action Items</SelectItem>
                        <SelectItem value="manual">Manual Notes</SelectItem>
                    </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground">
                    How meeting notes should be captured
                </p>
            </div>

            <div className="space-y-2">
                <Label htmlFor="AiActivityLevel">AI Activity Level</Label>
                <Select value={videoConferencePreferences.AiActivityLevel} onValueChange={handleSelectChange('AiActivityLevel')}>
                    <SelectTrigger id="AiActivityLevel">
                        <SelectValue placeholder="Select AI activity level" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="default">Default</SelectItem>
                        <SelectItem value="off">Off</SelectItem>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                    </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground">
                    Level of AI assistance during video conferences
                </p>
            </div>

            <div className="pt-4 border-t">
                <p className="text-sm text-muted-foreground">
                    Configure your video conferencing preferences for meetings and calls.
                </p>
            </div>
        </div>
    );
};

export default VideoConferencePreferences;
