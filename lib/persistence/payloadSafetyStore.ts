/**
 * Payload Safety Store — IndexedDB persistence for user-authored submissions.
 *
 * Modeled after features/audio/services/audioSafetyStore.ts. Any composer
 * that accepts user input should call `savePending` before the network call,
 * then `markSuccess` on confirmed success or `markFailed` on error. Records
 * left behind in `pending` or `in-flight` state are surfaced to the user
 * by the RequestRecoveryProvider on the next app load.
 *
 * Uses raw IndexedDB (no dependencies), for iOS Safari compatibility.
 */

const DB_NAME = "matrx-payload-safety";
const DB_VERSION = 1;
const STORE_NAME = "payloads";

export type PayloadKind =
  | "agent-run"
  | "chat"
  | "note"
  | "form"
  | "api";

export type PayloadStatus = "pending" | "in-flight" | "failed" | "abandoned";

export interface PayloadRecord {
  id: string;
  kind: PayloadKind;
  /** User-readable label, e.g. "Agent: Travel Helper". Shown in the recovery tray. */
  label: string;
  /** Route href where the user was when they submitted, so "Retry" can deep-link back. */
  routeHref: string;
  /** The original submit payload — whatever shape the caller wants to restore. */
  payload: unknown;
  /** Raw user input text that should be restored into the composer on retry. */
  rawUserInput?: string;
  status: PayloadStatus;
  createdAt: number;
  updatedAt: number;
  errorMessage?: string;
  /** False until the user has opened the recovery UI and seen this record. */
  viewedByUser: boolean;
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: "id" });
        store.createIndex("status", "status", { unique: false });
        store.createIndex("createdAt", "createdAt", { unique: false });
        store.createIndex("kind", "kind", { unique: false });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function store(
  db: IDBDatabase,
  mode: IDBTransactionMode,
): IDBObjectStore {
  return db.transaction(STORE_NAME, mode).objectStore(STORE_NAME);
}

function promisify<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function isAvailable(): boolean {
  return typeof window !== "undefined" && !!window.indexedDB;
}

function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `pay_${crypto.randomUUID()}`;
  }
  return `pay_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

export interface CreatePayloadInput {
  kind: PayloadKind;
  label: string;
  routeHref: string;
  payload: unknown;
  rawUserInput?: string;
  /** Pre-assigned id (useful when caller wants to correlate with an in-memory requestId). */
  id?: string;
}

export const payloadSafetyStore = {
  async savePending(input: CreatePayloadInput): Promise<string> {
    if (!isAvailable()) return input.id ?? newId();
    const db = await openDB();
    const id = input.id ?? newId();
    const now = Date.now();
    const record: PayloadRecord = {
      id,
      kind: input.kind,
      label: input.label,
      routeHref: input.routeHref,
      payload: input.payload,
      rawUserInput: input.rawUserInput,
      status: "pending",
      createdAt: now,
      updatedAt: now,
      viewedByUser: false,
    };
    await promisify(store(db, "readwrite").put(record));
    db.close();
    return id;
  },

  async markInFlight(id: string): Promise<void> {
    if (!isAvailable()) return;
    await patch(id, (r) => {
      r.status = "in-flight";
    });
  },

  async markSuccess(id: string): Promise<void> {
    if (!isAvailable()) return;
    const db = await openDB();
    await promisify(store(db, "readwrite").delete(id));
    db.close();
  },

  async markFailed(id: string, errorMessage: string): Promise<void> {
    if (!isAvailable()) return;
    await patch(id, (r) => {
      r.status = "failed";
      r.errorMessage = errorMessage;
    });
  },

  async markViewed(id: string): Promise<void> {
    if (!isAvailable()) return;
    await patch(id, (r) => {
      r.viewedByUser = true;
    });
  },

  async updatePayload(
    id: string,
    updates: Partial<Pick<PayloadRecord, "payload" | "rawUserInput" | "label">>,
  ): Promise<void> {
    if (!isAvailable()) return;
    await patch(id, (r) => {
      if (updates.payload !== undefined) r.payload = updates.payload;
      if (updates.rawUserInput !== undefined)
        r.rawUserInput = updates.rawUserInput;
      if (updates.label !== undefined) r.label = updates.label;
    });
  },

  async getEntry(id: string): Promise<PayloadRecord | null> {
    if (!isAvailable()) return null;
    const db = await openDB();
    const record = (await promisify(store(db, "readonly").get(id))) as
      | PayloadRecord
      | undefined;
    db.close();
    return record ?? null;
  },

  /** Any record that did NOT complete successfully is orphaned and recoverable. */
  async getOrphaned(): Promise<PayloadRecord[]> {
    if (!isAvailable()) return [];
    const db = await openDB();
    const all = (await promisify(
      store(db, "readonly").getAll(),
    )) as PayloadRecord[];
    db.close();
    // Anything still in the store is by definition non-successful
    // (markSuccess deletes). Sort newest first.
    return all.sort((a, b) => b.createdAt - a.createdAt);
  },

  async getAll(): Promise<PayloadRecord[]> {
    if (!isAvailable()) return [];
    const db = await openDB();
    const all = (await promisify(
      store(db, "readonly").getAll(),
    )) as PayloadRecord[];
    db.close();
    return all.sort((a, b) => b.createdAt - a.createdAt);
  },

  async deleteEntry(id: string): Promise<void> {
    if (!isAvailable()) return;
    const db = await openDB();
    await promisify(store(db, "readwrite").delete(id));
    db.close();
  },

  async clearAll(): Promise<void> {
    if (!isAvailable()) return;
    const db = await openDB();
    await promisify(store(db, "readwrite").clear());
    db.close();
  },
};

async function patch(
  id: string,
  update: (record: PayloadRecord) => void,
): Promise<void> {
  const db = await openDB();
  const s = store(db, "readwrite");
  const record = (await promisify(s.get(id))) as PayloadRecord | undefined;
  if (!record) {
    db.close();
    return;
  }
  update(record);
  record.updatedAt = Date.now();
  await promisify(s.put(record));
  db.close();
}
