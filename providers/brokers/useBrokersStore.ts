// hooks/useBrokersStore.ts
import { create } from "zustand";
import { v4 as uuidv4 } from "uuid";
import { Broker } from "./types";

interface EditorInstance {
  id: string;
  brokers: Set<string>;
  ref: React.RefObject<HTMLDivElement>;
}

interface BrokersState {
  brokers: Record<string, Broker>;
  brokerCount: number;
  linkedEditors: Record<string, EditorInstance>;

  addExistingBroker: (broker: Broker) => void;
  createBrokerFromText: (content: string) => Broker;
  createNewBroker: () => Broker;
  updateBroker: (id: string, data: Partial<Broker>) => void;
  deleteBroker: (id: string) => void;
  getBroker: (id: string) => Broker | undefined;
  linkBrokerToEditor: (
    brokerId: string,
    editorId: string,
    editorRef: React.RefObject<HTMLDivElement>
  ) => void;
  unlinkBrokerFromEditor: (brokerId: string, editorId: string) => void;
  getLinkedEditors: (brokerId: string) => string[];
}

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
  // Extract used colors
  const usedColors = new Set(
    Object.values(brokers)
      .filter((broker) => !broker.isDeleted)
      .map((broker) => broker.color.light)
  );

  // Find the first available unique color
  const availableColor =
    brokerColors.find((color) => !usedColors.has(color.light)) ||
    brokerColors[Math.floor(Math.random() * brokerColors.length)];

  return availableColor;
};

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
    const displayName =
      content
        .replace(/[^\w\s]/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 15) || "New Broker";

    const broker: Broker = {
      id,
      displayName,
      officialName: displayName,
      value: content,
      componentType: "input",
      instructions: "",
      defaultSource: "None",
      isConnected: true,
      isReady: false,
      isDeleted: false,
      color: getNextAvailableColor(state.brokers),
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

    set((state) => {
      const count = state.brokerCount + 1;
      const broker: Broker = {
        id,
        displayName: `New Broker ${count}`,
        officialName: `New Broker ${count}`,
        value: "",
        componentType: "input",
        instructions: "",
        defaultSource: "None",
        isConnected: true,
        isReady: false,
        isDeleted: false,
        color: getNextAvailableColor(state.brokers),
      };

      return {
        brokers: {
          ...state.brokers,
          [id]: broker,
        },
        brokerCount: count,
      };
    });

    return get().brokers[id];
  },

  updateBroker: (id, data) => {
    set((state) => ({
      brokers: {
        ...state.brokers,
        [id]: { ...state.brokers[id], ...data },
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
