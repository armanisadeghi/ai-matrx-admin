'use client';
import React, { use, useEffect, useState } from 'react';
import { ImageViewer } from '@/features/images/components/viewer/ImageViewer';
import { getFile } from '@/features/files/api/files';
import type { ImageRecord } from '@/features/images/types';
import type { FileRecordApi } from '@/features/files/types';

function toImageRecord(f: FileRecordApi): ImageRecord {
  return {
    id: f.id,
    name: f.file_name,
    url: f.public_url ?? '',
    size: f.file_size ?? 0,
    mimeType: f.mime_type ?? 'image/*',
    folderPath: f.file_path,
    createdAt: f.created_at ?? new Date().toISOString(),
    fileRecord: f,
  };
}

export default function ImagePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [image, setImage] = useState<ImageRecord | null>(null);

  useEffect(() => {
    getFile(id).then(({ data }) => setImage(toImageRecord(data)));
  }, [id]);

  return <ImageViewer image={image} surface="page" className="h-full" />;
}
