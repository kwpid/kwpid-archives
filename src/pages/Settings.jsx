import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Copy, FileText, Check } from 'lucide-react';

const formatDate = (dateString) => {
    if (!dateString) return 'Unknown Date';
    // Append T12:00:00 to ensure it falls in the middle of the day, avoiding timezone issues
    const date = new Date(`${dateString}T12:00:00`);
    return date.toLocaleDateString('en-US', {
        month: '2-digit',
        day: '2-digit',
        year: 'numeric'
    });
};

const Settings = () => {
    const [songs, setSongs] = useState([]);
    const [albums, setAlbums] = useState([]);
    const [albumTracks, setAlbumTracks] = useState([]);
    const [loading, setLoading] = useState(true);

    // States for feedback
    const [copiedFull, setCopiedFull] = useState(false);
    const [copiedWritten, setCopiedWritten] = useState(false);
    const [copiedLyrics, setCopiedLyrics] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            
            // Fetch songs
            const { data: songsData, error: songsError } = await supabase
                .from('songs')
                .select('*')
                .order('created_at', { ascending: false });

            if (songsError) {
                console.error('Error fetching songs:', songsError);
            } else {
                setSongs(songsData || []);
            }

            // Fetch albums
            const { data: albumsData, error: albumsError } = await supabase
                .from('albums')
                .select('*')
                .order('release_date', { ascending: true });

            if (albumsError) {
                console.error('Error fetching albums:', albumsError);
            } else {
                setAlbums(albumsData || []);
            }

            // Fetch album tracks
            const { data: tracksData, error: tracksError } = await supabase
                .from('album_tracks')
                .select('*');

            if (tracksError) {
                console.error('Error fetching album tracks:', tracksError);
            } else {
                setAlbumTracks(tracksData || []);
            }

            setLoading(false);
        };

        fetchData();
    }, []);

    const generateSimpleList = (filterCategory) => {
        // For Full songs, use the new era-based format
        if (filterCategory === 'Full') {
            return generateEraBasedList();
        }

        // For Written songs, use the old format
        const mainSongs = songs.filter(s =>
            s.sub_category !== 'Sessions' &&
            s.category === filterCategory
        );

        const sessions = songs.filter(s => s.sub_category === 'Sessions');
        const sessionCounts = {};
        sessions.forEach(session => {
            if (session.parent_id) {
                sessionCounts[session.parent_id] = (sessionCounts[session.parent_id] || 0) + 1;
            }
        });

        let result = '';
        mainSongs.forEach((song, index) => {
            const date = formatDate(song.date_written || song.created_at);
            const sessionCount = sessionCounts[song.id] || 0;
            const category = song.sub_category || 'Unknown';
            const sessionText = sessionCount > 0 ? ` (+${sessionCount} Session${sessionCount > 1 ? 's' : ''})` : '';

            result += `${index + 1}. ${song.title} (${date}) - ${category}${sessionText}\n`;
        });

        return result.trim();
    };

    const generateEraBasedList = () => {
        // Filter Full songs (excluding Sessions)
        const fullSongs = songs.filter(s =>
            s.sub_category !== 'Sessions' &&
            s.category === 'Full'
        );

        // Create a map of song_id -> album name
        const songToAlbum = {};
        albumTracks.forEach(track => {
            const album = albums.find(a => a.id === track.album_id);
            if (album) {
                songToAlbum[track.song_id] = album.name;
            }
        });

        // Sort songs from oldest to newest
        const sortedSongs = [...fullSongs].sort((a, b) => {
            const dateA = a.date_written || a.created_at;
            const dateB = b.date_written || b.created_at;
            if (!dateA) return 1;
            if (!dateB) return -1;
            return new Date(dateA) - new Date(dateB);
        });

        // Define the Early Era cutoff date (11/20/2025)
        const earlyEraCutoff = new Date('2025-11-20T23:59:59');

        // Group songs into eras
        const earlyEraSongs = [];
        const postEarlySongs = [];

        sortedSongs.forEach(song => {
            const songDate = new Date(song.date_written || song.created_at);
            if (songDate <= earlyEraCutoff) {
                earlyEraSongs.push(song);
            } else {
                postEarlySongs.push(song);
            }
        });

        // Filter out deluxe and anniversary albums - only standard albums determine eras
        const standardAlbums = albums.filter(a => 
            a.album_type === 'standard' || !a.album_type
        );

        // Sort albums by release date
        const sortedAlbums = [...standardAlbums].sort((a, b) => 
            new Date(a.release_date) - new Date(b.release_date)
        );

        // Create era boundaries based on albums
        const eras = [];
        
        // Early Era
        if (earlyEraSongs.length > 0) {
            eras.push({
                name: 'Early Era',
                songs: earlyEraSongs,
                startDate: null,
                endDate: earlyEraCutoff
            });
        }

        // Album-based eras
        if (sortedAlbums.length > 0 && postEarlySongs.length > 0) {
            // Process each album era
            for (let i = 0; i < sortedAlbums.length; i++) {
                const album = sortedAlbums[i];
                const albumDate = new Date(album.release_date);
                const nextAlbumDate = i < sortedAlbums.length - 1 
                    ? new Date(sortedAlbums[i + 1].release_date)
                    : null;

                // For the first album: include songs from 11/21/2025 to next album (or end)
                // For subsequent albums: include songs from this album release to next album (or end)
                const eraSongs = postEarlySongs.filter(song => {
                    const songDate = new Date(song.date_written || song.created_at);
                    if (i === 0) {
                        // First album era: from 11/21/2025 to next album release (or end)
                        const startDate = new Date('2025-11-21');
                        if (nextAlbumDate === null) {
                            return songDate >= startDate;
                        } else {
                            return songDate >= startDate && songDate < nextAlbumDate;
                        }
                    } else {
                        // Subsequent albums: from this album release to next album release (or end)
                        if (nextAlbumDate === null) {
                            return songDate >= albumDate;
                        } else {
                            return songDate >= albumDate && songDate < nextAlbumDate;
                        }
                    }
                });

                if (eraSongs.length > 0) {
                    eras.push({
                        name: `${album.name} Era`,
                        songs: eraSongs,
                        startDate: i === 0 ? new Date('2025-11-21') : albumDate,
                        endDate: nextAlbumDate
                    });
                }
            }
        } else if (postEarlySongs.length > 0) {
            // No albums, but there are post-early songs - put them in a default era
            eras.push({
                name: 'Post Early Era',
                songs: postEarlySongs,
                startDate: new Date('2025-11-21'),
                endDate: null
            });
        }

        // Format the output
        let result = '';
        eras.forEach(era => {
            result += `-- ${era.name}\n`;
            era.songs.forEach(song => {
                const date = formatDate(song.date_written || song.created_at);
                const producer = song.producer ? ` [prod. ${song.producer}]` : '';
                const albumName = songToAlbum[song.id] || 'Unreleased';
                
                result += `${song.title}${producer} (${date}) - ${albumName}\n`;
            });
            result += '\n';
        });

        return result.trim();
    };

    const generateLyricsList = () => {
        let result = '';

        // Filter: Only "Full" songs and "Sessions"
        const backupSongs = songs.filter(s =>
            s.category === 'Full' || s.sub_category === 'Sessions'
        );

        backupSongs.forEach((song, index) => {
            const date = formatDate(song.date_written || song.created_at);

            result += `${index + 1}.\n`;
            result += `Title: ${song.title}\n`;
            result += `Date: ${date}\n`;
            result += `Category: ${song.sub_category || song.category}\n`;
            if (song.parent_id) result += `Parent ID: ${song.parent_id}\n`;
            result += `-\n`;
            result += `${song.lyrics || '[No Lyrics]'}\n`;
            result += `\n----------------------------------------\n\n`;
        });

        return result.trim();
    };

    const handleCopyFull = () => {
        const text = generateSimpleList('Full');
        navigator.clipboard.writeText(text).then(() => {
            setCopiedFull(true);
            setTimeout(() => setCopiedFull(false), 2000);
        });
    };

    const handleCopyWritten = () => {
        const text = generateSimpleList('Written');
        navigator.clipboard.writeText(text).then(() => {
            setCopiedWritten(true);
            setTimeout(() => setCopiedWritten(false), 2000);
        });
    };

    const handleCopyLyrics = () => {
        const text = generateLyricsList();
        navigator.clipboard.writeText(text).then(() => {
            setCopiedLyrics(true);
            setTimeout(() => setCopiedLyrics(false), 2000);
        });
    };

    return (
        <div className="max-w-4xl mx-auto">
            <h1 className="text-2xl font-bold text-github-text mb-6">Settings & Tools</h1>

            <div className="grid gap-6">

                {/* Card 1: Formatted Song Lists */}
                <div className="bg-github-bg-secondary border border-github-border rounded-lg p-6">
                    <div className="flex items-start justify-between mb-4">
                        <div>
                            <h2 className="text-lg font-bold text-github-text flex items-center gap-2">
                                <Copy className="w-5 h-5 text-github-accent" />
                                Export Song List
                            </h2>
                            <p className="text-github-text-secondary text-sm mt-1">
                                Copies a formatted list of songs. Choose which category to export.
                            </p>
                        </div>
                    </div>

                    <div className="bg-github-bg border border-github-border rounded p-4 mb-4 font-mono text-xs text-github-text-secondary overflow-x-auto whitespace-pre h-32">
                        {loading ? 'Loading...' : `Preview:\n\n1. Pixel Rush (12/13/2025) - Unreleased (+1 Session)\n...`}
                    </div>

                    <div className="flex flex-col sm:flex-row gap-4">
                        <button
                            onClick={handleCopyFull}
                            disabled={loading}
                            className="flex items-center justify-center gap-2 px-4 py-2 bg-github-accent text-white rounded-md hover:bg-github-accent/90 transition-colors disabled:opacity-50"
                        >
                            {copiedFull ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                            {copiedFull ? 'Copied Full Songs!' : 'Copy Full Songs'}
                        </button>

                        <button
                            onClick={handleCopyWritten}
                            disabled={loading}
                            className="flex items-center justify-center gap-2 px-4 py-2 bg-github-bg border border-github-border text-github-text rounded-md hover:bg-github-border transition-colors disabled:opacity-50"
                        >
                            {copiedWritten ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                            {copiedWritten ? 'Copied Written Songs!' : 'Copy Written Songs'}
                        </button>
                    </div>
                </div>

                {/* Card 2: Full Backup */}
                <div className="bg-github-bg-secondary border border-github-border rounded-lg p-6">
                    <div className="flex items-start justify-between mb-4">
                        <div>
                            <h2 className="text-lg font-bold text-github-text flex items-center gap-2">
                                <FileText className="w-5 h-5 text-github-accent" />
                                Full Backup (With Lyrics)
                            </h2>
                            <p className="text-github-text-secondary text-sm mt-1">
                                Copies raw data for Full songs and Sessions (with lyrics).
                                Excludes Written works.
                            </p>
                        </div>
                    </div>

                    <button
                        onClick={handleCopyLyrics}
                        disabled={loading}
                        className="flex items-center gap-2 px-4 py-2 bg-github-bg border border-github-border text-github-text rounded-md hover:bg-github-border transition-colors disabled:opacity-50"
                    >
                        {copiedLyrics ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                        {copiedLyrics ? 'Copied Raw Data!' : 'Copy Raw Data'}
                    </button>
                </div>

            </div>
        </div>
    );
};

export default Settings;
