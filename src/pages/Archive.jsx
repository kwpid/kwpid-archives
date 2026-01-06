import React, { useEffect, useState, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { getSongEra } from '../lib/eraUtils';
import { getSongDisplayImage, createSongToAlbumMap } from '../lib/songImageUtils';
import { Music, Calendar, Clock, ArrowUpDown, ArrowUp, ArrowDown, Search, Folder, ChevronRight, ChevronDown, FileText, LayoutGrid, List, ArrowLeft, Home } from 'lucide-react';

const formatDate = (dateString) => {
    if (!dateString) return 'Unknown Date';
    const date = new Date(`${dateString}T12:00:00`);
    return date.toLocaleDateString('en-US', {
        month: '2-digit',
        day: '2-digit',
        year: 'numeric'
    });
};

const SongLink = ({ song, layout = 'list' }) => {
    if (layout === 'grid') {
        return (
            <Link
                to={`/song/${song.id}`}
                className="flex flex-col items-center p-4 bg-github-bg border border-github-border rounded-xl hover:border-github-accent/50 hover:bg-github-accent/5 transition-all group aspect-square justify-center text-center gap-2"
            >
                <div className="w-16 h-16 rounded-lg bg-github-bg-secondary border border-github-border flex items-center justify-center overflow-hidden group-hover:scale-105 transition-transform shadow-sm">
                    {song.displayImage ? (
                        <img src={song.displayImage} alt="" className="w-full h-full object-cover" />
                    ) : (
                        <Music className="w-8 h-8 text-github-text-secondary group-hover:text-github-accent" />
                    )}
                </div>
                <div className="w-full">
                    <div className="text-sm font-medium text-github-text group-hover:text-github-accent transition-colors truncate px-1">
                        {song.title}
                    </div>
                    <div className="text-[10px] text-github-text-secondary font-mono">
                        {formatDate(song.date_written || song.created_at)}
                    </div>
                </div>
            </Link>
        );
    }

    return (
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
};

const FolderItem = ({ name, count, dateRange, onClick, layout = 'list' }) => {
    if (layout === 'grid') {
        return (
            <button
                onClick={onClick}
                className="flex flex-col items-center p-4 bg-github-bg-secondary/30 border border-github-border rounded-xl hover:border-github-accent hover:bg-github-accent/5 transition-all group aspect-square justify-center text-center gap-2"
            >
                <div className="relative">
                    <Folder className="w-20 h-20 text-github-accent/80 group-hover:text-github-accent transition-colors" />
                    <span className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-github-bg/80 backdrop-blur-sm border border-github-border px-2 py-0.5 rounded-full text-[9px] font-bold text-github-text-secondary">
                        {count}
                    </span>
                </div>
                <div className="w-full">
                    <div className="text-sm font-bold text-github-text truncate px-1">{name}</div>
                    {dateRange && (
                        <div className="text-[9px] text-github-text-secondary font-mono opacity-60 truncate px-1">
                            {dateRange}
                        </div>
                    )}
                </div>
            </button>
        );
    }

    return (
        <button
            onClick={onClick}
            className="w-full flex items-center gap-3 p-4 bg-github-bg-secondary/30 border border-github-border rounded-xl hover:bg-github-border/20 transition-colors text-left"
        >
            <ChevronRight className="w-5 h-5 text-github-text-secondary" />
            <Folder className="w-6 h-6 text-github-accent" />
            <div className="flex flex-col">
                <span className="font-bold text-github-text">{name}</span>
                {dateRange && (
                    <span className="text-[10px] text-github-text-secondary font-mono opacity-70">
                        [{dateRange}]
                    </span>
                )}
            </div>
            <span className="ml-auto text-xs text-github-text-secondary bg-github-border/30 px-2 py-0.5 rounded-full">
                {count} items
            </span>
        </button>
    );
};

const Archive = () => {
    const [songs, setSongs] = useState([]);
    const [albums, setAlbums] = useState([]);
    const [albumTracks, setAlbumTracks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [expandedFolders, setExpandedFolders] = useState({});
    const [layout, setLayout] = useState('list');
    const [currentPath, setCurrentPath] = useState([]);

    const [searchQuery, setSearchQuery] = useState('');
    const isFull = true;
    const dbCategory = 'Full';
    const displayTitle = 'Files';

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            let query = supabase.from('songs').select('*').eq('category', dbCategory);
            const { data: songsData, error: songsError } = await query;
            if (songsError) console.error('Error fetching songs:', songsError);
            else setSongs(songsData || []);

            const { data: albumsData } = await supabase.from('albums').select('*');
            setAlbums(albumsData || []);

            const { data: tracksData } = await supabase.from('album_tracks').select('song_id, albums(id, cover_image_url)');
            setAlbumTracks(tracksData || []);
            setLoading(false);
        };
        fetchData();
    }, []);

    const songToAlbumMap = useMemo(() => createSongToAlbumMap(albumTracks), [albumTracks]);

    const groupedSongs = useMemo(() => {
        return songs.reduce((acc, song) => {
            if (searchQuery && !song.title.toLowerCase().includes(searchQuery.toLowerCase())) return acc;
            const era = getSongEra(song, albums) || 'Unknown Era';
            let subFolder = 'Unreleased';
            if (song.sub_category === 'Sessions') subFolder = 'Sessions';
            else if (song.is_released) subFolder = 'Released';

            if (!acc[era]) acc[era] = { Released: [], Unreleased: [], Sessions: {} };
            if (subFolder === 'Sessions') {
                const baseTitle = song.title.split(' (')[0].trim();
                if (!acc[era].Sessions[baseTitle]) acc[era].Sessions[baseTitle] = [];
                acc[era].Sessions[baseTitle].push({ ...song, displayImage: getSongDisplayImage(song, songToAlbumMap) });
            } else {
                acc[era][subFolder].push({ ...song, displayImage: getSongDisplayImage(song, songToAlbumMap) });
            }
            return acc;
        }, {});
    }, [songs, albums, searchQuery, songToAlbumMap]);

    const eraDates = useMemo(() => {
        return Object.keys(groupedSongs).reduce((acc, era) => {
            const eraSongs = Object.values(groupedSongs[era]).flatMap(val => Array.isArray(val) ? val : Object.values(val).flat());
            if (eraSongs.length > 0) {
                const dates = eraSongs.map(s => new Date(s.date_written || s.created_at)).filter(d => !isNaN(d.getTime())).sort((a, b) => a - b);
                if (dates.length > 0) {
                    acc[era] = `${formatDate(dates[0].toISOString().split('T')[0])} — ${formatDate(dates[dates.length - 1].toISOString().split('T')[0])}`;
                }
            }
            return acc;
        }, {});
    }, [groupedSongs]);

    const navigateBack = () => setCurrentPath(prev => prev.slice(0, -1));
    const navigateTo = (folder) => setCurrentPath(prev => [...prev, folder]);

    const renderBreadcrumbs = () => (
        <div className="flex items-center gap-2 text-sm text-github-text-secondary mb-6 overflow-x-auto whitespace-nowrap py-1">
            <button onClick={() => setCurrentPath([])} className="hover:text-github-accent flex items-center gap-1 transition-colors">
                <Home className="w-4 h-4" /> Root
            </button>
            {currentPath.map((folder, i) => (
                <React.Fragment key={i}>
                    <ChevronRight className="w-4 h-4 flex-shrink-0" />
                    <button 
                        onClick={() => setCurrentPath(currentPath.slice(0, i + 1))}
                        className={`hover:text-github-accent transition-colors ${i === currentPath.length - 1 ? 'text-github-text font-bold' : ''}`}
                    >
                        {folder}
                    </button>
                </React.Fragment>
            ))}
        </div>
    );

    const sortedEras = Object.keys(groupedSongs).sort();

    const renderContent = () => {
        if (currentPath.length === 0) {
            return (
                <div className={layout === 'grid' ? "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4" : "space-y-4"}>
                    {sortedEras.map(era => (
                        <FolderItem 
                            key={era}
                            name={era}
                            count={Object.values(groupedSongs[era]).flatMap(v => Array.isArray(v) ? v : Object.values(v).flat()).length}
                            dateRange={eraDates[era]}
                            onClick={() => navigateTo(era)}
                            layout={layout}
                        />
                    ))}
                </div>
            );
        }

        const [era, sub, songFolder] = currentPath;
        const eraData = groupedSongs[era];

        if (currentPath.length === 1) {
            return (
                <div className={layout === 'grid' ? "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4" : "space-y-4"}>
                    {['Released', 'Unreleased', 'Sessions'].map(s => {
                        const subData = eraData[s];
                        const count = s === 'Sessions' ? Object.values(subData).flat().length : subData.length;
                        if (count === 0 && !searchQuery) return null;
                        return (
                            <FolderItem 
                                key={s}
                                name={s}
                                count={count}
                                onClick={() => navigateTo(s)}
                                layout={layout}
                            />
                        );
                    })}
                </div>
            );
        }

        if (currentPath.length === 2) {
            const subData = eraData[sub];
            if (sub === 'Sessions') {
                return (
                    <div className={layout === 'grid' ? "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4" : "space-y-4"}>
                        {Object.keys(subData).sort().map(songTitle => (
                            <FolderItem 
                                key={songTitle}
                                name={songTitle}
                                count={subData[songTitle].length}
                                onClick={() => navigateTo(songTitle)}
                                layout={layout}
                            />
                        ))}
                    </div>
                );
            }
            return (
                <div className={layout === 'grid' ? "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4" : "space-y-2"}>
                    {subData.sort((a, b) => new Date(b.date_written || b.created_at) - new Date(a.date_written || a.created_at)).map(song => (
                        <SongLink key={song.id} song={song} layout={layout} />
                    ))}
                </div>
            );
        }

        if (currentPath.length === 3) {
            const files = eraData.Sessions[songFolder];
            return (
                <div className={layout === 'grid' ? "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4" : "space-y-2"}>
                    {files.sort((a, b) => new Date(b.date_written || b.created_at) - new Date(a.date_written || a.created_at)).map(song => (
                        <SongLink key={song.id} song={song} layout={layout} />
                    ))}
                </div>
            );
        }
    };

    return (
        <div className="max-w-6xl mx-auto px-4 py-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                <div className="flex items-center gap-4">
                    {currentPath.length > 0 && (
                        <button onClick={navigateBack} className="p-2 hover:bg-github-border rounded-lg text-github-text-secondary hover:text-github-text transition-colors">
                            <ArrowLeft className="w-5 h-5" />
                        </button>
                    )}
                    <div>
                        <h1 className="text-3xl font-bold text-github-text flex items-center gap-3">
                            <Folder className="w-8 h-8 text-github-accent" />
                            {displayTitle}
                        </h1>
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-4">
                    <div className="relative w-full sm:w-64">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-github-text-secondary" />
                        <input
                            type="text"
                            placeholder="Search archive..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-github-bg-secondary border border-github-border rounded-lg text-sm text-github-text focus:outline-none focus:ring-2 focus:ring-github-accent/50 focus:border-github-accent transition-all"
                        />
                    </div>

                    <div className="flex bg-github-bg-secondary border border-github-border rounded-lg p-1">
                        <button
                            onClick={() => setLayout('list')}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-bold transition-all ${layout === 'list' ? 'bg-github-border text-white shadow-sm' : 'text-github-text-secondary hover:text-github-text'}`}
                        >
                            <List className="w-4 h-4" /> LIST
                        </button>
                        <button
                            onClick={() => setLayout('grid')}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-bold transition-all ${layout === 'grid' ? 'bg-github-border text-white shadow-sm' : 'text-github-text-secondary hover:text-github-text'}`}
                        >
                            <LayoutGrid className="w-4 h-4" /> GRID
                        </button>
                    </div>
                </div>
            </div>

            {renderBreadcrumbs()}

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
                <div className="min-h-[400px]">
                    {renderContent()}
                </div>
            )}
        </div>
    );
};

export default Archive;
