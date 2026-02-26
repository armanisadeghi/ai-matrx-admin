import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { RootState } from '@/lib/redux/store';
import { setPreference } from '@/lib/redux/slices/userPreferencesSlice';

const rowLabel = "text-sm font-medium";

const PlaygroundPreferences = () => {
    const dispatch = useDispatch();
    const prefs = useSelector((state: RootState) => state.userPreferences.playground);
    const handleInput = (preference: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
        dispatch(setPreference({ module: 'playground', preference, value: e.target.value }));
    };

    return (
        <div className="space-y-0">
            <div className="px-4 py-3.5 border-b border-border/40 space-y-1.5">
                <Label htmlFor="lastRecipeId" className={rowLabel}>Last Recipe ID</Label>
                <Input id="lastRecipeId" type="text" value={prefs.lastRecipeId} onChange={handleInput('lastRecipeId')} placeholder="Last used recipe" readOnly className="h-9 text-sm bg-muted" />
            </div>
            <div className="px-4 py-3.5 border-b border-border/40 space-y-1.5">
                <Label htmlFor="preferredProvider" className={rowLabel}>Preferred Provider</Label>
                <Input id="preferredProvider" type="text" value={prefs.preferredProvider} onChange={handleInput('preferredProvider')} placeholder="Preferred provider ID" className="h-9 text-sm" />
            </div>
            <div className="px-4 py-3.5 border-b border-border/40 space-y-1.5">
                <Label htmlFor="preferredModel" className={rowLabel}>Preferred Model</Label>
                <Input id="preferredModel" type="text" value={prefs.preferredModel} onChange={handleInput('preferredModel')} placeholder="Preferred model ID" className="h-9 text-sm" />
            </div>
            <div className="px-4 py-3.5 border-b border-border/40 space-y-1.5">
                <Label htmlFor="preferredEndpoint" className={rowLabel}>Preferred Endpoint</Label>
                <Input id="preferredEndpoint" type="text" value={prefs.preferredEndpoint} onChange={handleInput('preferredEndpoint')} placeholder="Preferred endpoint ID" className="h-9 text-sm" />
            </div>
        </div>
    );
};

export default PlaygroundPreferences;
