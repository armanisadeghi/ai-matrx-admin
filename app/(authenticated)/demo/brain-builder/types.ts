// Define the root Course structure
interface Course {
    id: string;
    name: string;
    topics: Topic[];
}

// Define each Topic within a Course
interface Topic {
    id: string;
    name: string;
    modules: Module[];
}

// Define each Module within a Topic
interface Module {
    id: string;
    name: string;
    lessons: Lesson[];
}

// Define each Lesson within a Module
interface Lesson {
    id: string;
    name: string;
    description?: string;
    content: Content[];
}

// Define the different types of Content that can exist within a Lesson
type Content =
    | Flashcard
    | InteractiveSession
    | Video
    | ImageLesson
    | Quiz
    | Assessment
    | Activity
    | Exercise;

// Define a base interface for common fields in all content types
interface BaseContent {
    id: string;
    type: ContentType;
    title: string;
}

// Enum for all content types (ensures strict typing)
enum ContentType {
    Flashcard = "flashcard",
    Interactive = "interactive",
    Video = "video",
    ImageLesson = "image_lesson",
    Quiz = "quiz",
    Assessment = "assessment",
    Activity = "activity",
    Exercise = "exercise"
}

// Specific content type definitions extending the base content

interface Flashcard extends BaseContent {
    type: ContentType.Flashcard;
    front: string;
    back: string;
    order: number;
    example?: string;
    detailedExplanation?: string;
    audioExplanation?: string;
    relatedImages?: string[];
    personalNotes?: string;
    isDeleted?: boolean;
}

interface InteractiveSession extends BaseContent {
    type: ContentType.Interactive;
    sessionUrl: string;
}

interface Video extends BaseContent {
    type: ContentType.Video;
    videoUrl: string;
    duration: number; // Duration in seconds
}

interface ImageLesson extends BaseContent {
    type: ContentType.ImageLesson;
    imageUrl: string;
    description?: string; // Optional description for the image lesson
}

interface Quiz extends BaseContent {
    type: ContentType.Quiz;
    questions: Question[];
}

interface Assessment extends BaseContent {
    type: ContentType.Assessment;
    details: string;
    maxScore: number;
}

interface Activity extends BaseContent {
    type: ContentType.Activity;
    steps: string[]; // Steps or instructions for the activity
}

interface Exercise extends BaseContent {
    type: ContentType.Exercise;
    description: string;
    expectedOutcome: string;
}

// Additional interfaces for nested components (like Quiz Questions)

interface Question {
    id: string;
    prompt: string;
    options: Option[];
    correctAnswer: string;
}

interface Option {
    id: string;
    text: string;
}

// Example of expanding the content types with other future content types
// interface NewContentType extends BaseContent {
//   type: ContentType.NewType;
//   // other fields specific to this content type
// }
