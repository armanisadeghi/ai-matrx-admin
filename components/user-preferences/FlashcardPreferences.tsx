import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { RootState } from '@/lib/redux/store';
import { setPreference } from '@/lib/redux/slices/userPreferencesSlice';

const row = "flex items-center justify-between px-4 py-3.5 border-b border-border/40 last:border-b-0";
const rowLabel = "text-sm font-medium";

const FlashcardPreferences = () => {
    const dispatch = useDispatch();
    const prefs = useSelector((state: RootState) => state.userPreferences.flashcard);
    const handleSelect = (preference: string) => (value: string) => dispatch(setPreference({ module: 'flashcard', preference, value }));
    const handleSlider = (preference: string) => (value: number[]) => dispatch(setPreference({ module: 'flashcard', preference, value: value[0] }));

    return (
        <div>
            <div className={row}>
                <Label htmlFor="educationLevel" className={rowLabel}>Education Level</Label>
                <Select value={prefs.educationLevel} onValueChange={handleSelect('educationLevel')}>
                    <SelectTrigger id="educationLevel" className="w-36 h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="elementary">Elementary</SelectItem>
                        <SelectItem value="middleSchool">Middle School</SelectItem>
                        <SelectItem value="highSchool">High School</SelectItem>
                        <SelectItem value="undergraduate">Undergraduate</SelectItem>
                        <SelectItem value="graduate">Graduate</SelectItem>
                        <SelectItem value="professional">Professional</SelectItem>
                    </SelectContent>
                </Select>
            </div>
            <div className={row}>
                <Label htmlFor="defaultFlashcardMode" className={rowLabel}>Study Mode</Label>
                <Select value={prefs.defaultFlashcardMode} onValueChange={handleSelect('defaultFlashcardMode')}>
                    <SelectTrigger id="defaultFlashcardMode" className="w-36 h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="selfStudy">Self Study</SelectItem>
                        <SelectItem value="aiTutor">AI Tutor</SelectItem>
                        <SelectItem value="quiz">Quiz Mode</SelectItem>
                        <SelectItem value="review">Review Mode</SelectItem>
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
                    </SelectContent>
                </Select>
            </div>
            <div className={row}>
                <Label htmlFor="primaryAudioVoice" className={rowLabel}>Audio Voice</Label>
                <Select value={prefs.primaryAudioVoice} onValueChange={handleSelect('primaryAudioVoice')}>
                    <SelectTrigger id="primaryAudioVoice" className="w-36 h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="default">Default</SelectItem>
                        <SelectItem value="male1">Male 1</SelectItem>
                        <SelectItem value="male2">Male 2</SelectItem>
                        <SelectItem value="female1">Female 1</SelectItem>
                        <SelectItem value="female2">Female 2</SelectItem>
                    </SelectContent>
                </Select>
            </div>
            <div className={row}>
                <Label htmlFor="primaryTutorPersona" className={rowLabel}>Tutor Persona</Label>
                <Select value={prefs.primaryTutorPersona} onValueChange={handleSelect('primaryTutorPersona')}>
                    <SelectTrigger id="primaryTutorPersona" className="w-36 h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="default">Default</SelectItem>
                        <SelectItem value="encouraging">Encouraging</SelectItem>
                        <SelectItem value="strict">Strict</SelectItem>
                        <SelectItem value="friendly">Friendly</SelectItem>
                        <SelectItem value="professional">Professional</SelectItem>
                        <SelectItem value="socratic">Socratic</SelectItem>
                    </SelectContent>
                </Select>
            </div>
            <div className="px-4 py-3.5 border-b border-border/40 space-y-2">
                <div className="flex items-center justify-between">
                    <Label htmlFor="fontSize" className={rowLabel}>Font Size</Label>
                    <span className="text-xs text-muted-foreground tabular-nums">{prefs.fontSize}px</span>
                </div>
                <Slider id="fontSize" min={12} max={24} step={1} value={[prefs.fontSize]} onValueChange={handleSlider('fontSize')} className="w-full" />
                <div className="flex justify-between text-xs text-muted-foreground"><span>Small</span><span>Medium</span><span>Large</span></div>
            </div>
            <div className="px-4 py-3.5 border-b border-border/40 space-y-2">
                <div className="flex items-center justify-between">
                    <Label htmlFor="flashcardDifficultyAdjustment" className={rowLabel}>Card Difficulty</Label>
                    <span className="text-xs text-muted-foreground tabular-nums">{prefs.flashcardDifficultyAdjustment}/10</span>
                </div>
                <Slider id="flashcardDifficultyAdjustment" min={1} max={10} step={1} value={[prefs.flashcardDifficultyAdjustment]} onValueChange={handleSlider('flashcardDifficultyAdjustment')} className="w-full" />
                <div className="flex justify-between text-xs text-muted-foreground"><span>Easier</span><span>Balanced</span><span>Harder</span></div>
            </div>
            <div className="px-4 py-3.5 border-b border-border/40 space-y-2">
                <div className="flex items-center justify-between">
                    <Label htmlFor="aiDifficultyAdjustment" className={rowLabel}>AI Tutor Difficulty</Label>
                    <span className="text-xs text-muted-foreground tabular-nums">{prefs.aiDifficultyAdjustment}/10</span>
                </div>
                <Slider id="aiDifficultyAdjustment" min={1} max={10} step={1} value={[prefs.aiDifficultyAdjustment]} onValueChange={handleSlider('aiDifficultyAdjustment')} className="w-full" />
                <div className="flex justify-between text-xs text-muted-foreground"><span>Easier</span><span>Balanced</span><span>Harder</span></div>
            </div>
            <div className="px-4 py-3.5">
                <div className="flex items-center justify-between">
                    <Label htmlFor="targetScore" className={rowLabel}>Target Score</Label>
                    <span className="text-xs text-muted-foreground tabular-nums">{prefs.targetScore}%</span>
                </div>
                <Slider id="targetScore" min={50} max={100} step={5} value={[prefs.targetScore]} onValueChange={handleSlider('targetScore')} className="w-full mt-2" />
                <div className="flex justify-between text-xs text-muted-foreground mt-1"><span>50%</span><span>75%</span><span>100%</span></div>
            </div>
        </div>
    );
};

export default FlashcardPreferences;
