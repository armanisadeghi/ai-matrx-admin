import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { emailTableExport } from "@/lib/email/exportService";
import {
  unwrapGetUserTableComplete,
  isTableFieldExportRow,
} from "@/utils/user-tables-rpc";

/**
 * POST /api/export/email-table
 * Email a table export to the current user
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user?.email) {
      return NextResponse.json(
        { success: false, msg: "Unauthorized or no email on account" },
        { status: 401 },
      );
    }

    const body = await request.json();
    const { tableId, tableName, format } = body;

    if (!tableId || !tableName || !format) {
      return NextResponse.json(
        { success: false, msg: "tableId, tableName, and format are required" },
        { status: 400 },
      );
    }

    if (!["csv", "json", "markdown"].includes(format)) {
      return NextResponse.json(
        {
          success: false,
          msg: "Invalid format. Must be csv, json, or markdown",
        },
        { status: 400 },
      );
    }

    // Fetch the table data based on format
    let content: string;
    let rowCount: number | undefined;

    if (format === "csv") {
      const { data, error } = await supabase.rpc("export_user_table_as_csv", {
        p_table_id: tableId,
      });

      if (error) {
        console.error("Error exporting table as CSV:", error);
        return NextResponse.json(
          { success: false, msg: "Failed to export table" },
          { status: 500 },
        );
      }

      content = data;
      // Estimate row count from CSV (lines minus header)
      rowCount = content.split("\n").length - 1;
    } else {
      // For JSON and markdown, fetch complete table data
      const { data, error } = await supabase.rpc("get_user_table_complete", {
        p_table_id: tableId,
      });

      if (error) {
        console.error("Error fetching table data:", error);
        return NextResponse.json(
          { success: false, msg: "Failed to fetch table data" },
          { status: 500 },
        );
      }

      let complete: ReturnType<typeof unwrapGetUserTableComplete>;
      try {
        complete = unwrapGetUserTableComplete(data ?? null);
      } catch (e) {
        console.error("Error fetching table data:", e);
        return NextResponse.json(
          { success: false, msg: "Failed to fetch table data" },
          { status: 500 },
        );
      }

      const exportFields = complete.fields.filter(isTableFieldExportRow);

      rowCount = complete.data.length;

      if (format === "json") {
        // Convert to simple JSON format
        const simpleData = complete.data.map((row: unknown) => {
          const rowObj: Record<string, unknown> = {};
          const r = row as { data?: Record<string, unknown> };
          const cells = r.data ?? {};
          for (const field of exportFields) {
            rowObj[field.display_name] = cells[field.field_name];
          }
          return rowObj;
        });
        content = JSON.stringify(simpleData, null, 2);
      } else {
        // Convert to markdown
        const headers = exportFields.map((field) => field.display_name);
        let markdown = `# ${tableName}\n\n`;
        markdown += `| ${headers.join(" | ")} |\n`;
        markdown += `| ${headers.map(() => "---").join(" | ")} |\n`;

        for (const row of complete.data) {
          const r = row as { data?: Record<string, unknown> };
          const cells = r.data ?? {};
          const rowValues = exportFields.map((field) => {
            const value = cells[field.field_name];
            return value !== null && value !== undefined
              ? String(value).replace(/\|/g, "\\|")
              : "";
          });
          markdown += `| ${rowValues.join(" | ")} |\n`;
        }

        content = markdown;
      }
    }

    const result = await emailTableExport({
      to: user.email,
      tableName,
      format,
      content,
      rowCount,
    });

    if (result.success) {
      return NextResponse.json({
        success: true,
        msg: "Export emailed successfully",
      });
    }

    return NextResponse.json(
      { success: false, msg: result.message, error: result.error },
      { status: 500 },
    );
  } catch (error) {
    console.error("Error in POST /api/export/email-table:", error);
    return NextResponse.json(
      { success: false, msg: "Failed to send email" },
      { status: 500 },
    );
  }
}
