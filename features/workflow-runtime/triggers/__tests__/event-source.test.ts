import {
  buildEventSource,
  describeEventSource,
  EMPTY_EVENT_DRAFT,
  eventSourceAdvice,
} from "../event-source";

describe("buildEventSource", () => {
  it("omits blank optional parts", () => {
    expect(buildEventSource({ ...EMPTY_EVENT_DRAFT, table: " a.b " })).toEqual({
      source: "table",
      table: "a.b",
      operation: "insert",
      entity_key_column: "id",
      debounce_seconds: 0,
      input_map: {},
      include_event: false,
    });
  });

  it("carries the transition, from-value, map and admin scope", () => {
    const spec = buildEventSource({
      ...EMPTY_EVENT_DRAFT,
      table: "a.b",
      operation: "update",
      whenColumn: "status",
      whenValue: "done",
      whenFromValue: "open",
      debounceSeconds: "99999999",
      inputMap: [
        { input: "photo", column: "file_id" },
        { input: "", column: "x" },
      ],
      organizationScope: "any",
    });
    expect(spec).toMatchObject({
      when_column: "status",
      when_value: "done",
      when_from_value: "open",
      debounce_seconds: 86400,
      input_map: { photo: "file_id" },
      organization_scope: "any",
    });
  });

  it("drops the from-value when no column is watched", () => {
    const spec = buildEventSource({
      ...EMPTY_EVENT_DRAFT,
      table: "a.b",
      whenFromValue: "open",
    });
    expect(spec).not.toHaveProperty("when_from_value");
  });
});

describe("eventSourceAdvice", () => {
  it("offers notes instead of refusing", () => {
    const ids = eventSourceAdvice(
      {
        ...EMPTY_EVENT_DRAFT,
        table: "Bad",
        whenColumn: "status",
        inputMap: [{ input: "nope", column: "zzz" }],
      },
      ["photo"],
      ["id", "status"],
    ).map((n) => n.id);
    expect(ids).toEqual([
      "table-shape",
      "when-pair",
      "unknown-columns",
      "unknown-inputs",
    ]);
  });
});

describe("describeEventSource", () => {
  it("reads the new keys", () => {
    expect(
      describeEventSource({
        table: "a.b",
        operation: "update",
        when_column: "status",
        when_value: "done",
        when_from_value: "open",
        organization_scope: "any",
      }),
    ).toBe("a.b updates · status: open → done · any organization");
  });
});
