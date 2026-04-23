"use client";

import { BookOpen } from "lucide-react";
import {
  SettingsSelect,
  SettingsSlider,
  SettingsSection,
  SettingsSubHeader,
} from "@/components/official/settings";
import { useSetting } from "../hooks/useSetting";

export default function FlashcardsTab() {
  const [educationLevel, setEducationLevel] = useSetting<string>(
    "userPreferences.flashcard.educationLevel",
  );
  const [studyMode, setStudyMode] = useSetting<string>(
    "userPreferences.flashcard.defaultFlashcardMode",
  );
  const [language, setLanguage] = useSetting<string>(
    "userPreferences.flashcard.language",
  );
  const [audioVoice, setAudioVoice] = useSetting<string>(
    "userPreferences.flashcard.primaryAudioVoice",
  );
  const [tutorPersona, setTutorPersona] = useSetting<string>(
    "userPreferences.flashcard.primaryTutorPersona",
  );
  const [fontSize, setFontSize] = useSetting<number>(
    "userPreferences.flashcard.fontSize",
  );
  const [cardDifficulty, setCardDifficulty] = useSetting<number>(
    "userPreferences.flashcard.flashcardDifficultyAdjustment",
  );
  const [aiDifficulty, setAiDifficulty] = useSetting<number>(
    "userPreferences.flashcard.aiDifficultyAdjustment",
  );
  const [targetScore, setTargetScore] = useSetting<number>(
    "userPreferences.flashcard.targetScore",
  );

  return (
    <>
      <SettingsSubHeader
        title="Flashcards"
        description="Study session defaults."
        icon={BookOpen}
      />
      <SettingsSection title="Session">
        <SettingsSelect
          label="Education level"
          value={educationLevel}
          onValueChange={setEducationLevel}
          options={[
            { value: "elementary", label: "Elementary" },
            { value: "middleSchool", label: "Middle school" },
            { value: "highSchool", label: "High school" },
            { value: "undergraduate", label: "Undergraduate" },
            { value: "graduate", label: "Graduate" },
            { value: "professional", label: "Professional" },
          ]}
        />
        <SettingsSelect
          label="Study mode"
          value={studyMode}
          onValueChange={setStudyMode}
          options={[
            { value: "selfStudy", label: "Self study" },
            { value: "aiTutor", label: "AI tutor" },
            { value: "quiz", label: "Quiz" },
            { value: "review", label: "Review" },
          ]}
        />
        <SettingsSelect
          label="Language"
          value={language}
          onValueChange={setLanguage}
          options={[
            { value: "en", label: "English" },
            { value: "es", label: "Spanish" },
            { value: "fr", label: "French" },
            { value: "de", label: "German" },
            { value: "it", label: "Italian" },
            { value: "pt", label: "Portuguese" },
            { value: "zh", label: "Chinese" },
            { value: "ja", label: "Japanese" },
            { value: "ko", label: "Korean" },
          ]}
          last
        />
      </SettingsSection>
      <SettingsSection title="Tutor">
        <SettingsSelect
          label="Audio voice"
          value={audioVoice}
          onValueChange={setAudioVoice}
          options={[
            { value: "default", label: "Default" },
            { value: "male1", label: "Male 1" },
            { value: "male2", label: "Male 2" },
            { value: "female1", label: "Female 1" },
            { value: "female2", label: "Female 2" },
          ]}
        />
        <SettingsSelect
          label="Tutor persona"
          value={tutorPersona}
          onValueChange={setTutorPersona}
          options={[
            { value: "default", label: "Default" },
            { value: "encouraging", label: "Encouraging" },
            { value: "strict", label: "Strict" },
            { value: "friendly", label: "Friendly" },
            { value: "professional", label: "Professional" },
            { value: "socratic", label: "Socratic" },
          ]}
          last
        />
      </SettingsSection>
      <SettingsSection title="Difficulty">
        <SettingsSlider
          label="Font size"
          value={fontSize}
          onValueChange={setFontSize}
          min={12}
          max={24}
          step={1}
          unit="px"
          minLabel="Small"
          midLabel="Medium"
          maxLabel="Large"
        />
        <SettingsSlider
          label="Card difficulty"
          value={cardDifficulty}
          onValueChange={setCardDifficulty}
          min={1}
          max={10}
          step={1}
          minLabel="Easier"
          midLabel="Balanced"
          maxLabel="Harder"
        />
        <SettingsSlider
          label="AI tutor difficulty"
          value={aiDifficulty}
          onValueChange={setAiDifficulty}
          min={1}
          max={10}
          step={1}
          minLabel="Easier"
          midLabel="Balanced"
          maxLabel="Harder"
        />
        <SettingsSlider
          label="Target score"
          description="Mastery threshold before cards are retired from active rotation."
          value={targetScore}
          onValueChange={setTargetScore}
          min={50}
          max={100}
          step={5}
          unit="%"
          minLabel="50%"
          midLabel="75%"
          maxLabel="100%"
          last
        />
      </SettingsSection>
    </>
  );
}
