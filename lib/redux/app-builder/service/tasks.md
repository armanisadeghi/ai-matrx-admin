
Updated Database Structures:

create table public.custom_app_configs (
  id uuid not null default gen_random_uuid (),
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone null default now(),
  user_id uuid null default gen_random_uuid (),
  is_public boolean null default false,
  authenticated_read boolean null default true,
  public_read boolean null default true,
  name character varying not null,
  description text null default ''::text,
  slug character varying not null,
  main_app_icon character varying null default 'LayoutTemplate'::character varying,
  main_app_submit_icon character varying null default 'Search'::character varying,
  creator character varying null,
  primary_color character varying null default 'gray'::character varying,
  accent_color character varying null default 'rose'::character varying,
  applet_list jsonb null,
  extra_buttons jsonb null,
  layout_type character varying null default 'open'::character varying,
  image_url character varying null,
  constraint custom_app_configs_pkey primary key (id),
  constraint custom_app_configs_slug_key unique (slug),
  constraint custom_app_configs_user_id_fkey foreign KEY (user_id) references auth.users (id) on update CASCADE on delete CASCADE
) TABLESPACE pg_default;



create table public.custom_applet_configs (
  id uuid not null default gen_random_uuid (),
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone null default now(),
  user_id uuid null default gen_random_uuid (),
  is_public boolean null default false,
  authenticated_read boolean null default true,
  public_read boolean null default true,
  name character varying not null,
  description text null,
  slug character varying not null,
  applet_icon character varying null,
  applet_submit_text character varying null,
  creator character varying null,
  primary_color character varying null,
  accent_color character varying null,
  layout_type character varying null,
  containers jsonb null,
  data_source_config jsonb null,
  result_component_config jsonb null,
  next_step_config jsonb null,
  compiled_recipe_id uuid null,
  subcategory_id uuid null,
  image_url character varying null,
  app_id uuid null,
  constraint custom_applet_configs_pkey primary key (id),
  constraint custom_applet_configs_slug_key unique (slug),
  constraint custom_applet_configs_app_id_fkey foreign KEY (app_id) references custom_app_configs (id) on update CASCADE on delete set null,
  constraint custom_applet_configs_compiled_recipe_id_fkey foreign KEY (compiled_recipe_id) references compiled_recipe (id) on update CASCADE on delete set null,
  constraint custom_applet_configs_subcategory_id_fkey foreign KEY (subcategory_id) references subcategory (id) on update CASCADE on delete set null,
  constraint custom_applet_configs_user_id_fkey foreign KEY (user_id) references auth.users (id) on update CASCADE on delete CASCADE
) TABLESPACE pg_default;