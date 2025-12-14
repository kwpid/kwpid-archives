-- Run this in your Supabase SQL Editor to enable Session Files
alter table songs add column parent_id uuid references songs(id);
