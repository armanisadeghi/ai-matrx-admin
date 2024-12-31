// hooks/useBrokersStore.ts
import { create } from "zustand";
import { v4 as uuidv4 } from "uuid";

export interface Broker {
  id: string;
  displayName: string;
  officialName: string;
  value: string;
  componentType: string;
  instructions: string;
  defaultSource: string;
  sourceDetails?: string;
  isConnected: boolean;
  isReady: boolean;
  isDeleted: boolean;
  color: string;
}

interface EditorInstance {
  id: string;
  brokers: Set<string>; // brokers used in this editor
  ref: React.RefObject<HTMLDivElement>;
}

interface BrokersState {
  brokers: Record<string, Broker>;
  brokerCount: number;
  linkedEditors: Record<string, EditorInstance>; // Track which editors use which brokers

  addExistingBroker: (broker: Broker) => void;
  createBrokerFromText: (content: string) => Broker;
  createNewBroker: () => Broker;
  updateBroker: (id: string, data: Partial<Broker>) => void;
  deleteBroker: (id: string) => void;
  getBroker: (id: string) => Broker | undefined;

  // New methods for linking/unlinking
  linkBrokerToEditor: (
    brokerId: string,
    editorId: string,
    editorRef: React.RefObject<HTMLDivElement>
  ) => void;
  unlinkBrokerFromEditor: (brokerId: string, editorId: string) => void;
  getLinkedEditors: (brokerId: string) => string[]; // Returns editor IDs that use this broker
}

const getRandomColor = () => {
  const colors = [
    "rgb(239 68 68)",
    "rgb(34 197 94)",
    "rgb(59 130 246)",
    "rgb(168 85 247)",
    "rgb(234 179 8)",
    "rgb(236 72 153)",
  ];
  return colors[Math.floor(Math.random() * colors.length)];
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
    const id = uuidv4();
    // Clean and truncate content for display name
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
      color: getRandomColor(),
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
        color: getRandomColor(),
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
