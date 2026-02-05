-- NikaClaw (minimal) schema

create table if not exists public.tasks (
  id text primary key,
  title text not null,
  status text not null default 'not_started',
  parent_id text null,
  detail text null,
  notes jsonb null,
  artifacts jsonb null,
  how_to_test text null,
  human_needed boolean not null default false,
  human_needed_reason text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists tasks_status_idx on public.tasks(status);
create index if not exists tasks_parent_idx on public.tasks(parent_id);

create table if not exists public.events (
  id bigserial primary key,
  ts timestamptz not null default now(),
  type text not null,
  detail jsonb null
);

create index if not exists events_ts_idx on public.events(ts desc);

-- NOTE: For now, keep RLS off (default) if you want it to work immediately with anon key.
-- If you want privacy, enable RLS + add policies for authenticated users only.
