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
        return '';
    };

    const generateEraBasedList = () => {
        // Filter Full songs (excluding Sessions)
        const fullSongs = songs.filter(s =>
            s.sub_category !== 'Sessions' &&
            s.category === 'Full'
        );

        // Get sessions to map to parents
        const sessions = songs.filter(s => s.sub_category === 'Sessions');
        const sessionsMap = {};
        sessions.forEach(session => {
            if (session.parent_id) {
                if (!sessionsMap[session.parent_id]) {
                    sessionsMap[session.parent_id] = [];
                }
                sessionsMap[session.parent_id].push(session);
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

        // Define the Early Era cutoff date (11/20/2025)
        const earlyEraCutoff = new Date('2025-11-20T23:59:59');

        // Group songs into eras
        const eras = [];

        // Helper to add songs to eras based on date ranges
        const addEra = (name, startDate, endDate) => {
            const eraSongs = fullSongs.filter(song => {
                const songDate = new Date(song.date_written || song.created_at);
                if (startDate && endDate) {
                    return songDate >= startDate && songDate < endDate;
                } else if (startDate) {
                    return songDate >= startDate;
                } else if (endDate) {
                    return songDate <= endDate;
                }
                return false;
            });

            if (eraSongs.length > 0) {
                // Sort songs from oldest to newest within the era
                eraSongs.sort((a, b) => {
                    const dateA = new Date(a.date_written || a.created_at);
                    const dateB = new Date(b.date_written || b.created_at);
                    return dateA - dateB;
                });

                eras.push({
                    name,
                    songs: eraSongs
                });
            }
        };

        // 1. Early Era
        addEra('Early Era', null, earlyEraCutoff);

        // 2. Album Eras
        for (let i = 0; i < sortedAlbums.length; i++) {
            const album = sortedAlbums[i];
            const albumDate = new Date(album.release_date);
            const nextAlbumDate = i < sortedAlbums.length - 1
                ? new Date(sortedAlbums[i + 1].release_date)
                : null;

            // Start date logic: First album starts 11/21/2025, others start at release
            const startDate = i === 0 ? new Date('2025-11-21') : albumDate;

            addEra(`${album.name} Era`, startDate, nextAlbumDate);
        }

        // 3. Post Early Era (if no albums or after last album)
        // Check for any songs after the last album (or after early era if no albums)
        let lastDate = sortedAlbums.length > 0
            ? new Date(sortedAlbums[sortedAlbums.length - 1].release_date)
            : new Date('2025-11-21');

        // If we have albums, the loop covered up to the last album's "era" (which goes to infinity if nextAlbumDate is null)
        // But wait, the loop used `nextAlbumDate`. For the last album, `nextAlbumDate` is null, so it captures everything after.
        // So we might not need "Post Early Era" logic separately if albums exist.
        // BUT if no albums exist, we need to capture "Post Early Era".

        if (sortedAlbums.length === 0) {
            addEra('Post Early Era', new Date('2025-11-21'), null);
        }


        // Format the output
        let result = '';

        const totalSessions = sessions.length;
        // Total full songs is just fullSongs.length

        result += `**Total Complete Songs: ${fullSongs.length}**\n`;
        result += `**Total Sessions: ${totalSessions}**\n\n`;

        eras.forEach(era => {
            result += `# ${era.name}\n`;
            era.songs.forEach((song, index) => {
                const date = formatDate(song.date_written || song.created_at);
                const producer = song.producer ? ` \`prod. ${song.producer}\`` : '';
                const hasSession = sessionsMap[song.id] && sessionsMap[song.id].length > 0;
                const sessionStr = hasSession ? ' [+ Session]' : '';

                result += `${index + 1}. **${song.title}**${producer} (${date})${sessionStr}\n`;
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
                    </div>
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
    );
};

export default Settings;
