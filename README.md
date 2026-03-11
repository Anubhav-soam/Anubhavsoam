# Website

## Blog Cloud Database Setup (Supabase)

The blog now supports cloud persistence for posts, markdown content, likes, comments, dates, and image data (stored as data URLs in JSON).

If cloud config is not set, it safely falls back to localStorage.

### 1) Create Supabase table
Run this SQL in Supabase SQL editor:

```sql
create table if not exists public.blog_state (
  id text primary key,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.blog_state enable row level security;

create policy "public read blog_state"
on public.blog_state for select
using (true);

create policy "public write blog_state"
on public.blog_state for insert
with check (true);

create policy "public update blog_state"
on public.blog_state for update
using (true)
with check (true);
```

### 2) Add project config
In `index.html`, update `window.BLOG_CLOUD_CONFIG` with your Supabase values:

```html
<script>
  window.BLOG_CLOUD_CONFIG = {
    url: 'https://YOUR_PROJECT_REF.supabase.co',
    anonKey: 'YOUR_SUPABASE_ANON_KEY',
    table: 'blog_state',
    stateId: 'main'
  };
</script>
```

### 3) Deploy
Deploy the site as usual. Once configured, blog changes sync to Supabase and become visible across devices/users.
