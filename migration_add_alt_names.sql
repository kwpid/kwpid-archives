-- Migration: Add alt_names to songs table
alter table songs add column if not exists alt_names text[];
