'use client';

import React, { useEffect, useRef, useState } from 'react';

import { createClient } from '@supabase/supabase-js';
import { IDBPDatabase } from 'idb';
import { FeatureStore } from '@/lib/idb/feature-store';
import { EditorFile } from '../types';
import { AsyncResult } from '@/types/audioRecording.types';


class EditorStore extends FeatureStore<EditorFile> {
    private static instance: EditorStore;

    private constructor() {
        super('vscode-workspace', 1, 'files');
    }

    public static getInstance(): EditorStore {
        if (!EditorStore.instance) {
            EditorStore.instance = new EditorStore();
        }
        return EditorStore.instance;
    }

    protected setupStores(db: IDBPDatabase): void {
        if (!db.objectStoreNames.contains(this.storeName)) {
            const store = db.createObjectStore(this.storeName, {
                keyPath: 'id',
                autoIncrement: true
            });
            store.createIndex('path', 'path', { unique: true });
            store.createIndex('lastModified', 'lastModified', { unique: false });
        }
    }

    async saveFile(file: Omit<EditorFile, 'id'>): AsyncResult<string> {
        return this.addItem(this.storeName, file as EditorFile);
    }

    async getFile(id: string): AsyncResult<EditorFile> {
        return this.getItem(this.storeName, id);
    }

    async getAllFiles(): AsyncResult<EditorFile[]> {
        return this.getAllItems(this.storeName);
    }
}

export default EditorStore;
