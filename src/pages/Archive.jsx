import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { getSongEra } from '../lib/eraUtils';
import { getSongDisplayImage, createSongToAlbumMap } from '../lib/songImageUtils';
import { Music, Calendar, Clock, ArrowUpDown, ArrowUp, ArrowDown, Search, Folder, ChevronRight, ChevronDown, FileText } from 'lucide-react';

const formatDate = (dateString) => {
    if (!dateString) return 'Unknown Date';
    const date = new Date(`${dateString}T12:00:00`);
    return date.toLocaleDateString('en-US', {
        month: '2-digit',
        day: '2-digit',
        year: 'numeric'
    });
};

const SongLink = ({ song }) => (
    <Link
        to={`/song/${song.id}`}
        className="flex items-center gap-3 p-2 hover:bg-github-accent/10 rounded-lg group transition-all border border-transparent hover:border-github-accent/20"
    >
        <div className="w-8 h-8 rounded bg-github-bg border border-github-border flex-shrink-0 flex items-center justify-center overflow-hidden group-hover:border-github-accent/50">
            {song.displayImage ? (
                <img src={song.displayImage} alt="" className="w-full h-full object-cover" />
            ) : (
                <Music className="w-4 h-4 text-github-text-secondary group-hover:text-github-accent" />
            )}
        </div>
        <div className="min-w-0 flex-1">
            <div className="text-sm font-medium text-github-text group-hover:text-github-accent transition-colors truncate">
                {song.title}
            </div>
            <div className="text-[10px] text-github-text-secondary font-mono">
                {formatDate(song.date_written || song.created_at)}
            </div>
        </div>
        <FileText className="w-4 h-4 text-github-text-secondary opacity-0 group-hover:opacity-100 transition-opacity" />
    </Link>
);

const Archive = () => {
    const [songs, setSongs] = useState([]);
    const [albums, setAlbums] = useState([]);
    const [albumTracks, setAlbumTracks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [expandedFolders, setExpandedFolders] = useState({});

    // Filters & Search
    const [searchQuery, setSearchQuery] = useState('');
    
    const isFull = true;
    const dbCategory = 'Full';
    const displayTitle = 'Files';

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);

            // Fetch songs including sessions
            let query = supabase
                .from('songs')
                .select('*')
                .eq('category', dbCategory);

            const { data: songsData, error: songsError } = await query;

            if (songsError) {
                console.error('Error fetching songs:', songsError);
            } else {
                setSongs(songsData || []);
            }

            // Fetch albums (for era calculation and cover art)
            const { data: albumsData, error: albumsError } = await supabase
                .from('albums')
                .select('*');

            if (albumsError) {
                console.error('Error fetching albums:', albumsError);
            } else {
                setAlbums(albumsData || []);
            }

            // Fetch album tracks to map songs to albums
            const { data: tracksData, error: tracksError } = await supabase
                .from('album_tracks')
                .select('song_id, albums(id, cover_image_url)');

            if (tracksError) {
                console.error('Error fetching album tracks:', tracksError);
            } else {
                setAlbumTracks(tracksData || []);
            }

            setLoading(false);
        };

        fetchData();
    }, []);

    const toggleFolder = (folderId) => {
        setExpandedFolders(prev => ({
            ...prev,
            [folderId]: !prev[folderId]
        }));
    };

    // Create song to album map for cover art
    const songToAlbumMap = createSongToAlbumMap(albumTracks);

    // Grouping logic
    const groupedSongs = songs.reduce((acc, song) => {
        if (searchQuery && !song.title.toLowerCase().includes(searchQuery.toLowerCase())) {
            return acc;
        }

        const era = getSongEra(song, albums) || 'Unknown Era';
        
        let subFolder = 'Unreleased';
        if (song.sub_category === 'Sessions') {
            subFolder = 'Sessions';
        } else if (song.is_released) {
            subFolder = 'Released';
        }

        if (!acc[era]) acc[era] = { Released: [], Unreleased: [], Sessions: {} };
        
        if (subFolder === 'Sessions') {
            const songTitle = song.title || 'Unknown Song';
            if (!acc[era].Sessions[songTitle]) acc[era].Sessions[songTitle] = [];
            acc[era].Sessions[songTitle].push({
                ...song,
                displayImage: getSongDisplayImage(song, songToAlbumMap)
            });
        } else {
            acc[era][subFolder].push({
                ...song,
                displayImage: getSongDisplayImage(song, songToAlbumMap)
            });
        }
        return acc;
    }, {});

    // Auto-expand folders on search
    useEffect(() => {
        if (searchQuery.trim()) {
            const newExpanded = {};
            Object.keys(groupedSongs).forEach(era => {
                let eraHasMatch = false;
                
                // Released & Unreleased
                ['Released', 'Unreleased'].forEach(sub => {
                    if (groupedSongs[era][sub].length > 0) {
                        newExpanded[`${era}-${sub}`] = true;
                        eraHasMatch = true;
                    }
                });

                // Sessions
                const sessionSongs = Object.keys(groupedSongs[era].Sessions);
                if (sessionSongs.length > 0) {
                    newExpanded[`${era}-Sessions`] = true;
                    eraHasMatch = true;
                    sessionSongs.forEach(songTitle => {
                        newExpanded[`${era}-Sessions-${songTitle}`] = true;
                    });
                }

                if (eraHasMatch) {
                    newExpanded[era] = true;
                }
            });
            setExpandedFolders(newExpanded);
        }
    }, [searchQuery, songs]);

    // Sort eras
    const sortedEras = Object.keys(groupedSongs).sort();

    return (
        <div className="max-w-6xl mx-auto px-4 py-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-github-text flex items-center gap-3">
                        <Folder className="w-8 h-8 text-github-accent" />
                        {displayTitle}
                        <span className="text-sm font-normal text-github-text-secondary bg-github-border/50 px-3 py-1 rounded-full">
                            {loading ? '...' : songs.length} files
                        </span>
                    </h1>
                    <p className="text-github-text-secondary mt-2">
                        Digital Archive & Master Recordings
                    </p>
                </div>

                <div className="relative w-full md:w-80">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-github-text-secondary" />
                    <input
                        type="text"
                        placeholder="Search archive..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-github-bg-secondary border border-github-border rounded-lg text-sm text-github-text focus:outline-none focus:ring-2 focus:ring-github-accent/50 focus:border-github-accent transition-all"
                    />
                </div>
            </div>

            {loading ? (
                <div className="flex flex-col items-center justify-center py-20 text-github-text-secondary">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-github-accent mb-4"></div>
                    <p>Accessing archive database...</p>
                </div>
            ) : sortedEras.length === 0 ? (
                <div className="text-center py-20 bg-github-bg-secondary border border-github-border border-dashed rounded-xl">
                    <Search className="w-12 h-12 text-github-text-secondary mx-auto mb-4 opacity-20" />
                    <p className="text-github-text-secondary">No files found matching your search.</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {sortedEras.map(era => (
                        <div key={era} className="border border-github-border rounded-xl bg-github-bg-secondary/30 overflow-hidden">
                            <button
                                onClick={() => toggleFolder(era)}
                                className="w-full flex items-center gap-3 p-4 hover:bg-github-border/20 transition-colors text-left"
                            >
                                {expandedFolders[era] ? <ChevronDown className="w-5 h-5 text-github-text-secondary" /> : <ChevronRight className="w-5 h-5 text-github-text-secondary" />}
                                <Folder className={`w-6 h-6 ${expandedFolders[era] ? 'text-github-accent' : 'text-github-text-secondary'}`} />
                                <span className="font-bold text-github-text">{era}</span>
                                <span className="ml-auto text-xs text-github-text-secondary bg-github-border/30 px-2 py-0.5 rounded-full">
                                    {Object.values(groupedSongs[era]).flat().length} items
                                </span>
                            </button>

                            {expandedFolders[era] && (
                                <div className="pl-8 pr-4 pb-4 space-y-2 border-t border-github-border/50 bg-github-bg/50">
                                    {['Released', 'Unreleased', 'Sessions'].map(sub => {
                                        const subData = groupedSongs[era][sub];
                                        const hasItems = sub === 'Sessions' 
                                            ? Object.keys(subData).length > 0 
                                            : subData.length > 0;

                                        if (!hasItems && !searchQuery) return null;
                                        if (!hasItems && searchQuery) return null;

                                        const subId = `${era}-${sub}`;
                                        const itemCount = sub === 'Sessions'
                                            ? Object.values(subData).flat().length
                                            : subData.length;

                                        return (
                                            <div key={sub} className="mt-2">
                                                <button
                                                    onClick={() => toggleFolder(subId)}
                                                    className="w-full flex items-center gap-2 py-2 px-3 hover:bg-github-border/20 rounded-lg transition-colors text-left group"
                                                >
                                                    {expandedFolders[subId] ? <ChevronDown className="w-4 h-4 text-github-text-secondary" /> : <ChevronRight className="w-4 h-4 text-github-text-secondary" />}
                                                    <Folder className="w-5 h-5 text-yellow-500/70 group-hover:text-yellow-500" />
                                                    <span className="text-sm font-medium text-github-text">{sub}</span>
                                                    <span className="text-[10px] text-github-text-secondary ml-2 opacity-50">
                                                        ({itemCount})
                                                    </span>
                                                </button>

                                                {expandedFolders[subId] && (
                                                    <div className="pl-6 mt-1 space-y-1">
                                                        {sub === 'Sessions' ? (
                                                            Object.keys(subData).sort().map(songTitle => {
                                                                const songId = `${era}-Sessions-${songTitle}`;
                                                                const files = subData[songTitle];
                                                                return (
                                                                    <div key={songTitle} className="mt-1">
                                                                        <button
                                                                            onClick={() => toggleFolder(songId)}
                                                                            className="w-full flex items-center gap-2 py-1.5 px-3 hover:bg-github-border/20 rounded-lg transition-colors text-left group"
                                                                        >
                                                                            {expandedFolders[songId] ? <ChevronDown className="w-3.5 h-3.5 text-github-text-secondary" /> : <ChevronRight className="w-3.5 h-3.5 text-github-text-secondary" />}
                                                                            <Folder className="w-4 h-4 text-github-accent/60 group-hover:text-github-accent" />
                                                                            <span className="text-xs font-medium text-github-text">{songTitle}</span>
                                                                            <span className="text-[9px] text-github-text-secondary ml-1.5 opacity-40">
                                                                                ({files.length})
                                                                            </span>
                                                                        </button>
                                                                        {expandedFolders[songId] && (
                                                                            <div className="pl-6 mt-1 space-y-1">
                                                                                {files.sort((a, b) => new Date(b.date_written || b.created_at) - new Date(a.date_written || a.created_at)).map(song => (
                                                                                    <SongLink key={song.id} song={song} />
                                                                                ))}
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                );
                                                            })
                                                        ) : (
                                                            subData.sort((a, b) => new Date(b.date_written || b.created_at) - new Date(a.date_written || a.created_at)).map(song => (
                                                                <SongLink key={song.id} song={song} />
                                                            ))
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default Archive;
