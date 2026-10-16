import { wakeCloudComputer } from "../service";
import { postJson } from "@/lib/python-client";

jest.mock("@/lib/python-client", () => ({
  getJson: jest.fn(),
  postJson: jest.fn().mockResolvedValue({
    data: { exists: true, status: "starting", ready: false },
  }),
}));

describe("wakeCloudComputer", () => {
  it("sends who started the wake, never an empty body", async () => {
    await wakeCloudComputer("user");
    expect(postJson).toHaveBeenCalledWith("/browser-manager/cloud-computer/wake", {
      initiation: "user",
    });
  });
});
