// Utility function to get the display image for a song
// If the song is in an album, use the album's cover art instead

/**
 * Get the display image URL for a song
 * @param {Object} song - Song object
 * @param {Object} songToAlbumMap - Map of song_id -> album object with cover_image_url
 * @returns {string|null} - Image URL to display (album cover if in album, otherwise song image_url)
 */
export const getSongDisplayImage = (song, songToAlbumMap) => {
    if (!song) return null;
    
    // Check if song is in an album
    const album = songToAlbumMap?.[song.id];
    if (album?.cover_image_url) {
        return album.cover_image_url;
    }
    
    // Fall back to song's own image_url
    return song.image_url || null;
};

/**
 * Create a map of song_id -> album from album_tracks data
 * @param {Array} albumTracks - Array of album_tracks with album data
 * @returns {Object} - Map of song_id -> album object
 */
export const createSongToAlbumMap = (albumTracks) => {
    const map = {};
    if (albumTracks && Array.isArray(albumTracks)) {
        albumTracks.forEach(track => {
            if (track.song_id && track.albums) {
                map[track.song_id] = track.albums;
            }
        });
    }
    return map;
};

