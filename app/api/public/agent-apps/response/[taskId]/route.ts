import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> },
) {
  try {
    const { taskId } = await params;
    const supabase = await createClient();

    const { data: task, error } = await supabase
      .from("ai_tasks")
      .select("status, response_text, response_data, response_errors")
      .eq("task_id", taskId)
      .single();

    if (error) {
      return NextResponse.json({
        response: "",
        completed: false,
        error: null,
      });
    }

    let response = "";
    let completed = false;
    let taskError: string | null = null;

    if (task) {
      if (task.status === "completed" || task.status === "failed") {
        completed = true;
      }

      if (task.status === "failed") {
        taskError = task.response_errors
          ? typeof task.response_errors === "string"
            ? task.response_errors
            : JSON.stringify(task.response_errors)
          : "Task failed";
      }

      if (task.response_text) {
        response = task.response_text;
      } else if (task.response_data) {
        try {
          const data =
            typeof task.response_data === "string"
              ? JSON.parse(task.response_data)
              : task.response_data;

          response =
            (data as { response?: string }).response ||
            (data as { text?: string }).text ||
            (data as { content?: string }).content ||
            (data as { message?: string }).message ||
            (typeof data === "string" ? data : "");
        } catch {
          response =
            typeof task.response_data === "string" ? task.response_data : "";
        }
      }
    }

    return NextResponse.json({ response, completed, error: taskError });
  } catch (error) {
    console.error("Error fetching task response:", error);
    return NextResponse.json(
      { response: "", completed: false, error: "Failed to fetch response" },
      { status: 500 },
    );
  }
}
