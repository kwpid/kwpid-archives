-- Migration: Add Albums, Album Tracks, and Producer field
-- Run this in your Supabase SQL Editor

-- 1. Add producer field to songs table
ALTER TABLE songs ADD COLUMN IF NOT EXISTS producer TEXT;

-- 2. Create albums table
CREATE TABLE IF NOT EXISTS albums (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    cover_image_url TEXT,
    release_date DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. If albums table already exists, add the new columns (do this before creating indexes)
ALTER TABLE albums ADD COLUMN IF NOT EXISTS album_type TEXT DEFAULT 'standard';
ALTER TABLE albums ADD COLUMN IF NOT EXISTS parent_album_id UUID REFERENCES albums(id) ON DELETE SET NULL;
ALTER TABLE albums ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Unreleased'; -- 'Released' or 'Unreleased'

-- 4. Create album_tracks junction table (many-to-many relationship)
CREATE TABLE IF NOT EXISTS album_tracks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    album_id UUID NOT NULL REFERENCES albums(id) ON DELETE CASCADE,
    song_id UUID NOT NULL REFERENCES songs(id) ON DELETE CASCADE,
    track_number INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(album_id, song_id)
);

-- 5. Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_album_tracks_album_id ON album_tracks(album_id);
CREATE INDEX IF NOT EXISTS idx_album_tracks_song_id ON album_tracks(song_id);
CREATE INDEX IF NOT EXISTS idx_albums_release_date ON albums(release_date);
CREATE INDEX IF NOT EXISTS idx_albums_parent_album_id ON albums(parent_album_id);
CREATE INDEX IF NOT EXISTS idx_albums_album_type ON albums(album_type);

