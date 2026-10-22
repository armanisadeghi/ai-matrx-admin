/** @jest-environment node */
import { projectTransferToolOutcomes } from "./transfer-tool-outcomes";
test("a legacy success flag cannot promote a reported error into a clean result", () => {
  expect(
    projectTransferToolOutcomes([
      {
        status: "completed",
        success: true,
        is_error: false,
        tool_name: "calendar.lookup",
      },
      {
        status: "error",
        success: true,
        is_error: true,
        tool_name: "calendar.create_event",
      },
      {
        status: "completed",
        success: false,
        is_error: false,
        tool_name: "message.send",
      },
      {
        status: "delegated",
        success: false,
        is_error: false,
        tool_name: "device.click",
      },
    ]),
  ).toEqual({
    recorded: 4,
    returnedWithoutError: 1,
    reportedErrors: 1,
    unconfirmed: 2,
    failedToolNames: ["calendar create event"],
  });
});
test("unknown status withholds outcome claims", () => {
  expect(
    projectTransferToolOutcomes([
      {
        status: "new_status",
        success: true,
        is_error: false,
        tool_name: "calendar.lookup",
      },
    ]),
  ).toBeNull();
});
test("spoken failure names are bounded, deduplicated and contain no arbitrary text", () => {
  const rows = [
    "calendar.create_event",
    "calendar.create_event",
    "account.lookup",
    "message.send",
    "task.write",
    "<private output>",
  ].map((tool_name) => ({
    tool_name,
    status: "error",
    success: false,
    is_error: true,
  }));
  expect(projectTransferToolOutcomes(rows)).toEqual({
    recorded: 6,
    returnedWithoutError: 0,
    reportedErrors: 6,
    unconfirmed: 0,
    failedToolNames: [
      "account lookup",
      "calendar create event",
      "message send",
    ],
  });
});
