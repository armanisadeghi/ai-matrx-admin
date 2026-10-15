import type { Note } from "@/features/notes/types";
import type { DatabaseTask } from "@/features/tasks/types";
import type {
  NoteResourceData,
  ProjectResourceData,
  Resource,
  TaskResourceData,
} from "@ai-matrx/chat/agents/resources/types";
import { buildRecordReferenceFence } from "@/features/matrx-envelope/recordReference";

type NoteResourceInput = Pick<Note, "id" | "label" | "content" | "tags">;
type TaskResourceInput = Pick<
  DatabaseTask,
  "id" | "title" | "status" | "priority" | "due_date" | "project_id" | "description"
>;
type ProjectResourceInput = {
  id: string;
  name: string;
  description: string | null;
  tasks: TaskResourceInput[];
};

export function noteResourceData(note: NoteResourceInput): NoteResourceData {
  return {
    id: note.id,
    label: note.label,
    content: note.content,
    tags: note.tags,
  };
}

export function taskResourceData(task: TaskResourceInput): TaskResourceData {
  return {
    id: task.id,
    title: task.title,
    status: task.status,
    priority: task.priority,
    due_date: task.due_date,
    project_id: task.project_id,
    description: task.description,
  };
}

export function projectResourceData(project: ProjectResourceInput): ProjectResourceData {
  return {
    id: project.id,
    name: project.name,
    description: project.description,
    tasks: project.tasks.map(taskResourceData),
  };
}

/** A picked research topic as the live record reference the server resolves on send. */
export function researchTopicResource(topic: {
  id: string;
  name: string;
}): Extract<Resource, { type: "research_topic" }> {
  return {
    type: "research_topic",
    data: {
      id: topic.id,
      name: topic.name,
      referenceFence: buildRecordReferenceFence({
        type: "research_topic",
        id: topic.id,
        label: topic.name,
      }),
    },
  };
}
