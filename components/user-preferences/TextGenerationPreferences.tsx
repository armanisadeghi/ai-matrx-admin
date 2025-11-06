import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RootState } from '@/lib/redux/store';
import { setPreference } from '@/lib/redux/slices/userPreferencesSlice';

const TextGenerationPreferences = () => {
    const dispatch = useDispatch();
    const textGenerationPreferences = useSelector((state: RootState) => state.userPreferences.textGeneration);

    const handleSwitchChange = (preference: string) => (checked: boolean) => {
        dispatch(setPreference({ module: 'textGeneration', preference, value: checked }));
    };

    const handleSelectChange = (preference: string) => (value: string) => {
        dispatch(setPreference({ module: 'textGeneration', preference, value }));
    };

    return (
        <div className="space-y-6">
            <div className="space-y-2">
                <Label htmlFor="defaultModel">Default Model</Label>
                <Select value={textGenerationPreferences.defaultModel} onValueChange={handleSelectChange('defaultModel')}>
                    <SelectTrigger id="defaultModel">
                        <SelectValue placeholder="Select a model" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="GPT-4o">GPT-4o</SelectItem>
                        <SelectItem value="GPT-4">GPT-4</SelectItem>
                        <SelectItem value="Claude-3">Claude 3</SelectItem>
                        <SelectItem value="Claude-3.5">Claude 3.5</SelectItem>
                        <SelectItem value="Gemini-Pro">Gemini Pro</SelectItem>
                        <SelectItem value="Llama-3">Llama 3</SelectItem>
                    </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground">
                    Default AI model for text generation
                </p>
            </div>

            <div className="space-y-2">
                <Label htmlFor="tone">Tone</Label>
                <Select value={textGenerationPreferences.tone} onValueChange={handleSelectChange('tone')}>
                    <SelectTrigger id="tone">
                        <SelectValue placeholder="Select tone" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="neutral">Neutral</SelectItem>
                        <SelectItem value="professional">Professional</SelectItem>
                        <SelectItem value="casual">Casual</SelectItem>
                        <SelectItem value="friendly">Friendly</SelectItem>
                        <SelectItem value="formal">Formal</SelectItem>
                        <SelectItem value="creative">Creative</SelectItem>
                        <SelectItem value="technical">Technical</SelectItem>
                        <SelectItem value="persuasive">Persuasive</SelectItem>
                    </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground">
                    Default tone for generated content
                </p>
            </div>

            <div className="space-y-2">
                <Label htmlFor="creativityLevel">Creativity Level</Label>
                <Select value={textGenerationPreferences.creativityLevel} onValueChange={handleSelectChange('creativityLevel')}>
                    <SelectTrigger id="creativityLevel">
                        <SelectValue placeholder="Select creativity level" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="low">Low (Factual)</SelectItem>
                        <SelectItem value="medium">Medium (Balanced)</SelectItem>
                        <SelectItem value="high">High (Creative)</SelectItem>
                    </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground">
                    Controls creativity vs. accuracy (temperature)
                </p>
            </div>

            <div className="space-y-2">
                <Label htmlFor="language">Language</Label>
                <Select value={textGenerationPreferences.language} onValueChange={handleSelectChange('language')}>
                    <SelectTrigger id="language">
                        <SelectValue placeholder="Select language" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="en">English</SelectItem>
                        <SelectItem value="es">Spanish</SelectItem>
                        <SelectItem value="fr">French</SelectItem>
                        <SelectItem value="de">German</SelectItem>
                        <SelectItem value="it">Italian</SelectItem>
                        <SelectItem value="pt">Portuguese</SelectItem>
                        <SelectItem value="zh">Chinese</SelectItem>
                        <SelectItem value="ja">Japanese</SelectItem>
                        <SelectItem value="ko">Korean</SelectItem>
                        <SelectItem value="ru">Russian</SelectItem>
                    </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground">
                    Default output language
                </p>
            </div>

            <div className="flex items-center justify-between">
                <div className="space-y-1">
                    <Label htmlFor="plagiarismCheckEnabled">Plagiarism Check</Label>
                    <p className="text-sm text-muted-foreground">Check generated content for originality</p>
                </div>
                <Switch
                    id="plagiarismCheckEnabled"
                    checked={textGenerationPreferences.plagiarismCheckEnabled}
                    onCheckedChange={handleSwitchChange('plagiarismCheckEnabled')}
                />
            </div>

            <div className="pt-4 border-t">
                <p className="text-sm text-muted-foreground">
                    Configure settings for AI-powered text generation and content creation.
                </p>
            </div>
        </div>
    );
};

export default TextGenerationPreferences;
