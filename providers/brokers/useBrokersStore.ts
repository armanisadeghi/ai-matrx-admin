// hooks/useBrokersStore.ts
import { create } from "zustand";
import { v4 as uuidv4 } from "uuid";


const brokerColors = [
  { light: "bg-red-100", dark: "dark:bg-red-900" },
  { light: "bg-green-100", dark: "dark:bg-green-900" },
  { light: "bg-blue-100", dark: "dark:bg-blue-900" },
  { light: "bg-purple-100", dark: "dark:bg-purple-900" },
  { light: "bg-yellow-100", dark: "dark:bg-yellow-900" },
  { light: "bg-pink-100", dark: "dark:bg-pink-500" },
  { light: "bg-indigo-100", dark: "dark:bg-indigo-900" },
  { light: "bg-orange-100", dark: "dark:bg-orange-900" },
  { light: "bg-teal-100", dark: "dark:bg-teal-900" },
  { light: "bg-cyan-100", dark: "dark:bg-cyan-900" },
  { light: "bg-rose-100", dark: "dark:bg-rose-900" },
  { light: "bg-lime-100", dark: "dark:bg-lime-900" },
  { light: "bg-amber-100", dark: "dark:bg-amber-900" },
  { light: "bg-emerald-100", dark: "dark:bg-emerald-900" },
  { light: "bg-fuchsia-100", dark: "dark:bg-fuchsia-900" },
  { light: "bg-sky-100", dark: "dark:bg-sky-900" },
  { light: "bg-violet-100", dark: "dark:bg-violet-900" },
  { light: "bg-slate-100", dark: "dark:bg-slate-900" },
  { light: "bg-gray-100", dark: "dark:bg-gray-900" },
  { light: "bg-zinc-100", dark: "dark:bg-zinc-900" },
  { light: "bg-neutral-100", dark: "dark:bg-neutral-900" },
  { light: "bg-stone-100", dark: "dark:bg-stone-900" },
  { light: "bg-yellow-200", dark: "dark:bg-yellow-800" },
  { light: "bg-blue-200", dark: "dark:bg-blue-800" },
  { light: "bg-red-200", dark: "dark:bg-red-800" },
];

const getNextAvailableColor = (
  brokers: Record<string, Broker>
): { light: string; dark: string } => {
  const usedColors = new Set(
    Object.values(brokers)
      .filter((broker) => !broker.isDeleted)
      .map((broker) => broker.color.light)
  );

  return (
    brokerColors.find((color) => !usedColors.has(color.light)) ||
    brokerColors[Math.floor(Math.random() * brokerColors.length)]
  );
};

const createDefaultBroker = (
  id: string,
  displayName: string,
  brokers: Record<string, Broker>
): Broker => ({
  id,
  name: displayName,
  displayName,
  dataType: "str",
  value: "",
  componentType: "input",
  tooltip: "",
  defaultSource: "user_input",
  isConnected: true,
  ready: false,
  isDeleted: false,
  color: getNextAvailableColor(brokers)
});

export const useBrokersStore = create<BrokersState>((set, get) => ({
  brokers: {},
  brokerCount: 0,
  linkedEditors: {},

  addExistingBroker: (broker) => {
    set((state) => ({
      brokers: {
        ...state.brokers,
        [broker.id]: broker,
      },
    }));
  },

  createBrokerFromText: (content) => {
    const state = get();
    const id = uuidv4();
    const displayName = content
      .replace(/[^\w\s]/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 15) || "New Broker";

    const broker: Broker = {
      ...createDefaultBroker(id, displayName, state.brokers),
      value: content,
    };

    set((state) => ({
      brokers: {
        ...state.brokers,
        [id]: broker,
      },
    }));

    return broker;
  },

  createNewBroker: () => {
    const state = get();
    const id = uuidv4();
    const count = state.brokerCount + 1;
    const displayName = `New Broker ${count}`;

    const broker = createDefaultBroker(id, displayName, state.brokers);

    set((state) => ({
      brokers: {
        ...state.brokers,
        [id]: broker,
      },
      brokerCount: count,
    }));

    return broker;
  },

  updateBroker: (id, data) => {
    set((state) => ({
      brokers: {
        ...state.brokers,
        [id]: { ...state.brokers[id], ...data },
      },
    }));
  },

  updateBrokerValue: <T extends BrokerDataType>(
    id: string,
    value: DataTypeToValueType<T>,
    dataType: T
  ) => {
    set((state) => ({
      brokers: {
        ...state.brokers,
        [id]: {
          ...state.brokers[id],
          value,
          dataType,
        },
      },
    }));
  },

  deleteBroker: (id) => {
    set((state) => ({
      brokers: {
        ...state.brokers,
        [id]: { ...state.brokers[id], isDeleted: true },
      },
    }));
  },

  getBroker: (id) => {
    const state = get();
    return state.brokers[id];
  },

  markBrokerAsReady: (id) => {
    set((state) => ({
      brokers: {
        ...state.brokers,
        [id]: { ...state.brokers[id], ready: true },
      },
    }));
  },

  markBrokerAsNotReady: (id) => {
    set((state) => ({
      brokers: {
        ...state.brokers,
        [id]: { ...state.brokers[id], ready: false },
      },
    }));
  },

  linkBrokerToEditor: (
    brokerId: string,
    editorId: string,
    editorRef: React.RefObject<HTMLDivElement>
  ) => {
    set((state) => {
      const existingEditor = state.linkedEditors[editorId];
      const updatedBrokers = existingEditor
        ? new Set(existingEditor.brokers)
        : new Set<string>();
      updatedBrokers.add(brokerId);

      return {
        linkedEditors: {
          ...state.linkedEditors,
          [editorId]: {
            id: editorId,
            brokers: updatedBrokers,
            ref: editorRef,
          },
        },
      };
    });
  },

  unlinkBrokerFromEditor: (brokerId: string, editorId: string) => {
    set((state) => {
      const existingEditor = state.linkedEditors[editorId];
      if (!existingEditor) return state;

      const updatedBrokers = new Set(existingEditor.brokers);
      updatedBrokers.delete(brokerId);

      return {
        linkedEditors: {
          ...state.linkedEditors,
          [editorId]: {
            ...existingEditor,
            brokers: updatedBrokers,
          },
        },
      };
    });
  },

  getLinkedEditors: (brokerId: string) => {
    const state = get();
    return Object.entries(state.linkedEditors)
      .filter(([_, editor]) => editor.brokers.has(brokerId))
      .map(([editorId, _]) => editorId);
  },
}));
