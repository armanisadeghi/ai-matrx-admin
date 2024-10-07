// /math/types/algebraGuideTypes.ts

// Step within a solution for a problem
type Step = {
    title: string;
    equation: string;
    explanation?: string;
    simplifiedEquation?: string; // Renamed for clarity
};

// Solution structure containing multiple steps and the final answer
type Solution = {
    taskDescription: string;    // Renamed for clarity
    steps: Step[];              // Steps involved in solving the problem
    finalAnswer: string;        // The final answer to the task
};

// Problem statement with text, equation, and instructions
type ProblemStatement = {
    text: string;               // Introduction or explanation of the problem
    equation: string;           // The main equation presented in the problem
    instruction: string;        // Instruction for solving the problem
};

// Lesson content which can be of various types like InteractiveMathSession
type LessonContent = {
    type: 'interactiveMathSession'; // Content type identifier
    content: InteractiveMathSession;
};

// Lesson structure within a module
type Lesson = {
    id: string;
    title: string;
    description: string;
    contents: LessonContent[]; // Array of different lesson contents
};

// Module within a topic
type Module = {
    id: string;
    name: string;
    description: string;
    lessons: Lesson[];
};

// Topic within a course
type Topic = {
    id: string;
    name: string;
    modules: Module[];
};

// The highest level Course structure
type Course = {
    id: string;
    name: string;
    topics: Topic[];
};

// Interactive Math Session, which could be one type of lesson content
type InteractiveMathSession = {
    id: string;
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

// A complete course data collection
export type CourseData = Course[];
