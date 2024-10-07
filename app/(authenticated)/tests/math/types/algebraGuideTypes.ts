// /math/types/algebraGuideTypes.ts

export type Step = {
    title: string;
    equation: string;
    explanation?: string;
    simplified?: string;

};


export type Solution = {
    task: string;
    steps: Step[];
    finalAnswer: string;
};


export type ProblemStatement = {
    text: string;
    equation: string;
    instruction: string;
};


export type Problem = {
    id: string;
    courseName: string;
    topicName: string;
    moduleName: string;
    title: string;
    description: string;
    introText: string;
    transitionTexts: string[];
    finalStatement: string;
    problemStatement: ProblemStatement;
    solutions: Solution[];
    hint?: string;
    resources?: string[];
    difficultyLevel?: 'easy' | 'medium' | 'hard';
    relatedContent?: string[];
};


export type ProblemsData = Problem[];






export type InteractiveMathSession = {
    id: string;
    courseName: string;
    topicName: string;
    moduleName: string;
    title: string;
    description: string;
    introduction: string;
    transitionPhrases: string[];
    conclusion: string;
    problemDetails: ProblemStatement;
    solutions: Solution[];
    hint?: string;
    resources?: string[];
    difficultyLevel?: 'easy' | 'medium' | 'hard';
    relatedContent?: string[];
};

// A collection of interactive math sessions
export type InteractiveMathSessionsData = InteractiveMathSession[];
