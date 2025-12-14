-- Kwpid Archives Database Schema

-- 1. Create Profiles Table (Linked to Auth)
create table public.profiles (
  id uuid references auth.users on delete cascade not null primary key,
  username text unique,
  is_admin boolean default false,
  updated_at timestamp with time zone,
  
  constraint username_length check (char_length(username) >= 3)
);

-- 2. Trigger to create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, username, is_admin)
  values (new.id, new.raw_user_meta_data->>'username', false); -- Default is_admin is false
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 3. Create Songs Table
create table public.songs (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  category text not null check (category in ('Full', 'Written')),
  sub_category text check (sub_category in ('Released', 'Unreleased', 'Demos', 'Sessions')),
  lyrics text,
  date_written date,
  version_number text,
  image_url text, -- Store the public URL from Storage
  beat_link text,
  description text,
  time_taken text,
  created_at timestamp with time zone default now()
);

-- 4. Enable Row Level Security (RLS)
alter table public.profiles enable row level security;
alter table public.songs enable row level security;

-- 5. Policies

-- Profiles: 
-- Public read access to profiles (optional, maybe unrestricted for now)
create policy "Public profiles are viewable by everyone."
  on public.profiles for select
  using ( true );

-- Users update their own profile
create policy "Users can insert their own profile."
  on public.profiles for insert
  with check ( auth.uid() = id );

create policy "Users can update own profile."
  on public.profiles for update
  using ( auth.uid() = id );

-- Songs:
-- Public can view all songs
create policy "Songs are viewable by everyone"
  on public.songs for select
  using ( true );

-- Only Admins can insert/update/delete songs
-- We check if the current user exists in profiles and has is_admin = true
create policy "Admins can insert songs"
  on public.songs for insert
  with check (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
      and profiles.is_admin = true
    )
  );

create policy "Admins can update songs"
  on public.songs for update
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
      and profiles.is_admin = true
    )
  );

create policy "Admins can delete songs"
  on public.songs for delete
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
      and profiles.is_admin = true
    )
  );

-- 6. Storage (OPTIONAL - Run this if you create a storage bucket named 'song-images')
-- insert into storage.buckets (id, name, public) values ('song-images', 'song-images', true);
-- create policy "Public Access" on storage.objects for select using ( bucket_id = 'song-images' );
-- create policy "Admin Upload" on storage.objects for insert with check ( bucket_id = 'song-images' and exists (select 1 from public.profiles where id = auth.uid() and is_admin = true) );

-- 6. Storage Config
insert into storage.buckets (id, name, public) values ('song-images', 'song-images', true);
create policy "Public Access" on storage.objects for select using ( bucket_id = 'song-images' );
create policy "Admin Upload" on storage.objects for insert with check ( bucket_id = 'song-images' and exists (select 1 from public.profiles where id = auth.uid() and is_admin = true) );
