import { optionsBody } from "./service";

jest.mock("@/lib/api/stream-parser", () => ({ consumeStream: jest.fn() }));

describe("search request body", () => {
  it("sends the position only as a complete pair", () => {
    expect(optionsBody({ latitude: 33.6, longitude: -117.7 })).toEqual({
      latitude: 33.6,
      longitude: -117.7,
    });
    expect(optionsBody({ latitude: 33.6, longitude: null })).toEqual({});
    expect(optionsBody({ latitude: null, longitude: null })).toEqual({});
    expect(optionsBody({ latitude: Number.NaN, longitude: 1 })).toEqual({});
  });

  it("asks for the raw payload only when told to", () => {
    expect(optionsBody({ includeRaw: true })).toEqual({ include_raw: true });
    expect(optionsBody({ includeRaw: false })).toEqual({});
  });
});
