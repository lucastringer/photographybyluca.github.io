-- NORTHLIGHT ARCHIVE DATABASE
-- Run this entire file in Supabase SQL Editor.

create extension if not exists pgcrypto;

create table if not exists public.photos (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null default '',
  price_cents integer not null check (price_cents >= 0),
  category text not null default 'Uncategorized',
  tags text[] not null default '{}',
  preview_path text not null,
  original_path text not null,
  published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists photos_published_idx on public.photos(published);
create index if not exists photos_category_idx on public.photos(category);
create index if not exists photos_tags_idx on public.photos using gin(tags);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  paypal_order_id text unique,
  customer_email text,
  total_cents integer not null check (total_cents >= 0),
  status text not null default 'pending',
  created_at timestamptz not null default now()
);

create index if not exists orders_created_idx on public.orders(created_at desc);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  photo_id uuid not null references public.photos(id),
  title_snapshot text not null,
  price_cents integer not null check (price_cents >= 0),
  created_at timestamptz not null default now()
);

create index if not exists order_items_order_idx on public.order_items(order_id);
create index if not exists order_items_photo_idx on public.order_items(photo_id);

alter table public.photos enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;

-- Public visitors can see only published photo metadata.
drop policy if exists "published photos are public" on public.photos;
create policy "published photos are public"
on public.photos for select
to anon, authenticated
using (published = true);

-- Authenticated admins can manage photos.
drop policy if exists "admins manage photos" on public.photos;
create policy "admins manage photos"
on public.photos for all
to authenticated
using (true)
with check (true);

-- Orders are private. Edge Functions use the service role.
-- No public order policy is created.

insert into storage.buckets (id, name, public)
values ('photo-previews', 'photo-previews', true)
on conflict (id) do update set public = true;

insert into storage.buckets (id, name, public)
values ('photo-originals', 'photo-originals', false)
on conflict (id) do update set public = false;

-- Preview policies
drop policy if exists "public can view previews" on storage.objects;
create policy "public can view previews"
on storage.objects for select
to anon, authenticated
using (bucket_id = 'photo-previews');

drop policy if exists "authenticated can upload previews" on storage.objects;
create policy "authenticated can upload previews"
on storage.objects for insert
to authenticated
with check (bucket_id = 'photo-previews');

drop policy if exists "authenticated can update previews" on storage.objects;
create policy "authenticated can update previews"
on storage.objects for update
to authenticated
using (bucket_id = 'photo-previews')
with check (bucket_id = 'photo-previews');

drop policy if exists "authenticated can delete previews" on storage.objects;
create policy "authenticated can delete previews"
on storage.objects for delete
to authenticated
using (bucket_id = 'photo-previews');

-- Original policies
drop policy if exists "authenticated can upload originals" on storage.objects;
create policy "authenticated can upload originals"
on storage.objects for insert
to authenticated
with check (bucket_id = 'photo-originals');

drop policy if exists "authenticated can delete originals" on storage.objects;
create policy "authenticated can delete originals"
on storage.objects for delete
to authenticated
using (bucket_id = 'photo-originals');

-- The originals bucket intentionally has no public SELECT policy.
