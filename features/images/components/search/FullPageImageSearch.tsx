'use client';
import React, { useState, useCallback, useRef } from 'react';
import { createApi } from 'unsplash-js';
import { Search, CloudUpload, ExternalLink, Loader2, ImageIcon } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { CloudFolders } from '@/features/files/utils/folder-conventions';

const SUGGESTED_TOPICS = ['Nature', 'Architecture', 'People', 'Technology', 'Abstract', 'Animals', 'Travel', 'Food'];

const unsplashApi = (() => {
  try {
    const key = process.env.NEXT_PUBLIC_UNSPLASH_ACCESS_KEY?.trim();
    if (!key) return null;
    return createApi({ accessKey: key });
  } catch {
    return null;
  }
})();

interface UnsplashPhoto {
  id: string;
  urls: { thumb: string; regular: string; full?: string; raw?: string };
  alt_description?: string;
  description?: string;
  user: { name: string };
  links: { html: string };
}

export function FullPageImageSearch() {
  const [query, setQuery] = useState('');
  const [photos, setPhotos] = useState<UnsplashPhoto[]>([]);
  const [loading, setLoading] = useState(false);
  const [savingIds, setSavingIds] = useState<Set<string>>(new Set());
  const [hasSearched, setHasSearched] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const search = useCallback(async (q: string) => {
    const trimmed = q.trim();
    if (!trimmed) return;
    if (!unsplashApi) {
      toast.error('Unsplash API key not configured — add NEXT_PUBLIC_UNSPLASH_ACCESS_KEY to .env.local');
      return;
    }
    setLoading(true);
    setPhotos([]);
    setHasSearched(true);
    try {
      const result = await unsplashApi.search.getPhotos({ query: trimmed, perPage: 30 });
      if (result.type === 'success') {
        setPhotos(result.response.results);
      } else {
        toast.error('Search failed — try again');
      }
    } catch {
      toast.error('Search failed — check your API key and connection');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') search(query);
  };

  const handleTopicClick = (topic: string) => {
    setQuery(topic);
    search(topic);
  };

  const saveToCloud = useCallback(async (photo: UnsplashPhoto) => {
    const url = photo.urls.full || photo.urls.regular;
    setSavingIds((prev) => new Set(prev).add(photo.id));
    try {
      const imgRes = await fetch(url);
      if (!imgRes.ok) throw new Error('Could not fetch image');
      const blob = await imgRes.blob();
      const ext = blob.type.split('/')[1] || 'jpg';
      const file = new File([blob], `unsplash-${photo.id}.${ext}`, { type: blob.type });
      const form = new FormData();
      form.append('file', file);
      form.append('folder', CloudFolders.IMAGES);
      form.append('visibility', 'private');
      const uploadRes = await fetch('/api/images/upload', { method: 'POST', body: form });
      if (!uploadRes.ok) throw new Error(await uploadRes.text());
      toast.success('Saved to your cloud library');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Save failed';
      toast.error(msg);
    } finally {
      setSavingIds((prev) => {
        const next = new Set(prev);
        next.delete(photo.id);
        return next;
      });
    }
  }, []);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Hero search bar */}
      <div className="shrink-0 flex flex-col items-center gap-4 px-6 pt-10 pb-6 border-b border-border bg-card/40">
        <div className="text-center space-y-1">
          <h2 className="text-base font-semibold text-foreground">Search Public Images</h2>
          <p className="text-xs text-muted-foreground">Royalty-free photography powered by Unsplash</p>
        </div>

        <div className="relative w-full max-w-2xl">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search for images — e.g. mountains, office, abstract..."
            className="w-full h-11 bg-background border border-border rounded-xl pl-11 pr-28 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-shadow"
          />
          <button
            onClick={() => search(query)}
            disabled={loading}
            className="absolute right-1.5 top-1/2 -translate-y-1/2 h-8 px-4 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 disabled:opacity-60 transition-colors"
          >
            Search
          </button>
        </div>

        <div className="flex items-center gap-2 flex-wrap justify-center">
          {SUGGESTED_TOPICS.map((topic) => (
            <button
              key={topic}
              onClick={() => handleTopicClick(topic)}
              className="px-3 py-1 rounded-full bg-muted hover:bg-accent text-xs text-muted-foreground hover:text-foreground border border-border transition-colors"
            >
              {topic}
            </button>
          ))}
        </div>
      </div>

      {/* Results */}
      <div className="flex-1 overflow-y-auto p-4">
        {loading && (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        )}

        {!loading && !hasSearched && (
          <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
            <div className="rounded-full bg-muted p-5 border border-border">
              <ImageIcon className="w-7 h-7 text-muted-foreground" />
            </div>
            <div className="space-y-1.5 max-w-xs">
              <p className="text-sm font-medium text-foreground">Search for inspiration</p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Enter a query above or pick a topic to browse royalty-free photos from Unsplash
              </p>
            </div>
          </div>
        )}

        {!loading && hasSearched && photos.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 gap-3 text-center">
            <div className="rounded-full bg-muted p-5 border border-border">
              <Search className="w-7 h-7 text-muted-foreground" />
            </div>
            <div className="space-y-1.5 max-w-xs">
              <p className="text-sm font-medium text-foreground">No results found</p>
              <p className="text-xs text-muted-foreground">Try a different search term or pick a suggested topic</p>
            </div>
          </div>
        )}

        {!loading && photos.length > 0 && (
          <div className="columns-2 sm:columns-3 md:columns-4 lg:columns-5 gap-2">
            {photos.map((photo) => {
              const isSaving = savingIds.has(photo.id);
              const label = photo.alt_description || photo.description || `by ${photo.user.name}`;
              return (
                <div
                  key={photo.id}
                  className="relative mb-2 rounded-lg overflow-hidden group cursor-default"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={photo.urls.regular}
                    alt={label}
                    className="w-full h-auto object-cover block"
                    loading="lazy"
                  />

                  {/* hover overlay */}
                  <div
                    className={cn(
                      'absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-black/30 flex flex-col justify-between p-2.5 transition-opacity duration-200',
                      'opacity-0 group-hover:opacity-100',
                    )}
                  >
                    {/* top-right: external link */}
                    <div className="flex justify-end">
                      <a
                        href={photo.links.html}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="rounded-md bg-white/15 hover:bg-white/30 p-1.5 backdrop-blur-sm transition-colors"
                        title="View on Unsplash"
                      >
                        <ExternalLink className="w-3.5 h-3.5 text-white" />
                      </a>
                    </div>

                    {/* bottom: label + save button */}
                    <div className="flex items-end justify-between gap-2">
                      <p className="text-white text-xs leading-tight line-clamp-2 opacity-90 flex-1">
                        {label}
                      </p>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          saveToCloud(photo);
                        }}
                        disabled={isSaving}
                        className="shrink-0 flex items-center gap-1 rounded-md bg-primary/90 hover:bg-primary px-2.5 py-1.5 text-xs font-medium text-primary-foreground backdrop-blur-sm transition-colors disabled:opacity-60"
                        title="Save to your cloud library"
                      >
                        {isSaving ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <CloudUpload className="w-3 h-3" />
                        )}
                        Save
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
