import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { RootState } from '@/lib/redux/store';
import { setPreference } from '@/lib/redux/slices/userPreferencesSlice';

const PlaygroundPreferences = () => {
    const dispatch = useDispatch();
    const playgroundPreferences = useSelector((state: RootState) => state.userPreferences.playground);

    const handleInputChange = (preference: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
        dispatch(setPreference({ module: 'playground', preference, value: e.target.value }));
    };

    return (
        <div className="space-y-6">
            <div className="space-y-2">
                <Label htmlFor="lastRecipeId">Last Recipe ID</Label>
                <Input
                    id="lastRecipeId"
                    type="text"
                    value={playgroundPreferences.lastRecipeId}
                    onChange={handleInputChange('lastRecipeId')}
                    placeholder="Last used recipe"
                    readOnly
                    className="bg-muted"
                />
                <p className="text-sm text-muted-foreground">
                    ID of the last recipe used in playground (auto-set)
                </p>
            </div>

            <div className="space-y-2">
                <Label htmlFor="preferredProvider">Preferred Provider</Label>
                <Input
                    id="preferredProvider"
                    type="text"
                    value={playgroundPreferences.preferredProvider}
                    onChange={handleInputChange('preferredProvider')}
                    placeholder="Preferred provider ID"
                />
                <p className="text-sm text-muted-foreground">
                    Default AI provider for playground experiments
                </p>
            </div>

            <div className="space-y-2">
                <Label htmlFor="preferredModel">Preferred Model</Label>
                <Input
                    id="preferredModel"
                    type="text"
                    value={playgroundPreferences.preferredModel}
                    onChange={handleInputChange('preferredModel')}
                    placeholder="Preferred model ID"
                />
                <p className="text-sm text-muted-foreground">
                    Default AI model for playground experiments
                </p>
            </div>

            <div className="space-y-2">
                <Label htmlFor="preferredEndpoint">Preferred Endpoint</Label>
                <Input
                    id="preferredEndpoint"
                    type="text"
                    value={playgroundPreferences.preferredEndpoint}
                    onChange={handleInputChange('preferredEndpoint')}
                    placeholder="Preferred endpoint ID"
                />
                <p className="text-sm text-muted-foreground">
                    Default API endpoint for playground experiments
                </p>
            </div>

            <div className="pt-4 border-t">
                <p className="text-sm text-muted-foreground">
                    Configure preferences for the AI Playground where you can test and experiment with different models and settings.
                </p>
            </div>
        </div>
    );
};

export default PlaygroundPreferences;

