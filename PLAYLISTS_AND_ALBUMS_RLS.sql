-- ==========================================
-- SMASHIFY PLAYLISTS & LIBRARY ALBUM SAVING SCHEMA
-- Run this SQL in your Supabase SQL Editor
-- ==========================================

-- 1. Create Playlists Table (if not exists)
-- This table stores both custom user playlists and saved copies of curated charts/albums
CREATE TABLE IF NOT EXISTS public.playlists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    cover_url TEXT,
    is_public BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Create Playlist Songs Table (if not exists)
-- This is the junction table that maps individual songs/tracks to their respective playlists
CREATE TABLE IF NOT EXISTS public.playlist_songs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    playlist_id UUID NOT NULL REFERENCES public.playlists(id) ON DELETE CASCADE,
    song_id UUID NOT NULL REFERENCES public.songs(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    -- Ensures a track is not duplicated inside the same playlist
    CONSTRAINT unique_playlist_song UNIQUE (playlist_id, song_id)
);

-- ==========================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==========================================

-- Enable Row Level Security (RLS)
ALTER TABLE public.playlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.playlist_songs ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------
-- Playlists Table Policies
-- ------------------------------------------

-- SELECT POLICY: Users can view playlists if they own them OR if the playlist is public
DROP POLICY IF EXISTS "select_playlists" ON public.playlists;
CREATE POLICY "select_playlists" ON public.playlists
    FOR SELECT
    USING (is_public = true OR auth.uid() = profile_id);

-- INSERT POLICY: Logged-in users can create playlists for themselves
DROP POLICY IF EXISTS "insert_own_playlists" ON public.playlists;
CREATE POLICY "insert_own_playlists" ON public.playlists
    FOR INSERT
    WITH CHECK (auth.uid() = profile_id);

-- UPDATE POLICY: Owners can edit their own playlists
DROP POLICY IF EXISTS "update_own_playlists" ON public.playlists;
CREATE POLICY "update_own_playlists" ON public.playlists
    FOR UPDATE
    USING (auth.uid() = profile_id)
    WITH CHECK (auth.uid() = profile_id);

-- DELETE POLICY: Owners can delete their own playlists
DROP POLICY IF EXISTS "delete_own_playlists" ON public.playlists;
CREATE POLICY "delete_own_playlists" ON public.playlists
    FOR DELETE
    USING (auth.uid() = profile_id);

-- ------------------------------------------
-- Playlist Songs Table Policies
-- ------------------------------------------

-- SELECT POLICY: Users can see songs within playlists they are authorized to access
DROP POLICY IF EXISTS "select_playlist_songs" ON public.playlist_songs;
CREATE POLICY "select_playlist_songs" ON public.playlist_songs
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.playlists p
            WHERE p.id = playlist_songs.playlist_id
            AND (p.is_public = true OR auth.uid() = p.profile_id)
        )
    );

-- INSERT POLICY: Users can add songs to playlists they own
DROP POLICY IF EXISTS "insert_playlist_songs_owner" ON public.playlist_songs;
CREATE POLICY "insert_playlist_songs_owner" ON public.playlist_songs
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.playlists p
            WHERE p.id = playlist_songs.playlist_id
            AND auth.uid() = p.profile_id
        )
    );

-- DELETE POLICY: Users can remove songs from playlists they own
DROP POLICY IF EXISTS "delete_playlist_songs_owner" ON public.playlist_songs;
CREATE POLICY "delete_playlist_songs_owner" ON public.playlist_songs
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.playlists p
            WHERE p.id = playlist_songs.playlist_id
            AND auth.uid() = p.profile_id
        )
    );
