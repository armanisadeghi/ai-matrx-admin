create table public.transcripts (
  id uuid not null default gen_random_uuid (),
  user_id uuid not null,
  title text not null default 'New Transcript'::text,
  description text null default ''::text,
  segments jsonb not null default '[]'::jsonb,
  metadata jsonb null default '{}'::jsonb,
  audio_file_path text null,
  video_file_path text null,
  source_type text null default 'other'::text,
  tags text[] null default array[]::text[],
  folder_name text null default 'Transcripts'::text,
  is_deleted boolean null default false,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  is_draft boolean null default false,
  draft_saved_at timestamp with time zone null,
  constraint transcripts_pkey primary key (id),
  constraint transcripts_user_id_fkey foreign KEY (user_id) references auth.users (id) on delete CASCADE,
  constraint transcripts_source_type_check check (
    (
      source_type = any (
        array[
          'audio'::text,
          'video'::text,
          'meeting'::text,
          'interview'::text,
          'other'::text
        ]
      )
    )
  )
) TABLESPACE pg_default;

create index IF not exists idx_transcripts_user_id on public.transcripts using btree (user_id) TABLESPACE pg_default;

create index IF not exists idx_transcripts_folder_name on public.transcripts using btree (folder_name) TABLESPACE pg_default;

create index IF not exists idx_transcripts_tags on public.transcripts using gin (tags) TABLESPACE pg_default;

create index IF not exists idx_transcripts_is_deleted on public.transcripts using btree (is_deleted) TABLESPACE pg_default;

create index IF not exists idx_transcripts_created_at on public.transcripts using btree (created_at desc) TABLESPACE pg_default;

create index IF not exists idx_transcripts_updated_at on public.transcripts using btree (updated_at desc) TABLESPACE pg_default;

create index IF not exists idx_transcripts_source_type on public.transcripts using btree (source_type) TABLESPACE pg_default;

create index IF not exists idx_transcripts_search on public.transcripts using gin (
  to_tsvector(
    'english'::regconfig,
    (
      (title || ' '::text) || COALESCE(description, ''::text)
    )
  )
) TABLESPACE pg_default;

create index IF not exists idx_transcripts_is_draft on public.transcripts using btree (is_draft, user_id) TABLESPACE pg_default
where
  (is_deleted = false);

create trigger update_transcripts_updated_at BEFORE
update on transcripts for EACH row
execute FUNCTION update_updated_at_column ();