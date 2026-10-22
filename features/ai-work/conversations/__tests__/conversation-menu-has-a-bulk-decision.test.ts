import { buildConversationMenu } from "@ai-matrx/chat/agents/components/conversation-actions/conversationActionRegistry";
import { CONVERSATION_BULK_VERBS, CONVERSATION_MENU_DECISIONS } from "../conversationBulkActions";

// The row menu is the chat package's. Whatever it offers on a row must have a decision on the bar.
describe("the /work/conversations row menu and the bulk bar stay one list", () => {
  const menu = buildConversationMenu({
    conversationId: "c1",
    title: "T",
    isFavorite: false,
    isArchived: false,
    excludeFromKg: false,
    href: "/x",
    agent: { id: "a1" },
    showRename: true,
    onRename: () => {},
    showFavorite: true,
    showDelete: true,
    onAddToProject: () => {},
    source: { app: "a", feature: "f", onShowOnly: () => {}, onHide: () => {}, removeFromList: { label: "x", run: () => {} } },
    dispatch: (() => undefined) as never,
  });
  const ids = menu.sections.flatMap((section) => section.items.map((item) => item.id));

  it("every menu item has a bulk decision", () => {
    const undecided = ids.filter((id) => !(id in CONVERSATION_MENU_DECISIONS));
    expect(undecided).toEqual([]);
  });
  it("every verb marked twin is on the bar", () => {
    const twins = Object.entries(CONVERSATION_MENU_DECISIONS).filter(([, d]) => d === "twin").map(([id]) => id);
    const barIds = CONVERSATION_BULK_VERBS.map((v) => v.id as string);
    for (const id of twins) expect(barIds).toContain(id);
  });
});
