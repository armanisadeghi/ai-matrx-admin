/**
 * Audio Safety Store — IndexedDB Persistence
 *
 * Persists audio chunks and transcription text to IndexedDB so that
 * recordings are never lost, even on crashes, navigation, or tab closure.
 *
 * Uses raw IndexedDB API (no dependencies) with ArrayBuffer storage
 * for iOS Safari compatibility.
 */

import { SAFETY_STORE_CONFIG } from '../constants';

export type SafetyRecordStatus = 'recording' | 'transcribing' | 'complete' | 'failed';

export interface SafetyRecord {
  id: string;
  sessionId: string;
  audioChunks: ArrayBuffer[];
  mimeType: string;
  accumulatedText: string;
  status: SafetyRecordStatus;
  failedChunkIndices: number[];
  errorMessage?: string;
  createdAt: number;
  updatedAt: number;
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(SAFETY_STORE_CONFIG.DB_NAME, SAFETY_STORE_CONFIG.DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(SAFETY_STORE_CONFIG.STORE_NAME)) {
        const store = db.createObjectStore(SAFETY_STORE_CONFIG.STORE_NAME, { keyPath: 'id' });
        store.createIndex('status', 'status', { unique: false });
        store.createIndex('createdAt', 'createdAt', { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function tx(
  db: IDBDatabase,
  mode: IDBTransactionMode,
): IDBObjectStore {
  const transaction = db.transaction(SAFETY_STORE_CONFIG.STORE_NAME, mode);
  return transaction.objectStore(SAFETY_STORE_CONFIG.STORE_NAME);
}

function promisify<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function blobToArrayBuffer(blob: Blob): Promise<ArrayBuffer> {
  return blob.arrayBuffer();
}

function arrayBuffersToBlob(buffers: ArrayBuffer[], mimeType: string): Blob {
  return new Blob(buffers, { type: mimeType });
}

export const audioSafetyStore = {
  async createEntry(id: string, sessionId: string, mimeType: string): Promise<void> {
    const db = await openDB();
    const record: SafetyRecord = {
      id,
      sessionId,
      audioChunks: [],
      mimeType,
      accumulatedText: '',
      status: 'recording',
      failedChunkIndices: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    await promisify(tx(db, 'readwrite').put(record));
    db.close();
  },

  async saveChunk(id: string, blob: Blob): Promise<void> {
    const db = await openDB();
    const store = tx(db, 'readwrite');
    const record = await promisify(store.get(id)) as SafetyRecord | undefined;
    if (!record) {
      db.close();
      return;
    }
    const buffer = await blobToArrayBuffer(blob);
    record.audioChunks.push(buffer);
    record.updatedAt = Date.now();
    await promisify(store.put(record));
    db.close();
  },

  async saveText(id: string, text: string): Promise<void> {
    const db = await openDB();
    const store = tx(db, 'readwrite');
    const record = await promisify(store.get(id)) as SafetyRecord | undefined;
    if (!record) {
      db.close();
      return;
    }
    record.accumulatedText = text;
    record.updatedAt = Date.now();
    await promisify(store.put(record));
    db.close();
  },

  async addFailedChunk(id: string, chunkIndex: number): Promise<void> {
    const db = await openDB();
    const store = tx(db, 'readwrite');
    const record = await promisify(store.get(id)) as SafetyRecord | undefined;
    if (!record) {
      db.close();
      return;
    }
    if (!record.failedChunkIndices.includes(chunkIndex)) {
      record.failedChunkIndices.push(chunkIndex);
    }
    record.updatedAt = Date.now();
    await promisify(store.put(record));
    db.close();
  },

  async setStatus(id: string, status: SafetyRecordStatus, errorMessage?: string): Promise<void> {
    const db = await openDB();
    const store = tx(db, 'readwrite');
    const record = await promisify(store.get(id)) as SafetyRecord | undefined;
    if (!record) {
      db.close();
      return;
    }
    record.status = status;
    if (errorMessage !== undefined) record.errorMessage = errorMessage;
    record.updatedAt = Date.now();
    await promisify(store.put(record));
    db.close();
  },

  async markComplete(id: string): Promise<void> {
    await this.setStatus(id, 'complete');
  },

  async markFailed(id: string, errorMessage: string): Promise<void> {
    await this.setStatus(id, 'failed', errorMessage);
  },

  async getEntry(id: string): Promise<SafetyRecord | null> {
    const db = await openDB();
    const record = await promisify(tx(db, 'readonly').get(id)) as SafetyRecord | undefined;
    db.close();
    return record ?? null;
  },

  async getAudioBlob(id: string): Promise<Blob | null> {
    const record = await this.getEntry(id);
    if (!record || record.audioChunks.length === 0) return null;
    return arrayBuffersToBlob(record.audioChunks, record.mimeType);
  },

  async getOrphaned(): Promise<SafetyRecord[]> {
    const db = await openDB();
    const store = tx(db, 'readonly');
    const all = await promisify(store.getAll()) as SafetyRecord[];
    db.close();
    return all.filter(r => r.status !== 'complete');
  },

  async deleteEntry(id: string): Promise<void> {
    const db = await openDB();
    await promisify(tx(db, 'readwrite').delete(id));
    db.close();
  },

  async deleteAllComplete(): Promise<void> {
    const db = await openDB();
    const store = tx(db, 'readwrite');
    const all = await promisify(store.getAll()) as SafetyRecord[];
    for (const record of all) {
      if (record.status === 'complete') {
        await promisify(store.delete(record.id));
      }
    }
    db.close();
  },

  async clearAll(): Promise<void> {
    const db = await openDB();
    await promisify(tx(db, 'readwrite').clear());
    db.close();
  },
};
