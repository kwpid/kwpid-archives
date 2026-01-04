// Utility functions for calculating song eras

/**
 * Calculate the era name for a given song based on albums and date
 * @param {Object} song - Song object with date_written or created_at
 * @param {Array} albums - Array of standard albums (sorted by release_date)
 * @returns {string} - Era name (e.g., "Early Era", "Skaterboy Era")
 */
export const getSongEra = (song, albums) => {
    if (!song) return 'Unknown Era';
    
    // Filter to only standard albums
    const standardAlbums = albums.filter(a => a.album_type === 'standard' || !a.album_type);
    if (standardAlbums.length === 0) {
        // No albums, check if it's early era
        const songDate = new Date(song.date_written || song.created_at);
        const earlyEraCutoff = new Date('2025-11-20T23:59:59');
        return songDate <= earlyEraCutoff ? 'Early Era' : 'Post Early Era';
    }

    const songDate = new Date(song.date_written || song.created_at);
    const earlyEraCutoff = new Date('2025-11-20T23:59:59');

    // Early Era: before 11/20/2025
    if (songDate <= earlyEraCutoff) {
        return 'Early Era';
    }

    // Sort albums by release date
    const sortedAlbums = [...standardAlbums].sort((a, b) => 
        new Date(a.release_date) - new Date(b.release_date)
    );

    // Find which era this song belongs to
    for (let i = 0; i < sortedAlbums.length; i++) {
        const album = sortedAlbums[i];
        const albumDate = new Date(album.release_date);
        const nextAlbumDate = i < sortedAlbums.length - 1 
            ? new Date(sortedAlbums[i + 1].release_date)
            : null;

        if (i === 0) {
            // First album era: from 11/21/2025 to next album (or end)
            const startDate = new Date('2025-11-21');
            if (nextAlbumDate === null) {
                if (songDate >= startDate) {
                    return `${album.name} Era`;
                }
            } else {
                if (songDate >= startDate && songDate < nextAlbumDate) {
                    return `${album.name} Era`;
                }
            }
        } else {
            // Subsequent albums: from album release to next album (or end)
            if (nextAlbumDate === null) {
                if (songDate >= albumDate) {
                    return `${album.name} Era`;
                }
            } else {
                if (songDate >= albumDate && songDate < nextAlbumDate) {
                    return `${album.name} Era`;
                }
            }
        }
    }

    return 'Unknown Era';
};

