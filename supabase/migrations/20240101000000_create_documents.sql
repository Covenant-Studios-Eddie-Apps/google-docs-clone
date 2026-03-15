create table documents (
  id uuid primary key default gen_random_uuid(),
  title text not null default 'Untitled document',
  content jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Enable realtime
alter publication supabase_realtime add table documents;
