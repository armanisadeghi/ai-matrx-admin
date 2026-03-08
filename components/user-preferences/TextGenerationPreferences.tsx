import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { RootState } from '@/lib/redux/store';
import { setPreference } from '@/lib/redux/slices/userPreferencesSlice';

const row = "flex items-center justify-between px-4 py-3.5 border-b border-border/40 last:border-b-0";
const rowLabel = "text-sm font-medium";

const TextGenerationPreferences = () => {
    const dispatch = useDispatch();
    const prefs = useSelector((state: RootState) => state.userPreferences.textGeneration);
    const handleSwitch = (preference: string) => (checked: boolean) => dispatch(setPreference({ module: 'textGeneration', preference, value: checked }));
    const handleSelect = (preference: string) => (value: string) => dispatch(setPreference({ module: 'textGeneration', preference, value }));

    return (
        <div>
            <div className={row}>
                <Label htmlFor="defaultModel" className={rowLabel}>Model</Label>
                <Select value={prefs.defaultModel} onValueChange={handleSelect('defaultModel')}>
                    <SelectTrigger id="defaultModel" className="w-36 h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="GPT-4o">GPT-4o</SelectItem>
                        <SelectItem value="GPT-4">GPT-4</SelectItem>
                        <SelectItem value="Claude-3">Claude 3</SelectItem>
                        <SelectItem value="Claude-3.5">Claude 3.5</SelectItem>
                        <SelectItem value="Gemini-Pro">Gemini Pro</SelectItem>
                        <SelectItem value="Llama-3">Llama 3</SelectItem>
                    </SelectContent>
                </Select>
            </div>
            <div className={row}>
                <Label htmlFor="tone" className={rowLabel}>Tone</Label>
                <Select value={prefs.tone} onValueChange={handleSelect('tone')}>
                    <SelectTrigger id="tone" className="w-36 h-8 text-xs"><SelectValue /></SelectTrigger>
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
            </div>
            <div className={row}>
                <Label htmlFor="creativityLevel" className={rowLabel}>Creativity</Label>
                <Select value={prefs.creativityLevel} onValueChange={handleSelect('creativityLevel')}>
                    <SelectTrigger id="creativityLevel" className="w-36 h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="low">Low (Factual)</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High (Creative)</SelectItem>
                    </SelectContent>
                </Select>
            </div>
            <div className={row}>
                <Label htmlFor="language" className={rowLabel}>Language</Label>
                <Select value={prefs.language} onValueChange={handleSelect('language')}>
                    <SelectTrigger id="language" className="w-36 h-8 text-xs"><SelectValue /></SelectTrigger>
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
            </div>
            <div className={row}>
                <Label htmlFor="plagiarismCheckEnabled" className={rowLabel}>Plagiarism Check</Label>
                <Switch id="plagiarismCheckEnabled" checked={prefs.plagiarismCheckEnabled} onCheckedChange={handleSwitch('plagiarismCheckEnabled')} />
            </div>
        </div>
    );
};

export default TextGenerationPreferences;
