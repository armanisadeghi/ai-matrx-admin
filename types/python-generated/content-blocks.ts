// AUTO-GENERATED — do not edit manually.
// Source: lib/python/models/
// Run: python lib/python/generate_ts_types.py

export const BlockStatus = {
  STREAMING: "streaming",
  COMPLETE: "complete",
  ERROR: "error",
} as const;

export type BlockStatus = (typeof BlockStatus)[keyof typeof BlockStatus];

export const BlockType = {
  TEXT: "text",
  CODE: "code",
  TABLE: "table",
  THINKING: "thinking",
  REASONING: "reasoning",
  CONSOLIDATED_REASONING: "consolidated_reasoning",
  IMAGE: "image",
  VIDEO: "video",
  TASKS: "tasks",
  TRANSCRIPT: "transcript",
  STRUCTURED_INFO: "structured_info",
  MATRX_BROKER: "matrxBroker",
  QUESTIONNAIRE: "questionnaire",
  FLASHCARDS: "flashcards",
  QUIZ: "quiz",
  PRESENTATION: "presentation",
  COOKING_RECIPE: "cooking_recipe",
  TIMELINE: "timeline",
  PROGRESS_TRACKER: "progress_tracker",
  COMPARISON_TABLE: "comparison_table",
  TROUBLESHOOTING: "troubleshooting",
  RESOURCES: "resources",
  DECISION_TREE: "decision_tree",
  RESEARCH: "research",
  DIAGRAM: "diagram",
  MATH_PROBLEM: "math_problem",
  INFO: "info",
  TASK: "task",
  DATABASE: "database",
  PRIVATE: "private",
  PLAN: "plan",
  EVENT: "event",
  TOOL: "tool",
} as const;

export type BlockType = (typeof BlockType)[keyof typeof BlockType];

export const StreamingBehavior = {
  INCREMENTAL: "incremental",
  SEMANTIC_STREAM: "semantic_stream",
  PARTIAL_UPDATES: "partial_updates",
  MARKDOWN_COMPLETE: "markdown_complete",
  COMPLETE_ONLY: "complete_only",
} as const;

export type StreamingBehavior = (typeof StreamingBehavior)[keyof typeof StreamingBehavior];

export interface ContentBlockPayload {
  blockId: string;
  blockIndex: number;
  type: string;
  status: BlockStatus;
  content?: string | null;
  data?: Record<string, unknown> | null;
  metadata?: Record<string, unknown>;
}

export interface ContentBlockEvent {
  event: "content_block";
  data: ContentBlockPayload;
}

// ---- Block Data Interfaces ----

export interface FlashcardItem {
  front?: string;
  back?: string;
}

export interface FlashcardsBlockData {
  cards?: FlashcardItem[];
  isComplete?: boolean;
  partialCard: FlashcardItem | null;
}

export interface TranscriptSegment {
  id?: string;
  timecode?: string;
  seconds?: number;
  text?: string;
  speaker: string | null;
}

export interface TranscriptBlockData {
  segments?: TranscriptSegment[];
}

export interface TaskItem {
  id?: string;
  title?: string;
  type?: "section" | "task" | "subtask";
  bold?: boolean;
  checked?: boolean;
  children?: TaskItem[];
}

export interface TasksBlockData {
  items?: TaskItem[];
}

export interface QuizQuestion {
  id?: number;
  question?: string;
  options?: string[];
  correctAnswer?: number;
  explanation?: string;
}

export interface QuizBlockData {
  title?: string;
  category: string | null;
  questions?: QuizQuestion[];
  contentHash?: string;
}

export interface Slide {
  title?: string;
  content?: string;
  type?: string;
  bullets?: string[];
  notes?: string;
  imageUrl: string | null;
  layout?: string;
  data?: Record<string, unknown>;
}

export interface SlideTheme {
  primaryColor?: string;
  secondaryColor?: string;
  accentColor?: string;
  backgroundColor?: string;
  textColor?: string;
}

export interface PresentationBlockData {
  slides?: Slide[];
  theme?: SlideTheme;
}

export interface Ingredient {
  amount?: string;
  item?: string;
}

export interface RecipeStep {
  action?: string;
  description?: string;
  time: string | null;
}

export interface RecipeBlockData {
  title?: string;
  yields?: string;
  totalTime?: string;
  prepTime?: string;
  cookTime?: string;
  ingredients?: Ingredient[];
  instructions?: RecipeStep[];
  notes: string | null;
}

export interface TimelineEvent {
  id?: string;
  title?: string;
  date?: string;
  description?: string;
  status: "completed" | "in-progress" | "pending" | null;
  category: string | null;
}

export interface TimelinePeriod {
  period?: string;
  events?: TimelineEvent[];
}

export interface TimelineBlockData {
  title?: string;
  description: string | null;
  periods?: TimelinePeriod[];
}

export interface Position {
  x?: number;
  y?: number;
}

export interface DiagramNode {
  id?: string;
  label?: string;
  type: string | null;
  nodeType?: string;
  description: string | null;
  details: string | null;
  position: Position | null;
}

export interface DiagramEdge {
  id?: string;
  source?: string;
  target?: string;
  label: string | null;
  type?: string;
  color: string | null;
  dashed?: boolean;
  strokeWidth?: number;
}

export interface DiagramLayout {
  direction?: "TB" | "LR" | "BT" | "RL";
  spacing?: number;
}

export interface DiagramBlockData {
  title?: string;
  description: string | null;
  type?: "flowchart" | "mindmap" | "orgchart" | "network" | "system" | "process";
  nodes?: DiagramNode[];
  edges?: DiagramEdge[];
  layout?: DiagramLayout;
}

export interface TableBlockData {
  headers?: string[];
  rows?: string[][];
  isComplete?: boolean;
  rawMarkdown?: string;
}

export interface ResearchSection {
  title?: string;
  content?: string;
  subsections?: ResearchSection[];
}

export interface ResearchBlockData {
  title?: string;
  overview?: string;
  researchScope: string | null;
  keyFocusAreas: string | null;
  analysisPeriod: string | null;
  introduction?: string;
  researchQuestions?: string[];
  sections?: ResearchSection[];
  conclusion?: string;
  keyTakeaways?: string[];
}

export interface ResourceItem {
  id?: string;
  title?: string;
  url?: string;
  description?: string;
  type?: string;
  duration: string | null;
  difficulty: "beginner" | "intermediate" | "advanced" | null;
  rating: number | null;
  tags?: string[];
}

export interface ResourceCategory {
  name?: string;
  items?: ResourceItem[];
}

export interface ResourcesBlockData {
  title?: string;
  description: string | null;
  categories?: ResourceCategory[];
}

export interface ProgressItem {
  id?: string;
  title?: string;
  checked?: boolean;
  priority: "high" | "medium" | "low" | null;
  durationHours: number | null;
  optional?: boolean;
  category: string | null;
}

export interface ProgressCategory {
  name?: string;
  completionPercent: number | null;
  items?: ProgressItem[];
}

export interface ProgressTrackerBlockData {
  title?: string;
  description: string | null;
  categories?: ProgressCategory[];
  overallProgress: number | null;
  totalItems: number | null;
  completedItems: number | null;
}

export interface ComparisonCriterion {
  name?: string;
  values?: unknown[];
  type?: "cost" | "rating" | "text" | "boolean";
  weight: number | null;
  higherIsBetter: boolean | null;
}

export interface ComparisonBlockData {
  title?: string;
  description: string | null;
  items?: string[];
  criteria?: ComparisonCriterion[];
}

export interface TroubleshootingStep {
  text?: string;
  code: string | null;
  url: string | null;
  difficulty: string | null;
  timeEstimate: string | null;
}

export interface TroubleshootingSolution {
  title?: string;
  description?: string;
  steps?: TroubleshootingStep[];
  priority: string | null;
  successRate: string | null;
  tags?: string[];
}

export interface TroubleshootingIssue {
  symptom?: string;
  causes?: string[];
  solutions?: TroubleshootingSolution[];
  relatedIssues?: string[];
  severity: string | null;
}

export interface TroubleshootingBlockData {
  title?: string;
  description: string | null;
  issues?: TroubleshootingIssue[];
}

export interface DecisionNode {
  id?: string;
  question: string | null;
  action: string | null;
  type?: string;
  yes: DecisionNode | null;
  no: DecisionNode | null;
  priority: string | null;
  category: string | null;
  estimatedTime: string | null;
}

export interface DecisionTreeBlockData {
  title?: string;
  description: string | null;
  root?: DecisionNode;
}

export interface MathProblemBlockData {
  mathProblem?: Record<string, unknown>;
}

export interface QuestionnaireSection {
  title?: string;
  content?: string;
  items?: Record<string, unknown>[];
  tables?: Record<string, unknown>[];
  codeBlocks?: Record<string, unknown>[];
  jsonBlocks?: Record<string, unknown>[];
}

export interface QuestionnaireBlockData {
  sections?: QuestionnaireSection[];
  rawContent?: string;
}

export interface MatrxBrokerBlockData {
  matrxRecordId: string | null;
  id: string | null;
  name: string | null;
  defaultValue: string | null;
  color: string | null;
  status: string | null;
  defaultComponent: string | null;
  dataType: string | null;
  rawContent?: string;
}

export interface CodeBlockData {
  language?: string;
  code?: string;
  isDiff?: boolean;
}

export interface DiffBlockData {
  language?: string;
  style?: string;
  code?: string;
}

export interface ConsolidatedReasoningBlockData {
  reasoningTexts?: string[];
}

export interface ImageBlockData {
  src?: string;
  alt?: string;
}

export interface VideoBlockData {
  src?: string;
  alt?: string;
}

// ---- Block Data Type Map ----

export interface BlockDataTypeMap {
  text: null;
  code: CodeBlockData;
  table: TableBlockData;
  thinking: null;
  reasoning: null;
  consolidated_reasoning: ConsolidatedReasoningBlockData;
  image: ImageBlockData;
  video: VideoBlockData;
  flashcards: FlashcardsBlockData;
  transcript: TranscriptBlockData;
  tasks: TasksBlockData;
  quiz: QuizBlockData;
  presentation: PresentationBlockData;
  cooking_recipe: RecipeBlockData;
  timeline: TimelineBlockData;
  progress_tracker: ProgressTrackerBlockData;
  comparison_table: ComparisonBlockData;
  troubleshooting: TroubleshootingBlockData;
  resources: ResourcesBlockData;
  research: ResearchBlockData;
  decision_tree: DecisionTreeBlockData;
  diagram: DiagramBlockData;
  math_problem: MathProblemBlockData;
  questionnaire: QuestionnaireBlockData;
  matrxBroker: MatrxBrokerBlockData;
  diff: DiffBlockData;
}
