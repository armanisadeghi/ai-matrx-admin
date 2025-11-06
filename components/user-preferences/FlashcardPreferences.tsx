import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { RootState } from '@/lib/redux/store';
import { setPreference } from '@/lib/redux/slices/userPreferencesSlice';

const FlashcardPreferences = () => {
    const dispatch = useDispatch();
    const flashcardPreferences = useSelector((state: RootState) => state.userPreferences.flashcard);

    const handleSelectChange = (preference: string) => (value: string) => {
        dispatch(setPreference({ module: 'flashcard', preference, value }));
    };

    const handleSliderChange = (preference: string) => (value: number[]) => {
        dispatch(setPreference({ module: 'flashcard', preference, value: value[0] }));
    };

    return (
        <div className="space-y-6">
            <div className="space-y-3">
                <div className="flex items-center justify-between">
                    <Label htmlFor="fontSize">Font Size</Label>
                    <span className="text-sm text-muted-foreground">
                        {flashcardPreferences.fontSize}px
                    </span>
                </div>
                <Slider
                    id="fontSize"
                    min={12}
                    max={24}
                    step={1}
                    value={[flashcardPreferences.fontSize]}
                    onValueChange={handleSliderChange('fontSize')}
                    className="w-full"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Small</span>
                    <span>Medium</span>
                    <span>Large</span>
                </div>
            </div>

            <div className="space-y-2">
                <Label htmlFor="educationLevel">Education Level</Label>
                <Select value={flashcardPreferences.educationLevel} onValueChange={handleSelectChange('educationLevel')}>
                    <SelectTrigger id="educationLevel">
                        <SelectValue placeholder="Select education level" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="elementary">Elementary</SelectItem>
                        <SelectItem value="middleSchool">Middle School</SelectItem>
                        <SelectItem value="highSchool">High School</SelectItem>
                        <SelectItem value="undergraduate">Undergraduate</SelectItem>
                        <SelectItem value="graduate">Graduate</SelectItem>
                        <SelectItem value="professional">Professional</SelectItem>
                    </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground">
                    Adjusts content difficulty and explanations
                </p>
            </div>

            <div className="space-y-3">
                <div className="flex items-center justify-between">
                    <Label htmlFor="flashcardDifficultyAdjustment">Flashcard Difficulty</Label>
                    <span className="text-sm text-muted-foreground">
                        {flashcardPreferences.flashcardDifficultyAdjustment}/10
                    </span>
                </div>
                <Slider
                    id="flashcardDifficultyAdjustment"
                    min={1}
                    max={10}
                    step={1}
                    value={[flashcardPreferences.flashcardDifficultyAdjustment]}
                    onValueChange={handleSliderChange('flashcardDifficultyAdjustment')}
                    className="w-full"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Easier</span>
                    <span>Balanced</span>
                    <span>Harder</span>
                </div>
                <p className="text-sm text-muted-foreground">
                    Adjust difficulty of generated flashcards
                </p>
            </div>

            <div className="space-y-3">
                <div className="flex items-center justify-between">
                    <Label htmlFor="aiDifficultyAdjustment">AI Tutor Difficulty</Label>
                    <span className="text-sm text-muted-foreground">
                        {flashcardPreferences.aiDifficultyAdjustment}/10
                    </span>
                </div>
                <Slider
                    id="aiDifficultyAdjustment"
                    min={1}
                    max={10}
                    step={1}
                    value={[flashcardPreferences.aiDifficultyAdjustment]}
                    onValueChange={handleSliderChange('aiDifficultyAdjustment')}
                    className="w-full"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Easier</span>
                    <span>Balanced</span>
                    <span>Harder</span>
                </div>
                <p className="text-sm text-muted-foreground">
                    Adjust difficulty of AI tutor questions
                </p>
            </div>

            <div className="space-y-2">
                <Label htmlFor="language">Language</Label>
                <Select value={flashcardPreferences.language} onValueChange={handleSelectChange('language')}>
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
                    </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground">
                    Language for flashcard content
                </p>
            </div>

            <div className="space-y-2">
                <Label htmlFor="defaultFlashcardMode">Default Study Mode</Label>
                <Select value={flashcardPreferences.defaultFlashcardMode} onValueChange={handleSelectChange('defaultFlashcardMode')}>
                    <SelectTrigger id="defaultFlashcardMode">
                        <SelectValue placeholder="Select study mode" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="selfStudy">Self Study</SelectItem>
                        <SelectItem value="aiTutor">AI Tutor</SelectItem>
                        <SelectItem value="quiz">Quiz Mode</SelectItem>
                        <SelectItem value="review">Review Mode</SelectItem>
                    </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground">
                    Default mode when starting flashcard sessions
                </p>
            </div>

            <div className="space-y-3">
                <div className="flex items-center justify-between">
                    <Label htmlFor="targetScore">Target Score</Label>
                    <span className="text-sm text-muted-foreground">
                        {flashcardPreferences.targetScore}%
                    </span>
                </div>
                <Slider
                    id="targetScore"
                    min={50}
                    max={100}
                    step={5}
                    value={[flashcardPreferences.targetScore]}
                    onValueChange={handleSliderChange('targetScore')}
                    className="w-full"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                    <span>50%</span>
                    <span>75%</span>
                    <span>100%</span>
                </div>
                <p className="text-sm text-muted-foreground">
                    Goal score for mastery
                </p>
            </div>

            <div className="space-y-2">
                <Label htmlFor="primaryAudioVoice">Primary Audio Voice</Label>
                <Select value={flashcardPreferences.primaryAudioVoice} onValueChange={handleSelectChange('primaryAudioVoice')}>
                    <SelectTrigger id="primaryAudioVoice">
                        <SelectValue placeholder="Select voice" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="default">Default</SelectItem>
                        <SelectItem value="male1">Male Voice 1</SelectItem>
                        <SelectItem value="male2">Male Voice 2</SelectItem>
                        <SelectItem value="female1">Female Voice 1</SelectItem>
                        <SelectItem value="female2">Female Voice 2</SelectItem>
                    </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground">
                    Voice for audio playback in flashcards
                </p>
            </div>

            <div className="space-y-2">
                <Label htmlFor="primaryTutorPersona">Primary Tutor Persona</Label>
                <Select value={flashcardPreferences.primaryTutorPersona} onValueChange={handleSelectChange('primaryTutorPersona')}>
                    <SelectTrigger id="primaryTutorPersona">
                        <SelectValue placeholder="Select persona" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="default">Default</SelectItem>
                        <SelectItem value="encouraging">Encouraging</SelectItem>
                        <SelectItem value="strict">Strict</SelectItem>
                        <SelectItem value="friendly">Friendly</SelectItem>
                        <SelectItem value="professional">Professional</SelectItem>
                        <SelectItem value="socratic">Socratic</SelectItem>
                    </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground">
                    AI tutor teaching style and personality
                </p>
            </div>

            <div className="pt-4 border-t">
                <p className="text-sm text-muted-foreground">
                    Configure settings for flashcard study sessions and AI tutoring.
                </p>
            </div>
        </div>
    );
};

export default FlashcardPreferences;

