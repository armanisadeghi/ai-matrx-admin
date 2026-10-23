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
      "value-missing",
      "unknown-columns",
      "unknown-inputs",
    ]);
  });
});

describe("eventSourceAdvice hops", () => {
  const ids = (over: object) =>
    eventSourceAdvice({ ...EMPTY_EVENT_DRAFT, table: "a.b", ...over }, [], null).map((n) => n.id);

  it("names a from-value on an insert", () => {
    expect(ids({ whenColumn: "s", whenValue: "x", whenFromValue: "y" })).toEqual(["from-needs-update"]);
    expect(ids({ operation: "update", whenColumn: "s", whenValue: "x", whenFromValue: "y" })).toEqual([]);
  });

  it("names a same-value hop", () => {
    expect(ids({ operation: "update", whenColumn: "s", whenValue: "x", whenFromValue: "x" })).toEqual(["from-equals-to"]);
  });

  it("names a missing value", () => {
    expect(ids({ whenColumn: "s" })).toEqual(["value-missing"]);
  });

  it("omits a blank when_value", () => {
    const spec = buildEventSource({ ...EMPTY_EVENT_DRAFT, table: "a.b", whenColumn: "s" });
    expect(spec).toMatchObject({ when_column: "s" });
    expect("when_value" in spec).toBe(false);
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

  it("reads a missing operation as the server does: an insert watch", () => {
    // workflow.emit_trigger_events: coalesce(event_source->>'operation', 'insert')
    expect(describeEventSource({ table: "a.b" })).toBe("a.b inserts");
    expect(describeEventSource({ table: "a.b", operation: "insert" })).toBe("a.b inserts");
  });
});

describe("eventSourceAdvice watched", () => {
  it("names an unwatched table and stays quiet when unknown or watched", () => {
    const draft = { ...EMPTY_EVENT_DRAFT, table: "crm.contacts" };
    expect(eventSourceAdvice(draft, [], null, false).map((n) => n.id)).toContain(
      "table-unwatched",
    );
    expect(eventSourceAdvice(draft, [], null, true).map((n) => n.id)).not.toContain(
      "table-unwatched",
    );
    expect(eventSourceAdvice(draft, [], null).map((n) => n.id)).not.toContain(
      "table-unwatched",
    );
  });
});
