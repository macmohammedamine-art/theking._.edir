-- theking._.edit — Supabase schema
-- Run this once in Supabase SQL Editor. Replace the seed admin email below.

create extension if not exists pgcrypto;

create table if not exists public.admin_allowlist (
  email text primary key,
  created_at timestamptz not null default now()
);

-- IMPORTANT: replace this placeholder with the owner's Google email before going live.
insert into public.admin_allowlist(email) values ('admin@example.com') on conflict do nothing;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.admin_allowlist
    where lower(email) = lower(coalesce(auth.jwt() ->> 'email',''))
  );
$$;
revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  name text,
  avatar text,
  role text not null default 'user' check(role in ('user','admin')),
  created_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles(id,email,name,avatar,role)
  values(new.id,new.email,new.raw_user_meta_data->>'full_name',new.raw_user_meta_data->>'avatar_url',case when exists(select 1 from public.admin_allowlist where lower(email)=lower(new.email)) then 'admin' else 'user' end)
  on conflict (id) do update set email=excluded.email,name=excluded.name,avatar=excluded.avatar;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
for each row execute procedure public.handle_new_user();

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name_ar text not null,
  name_en text not null,
  name_fr text not null,
  icon text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.content (
  id uuid primary key default gen_random_uuid(),
  type text not null check(type in ('app','website','tool','ai_tool')),
  slug text unique not null,
  title text not null default '',
  title_ar text,
  title_en text,
  title_fr text,
  description text,
  description_ar text,
  description_en text,
  description_fr text,
  full_description text,
  full_description_ar text,
  full_description_en text,
  full_description_fr text,
  icon text,
  cover_image text,
  screenshots text[] not null default '{}',
  category_id uuid references public.categories(id) on delete set null,
  tags text[] not null default '{}',
  features text[] not null default '{}',
  languages text[] not null default '{}',
  pricing text not null default 'free' check(pricing in ('free','freemium','paid','unknown')),
  platform text[] not null default '{}',
  developer text,
  company text,
  version text,
  last_updated text,
  official_url text,
  google_play_url text,
  app_store_url text,
  other_official_url text,
  featured boolean not null default false,
  published boolean not null default false,
  deleted_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.prompts (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title text not null default '',
  title_ar text,
  title_en text,
  title_fr text,
  description text,
  description_ar text,
  description_en text,
  description_fr text,
  prompt text not null default '',
  icon text,
  preview_image text,
  category_id uuid references public.categories(id) on delete set null,
  tags text[] not null default '{}',
  ai_tool text,
  language text,
  result_type text,
  featured boolean not null default false,
  published boolean not null default false,
  deleted_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists content_type_idx on public.content(type);
create index if not exists content_published_idx on public.content(published) where deleted_at is null;
create index if not exists content_featured_idx on public.content(featured) where published=true and deleted_at is null;
create index if not exists prompts_published_idx on public.prompts(published) where deleted_at is null;

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$ begin new.updated_at=now(); return new; end; $$;
drop trigger if exists content_updated_at on public.content;
create trigger content_updated_at before update on public.content for each row execute procedure public.set_updated_at();
drop trigger if exists prompts_updated_at on public.prompts;
create trigger prompts_updated_at before update on public.prompts for each row execute procedure public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.admin_allowlist enable row level security;
alter table public.categories enable row level security;
alter table public.content enable row level security;
alter table public.prompts enable row level security;

-- Public discovery
create policy "profiles own read" on public.profiles for select to authenticated using (id=auth.uid());
create policy "public categories read" on public.categories for select using (true);
create policy "public published content read" on public.content for select using (published=true and deleted_at is null);
create policy "public published prompts read" on public.prompts for select using (published=true and deleted_at is null);

-- Admin write + private draft access. RLS is evaluated server-side by Postgres.
create policy "admins read all content" on public.content for select to authenticated using (public.is_admin());
create policy "admins insert content" on public.content for insert to authenticated with check (public.is_admin());
create policy "admins update content" on public.content for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admins delete content" on public.content for delete to authenticated using (public.is_admin());
create policy "admins read all prompts" on public.prompts for select to authenticated using (public.is_admin());
create policy "admins insert prompts" on public.prompts for insert to authenticated with check (public.is_admin());
create policy "admins update prompts" on public.prompts for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admins delete prompts" on public.prompts for delete to authenticated using (public.is_admin());
create policy "admins write categories" on public.categories for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Storage bucket for compressed web images.
insert into storage.buckets(id,name,public,file_size_limit) values ('media','media',true,52428800) on conflict (id) do nothing;

create policy "public media read" on storage.objects for select using (bucket_id='media');
create policy "admins upload media" on storage.objects for insert to authenticated with check (bucket_id='media' and public.is_admin());
create policy "admins update media" on storage.objects for update to authenticated using (bucket_id='media' and public.is_admin()) with check (bucket_id='media' and public.is_admin());
create policy "admins delete media" on storage.objects for delete to authenticated using (bucket_id='media' and public.is_admin());

insert into public.categories(slug,name_ar,name_en,name_fr,icon,sort_order) values
('apps','التطبيقات','Apps','Applications','📱',1),
('websites','المواقع','Websites','Sites web','🌐',2),
('tools','الأدوات','Tools','Outils','🛠️',3),
('ai','الذكاء الاصطناعي','AI','IA','🤖',4),
('design','التصميم','Design','Design','🎨',5),
('photo','الصور','Photo','Photo','🖼️',6),
('video','الفيديو','Video','Vidéo','🎬',7),
('writing','الكتابة','Writing','Écriture','✍️',8),
('productivity','الإنتاجية','Productivity','Productivité','⚡',9),
('education','التعليم','Education','Éducation','📚',10),
('gaming','الألعاب','Gaming','Jeux','🎮',11),
('prompts','البرومبتات','Prompts','Prompts','🧠',12)
on conflict (slug) do nothing;

-- Keep the frontend key public; never put service_role in browser code.
