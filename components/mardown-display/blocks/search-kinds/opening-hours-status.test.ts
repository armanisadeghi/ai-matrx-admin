import { clockLabel, openStatus } from "./primitive-blocks";

jest.mock("@ai-matrx/kit/outbound-react", () => ({ OutboundLink: () => null }));

const days = [
  { day: "tuesday", opens: "08:00" },
  { day: "wednesday", opens: "08:00" },
];

describe("hours status line", () => {
  it("formats 24h clock times the way people read them", () => {
    expect(clockLabel("17:00")).toBe("5 PM");
    expect(clockLabel("08:30")).toBe("8:30 AM");
    expect(clockLabel("00:00")).toBe("12 AM");
  });

  it("is open inside today's window and says when it closes", () => {
    expect(openStatus({ opens: "08:00", closes: "17:00" }, 9 * 60)).toEqual({
      open: true,
      line: "Closes 5 PM",
    });
  });

  it("before opening says today's opening time", () => {
    expect(openStatus({ opens: "08:00", closes: "17:00" }, 7 * 60)?.line).toBe("Opens 8 AM");
  });

  it("after closing names the next day it opens", () => {
    expect(
      openStatus({ day: "tuesday", opens: "08:00", closes: "17:00" }, 20 * 60, days),
    ).toEqual({ open: false, line: "Opens 8 AM Wed" });
  });

  it("handles a window past midnight", () => {
    expect(openStatus({ opens: "18:00", closes: "02:00" }, 60)?.open).toBe(true);
    expect(openStatus({ opens: "18:00", closes: "02:00" }, 12 * 60)?.open).toBe(false);
  });
});
