import { pastePlainText } from "../paste-plain";

function run(readText: () => Promise<string | null>) {
  const insert = jest.fn();
  const error = jest.fn();
  return pastePlainText({ readText, insert, error }).then(() => ({ insert, error }));
}

describe("Paste without formatting", () => {
  it("a clipboard the browser blocks shows the notice and inserts nothing", async () => {
    const { insert, error } = await run(async () => null);
    expect(error).toHaveBeenCalledWith("The browser would not let this page read the clipboard", expect.objectContaining({ description: expect.stringContaining("Shift+V") }));
    expect(insert).not.toHaveBeenCalled();
  });
  it("an empty clipboard shows the notice and inserts nothing", async () => {
    const { insert, error } = await run(async () => "");
    expect(error).toHaveBeenCalledWith("The clipboard is empty");
    expect(insert).not.toHaveBeenCalled();
  });
  it("a read that throws says so", async () => {
    const { insert, error } = await run(async () => {
      throw new Error("denied");
    });
    expect(error).toHaveBeenCalledWith("Could not read the clipboard", { description: "denied" });
    expect(insert).not.toHaveBeenCalled();
  });
  it("real text reaches the caret with line breaks normalised and no notice", async () => {
    const { insert, error } = await run(async () => "a\r\nb");
    expect(insert).toHaveBeenCalledWith("a\nb");
    expect(error).not.toHaveBeenCalled();
  });
});
