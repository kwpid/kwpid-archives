import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Music, Calendar, Clock, ArrowUpDown, ArrowUp, ArrowDown, Search } from 'lucide-react';

const formatDate = (dateString) => {
    if (!dateString) return 'Unknown Date';
    const date = new Date(`${dateString}T12:00:00`);
    return date.toLocaleDateString('en-US', {
        month: '2-digit',
        day: '2-digit',
        year: 'numeric'
    });
};

const Archive = () => {
    const { category } = useParams(); // 'full' or 'written'
    const [songs, setSongs] = useState([]);
    const [loading, setLoading] = useState(true);

    // Filters & Search
    const [filter, setFilter] = useState('All');
    const [searchQuery, setSearchQuery] = useState('');

    // Sorting state
    const [sortField, setSortField] = useState('date_written');
    const [sortOrder, setSortOrder] = useState('desc');

    const isFull = category === 'full';
    const dbCategory = isFull ? 'Full' : 'Written';

    const displayTitle = isFull ? 'Full Songs' : 'Written Works';
    const subCategories = isFull ? ['Released', 'Unreleased', 'Demos'] : []; // Removed Sessions from filter bar

    useEffect(() => {
        const fetchSongs = async () => {
            setLoading(true);
            let query = supabase
                .from('songs')
                .select('*')
                .eq('category', dbCategory)
                .neq('sub_category', 'Sessions'); // Exclude sessions from archive

            const { data, error } = await query;

            if (error) {
                console.error('Error fetching songs:', error);
            } else {
                setSongs(data || []);
            }
            setLoading(false);
        };

        fetchSongs();
        setFilter('All');
        setSearchQuery('');
        setSortField('date_written');
        setSortOrder('desc');
    }, [category, dbCategory]);

    const handleSort = (field) => {
        if (sortField === field) {
            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortOrder('desc');
        }
    };

    const getSortIcon = (field) => {
        if (sortField !== field) return <ArrowUpDown className="w-3 h-3 opacity-30" />;
        return sortOrder === 'asc' ? <ArrowUp className="w-3 h-3 text-github-accent" /> : <ArrowDown className="w-3 h-3 text-github-accent" />;
    };

    // Filter & Sort Logic
    const filteredAndSortedSongs = songs
        .filter(song => {
            const matchesCategory = filter === 'All' || song.sub_category === filter;
            const matchesSearch = song.title.toLowerCase().includes(searchQuery.toLowerCase());
            return matchesCategory && matchesSearch;
        })
        .sort((a, b) => {
            let valA = a[sortField];
            let valB = b[sortField];

            if (sortField === 'date_written') {
                valA = valA || a.created_at;
                valB = valB || b.created_at;
            }

            if (!valA) return 1;
            if (!valB) return -1;

            if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
            if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
            return 0;
        });

    return (
        <div>
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-github-text capitalize flex items-center gap-2">
                        {displayTitle}
                        <span className="text-sm font-normal text-github-text-secondary bg-github-border px-2 py-0.5 rounded-full">
                            {loading ? '...' : filteredAndSortedSongs.length}
                        </span>
                    </h1>
                    <p className="text-github-text-secondary text-sm mt-1">
                        {isFull ? 'File Archive' : 'Lyrics and Melodies'}
                    </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                    {/* Search Bar */}
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-github-text-secondary" />
                        <input
                            type="text"
                            placeholder="Search songs..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-9 pr-4 py-1.5 bg-github-bg-secondary border border-github-border rounded-full text-sm text-github-text focus:outline-none focus:border-github-accent w-full sm:w-64"
                        />
                    </div>

                    {/* Subcategory Filter */}
                    {isFull && (
                        <div className="flex flex-wrap gap-2">
                            <button
                                onClick={() => setFilter('All')}
                                className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${filter === 'All' ? 'bg-github-accent text-white' : 'bg-github-border text-github-text-secondary hover:text-github-text'}`}
                            >
                                All
                            </button>
                            {subCategories.map(sub => (
                                <button
                                    key={sub}
                                    onClick={() => setFilter(sub)}
                                    className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${filter === sub ? 'bg-github-accent text-white' : 'bg-github-border text-github-text-secondary hover:text-github-text'}`}
                                >
                                    {sub}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            <div className="bg-github-bg-secondary border border-github-border rounded-lg overflow-hidden">
                {/* Table Header */}
                <div className="grid grid-cols-12 gap-4 p-4 border-b border-github-border bg-github-bg text-xs font-bold text-github-text-secondary uppercase tracking-wider">
                    <div className="col-span-1 text-center">Icon</div>
                    <div className="col-span-4 md:col-span-3 cursor-pointer select-none flex items-center gap-1 hover:text-github-text" onClick={() => handleSort('title')}>
                        Name {getSortIcon('title')}
                    </div>
                    <div className="col-span-3 md:col-span-2 cursor-pointer select-none flex items-center gap-1 hover:text-github-text" onClick={() => handleSort('date_written')}>
                        Date {getSortIcon('date_written')}
                    </div>
                    <div className="col-span-2 hidden md:block">Description</div>
                    <div className="col-span-2 hidden md:block">Status</div>
                    <div className="col-span-2 md:col-span-2 text-right">Details</div>
                </div>

                {/* Table Body */}
                {loading ? (
                    <div className="p-8 text-center text-github-text-secondary">Loading archive...</div>
                ) : filteredAndSortedSongs.length === 0 ? (
                    <div className="p-8 text-center text-github-text-secondary italic">No files found matching your search.</div>
                ) : (
                    <div className="divide-y divide-github-border">
                        {filteredAndSortedSongs.map(song => (
                            <Link
                                to={`/song/${song.id}`}
                                key={song.id}
                                className="grid grid-cols-12 gap-4 p-3 items-center hover:bg-github-border/30 transition-colors text-sm group"
                            >
                                {/* Icon/Image */}
                                <div className="col-span-1 flex justify-center">
                                    <div className="w-8 h-8 rounded bg-github-bg border border-github-border flex items-center justify-center overflow-hidden">
                                        {song.image_url ? (
                                            <img src={song.image_url} alt="" className="w-full h-full object-cover" />
                                        ) : (
                                            <Music className="w-4 h-4 text-github-text-secondary" />
                                        )}
                                    </div>
                                </div>

                                {/* Name */}
                                <div className="col-span-4 md:col-span-3 font-medium text-github-text truncate group-hover:text-github-accent-text group-hover:underline">
                                    {song.title}
                                </div>

                                {/* Date */}
                                <div className="col-span-3 md:col-span-2 text-github-text-secondary font-mono text-xs">
                                    {formatDate(song.date_written || song.created_at)}
                                </div>

                                {/* Description (Hidden on mobile) */}
                                <div className="col-span-2 hidden md:block text-github-text-secondary truncate text-xs">
                                    {song.description || '-'}
                                </div>

                                {/* Status/Category (Hidden on mobile) */}
                                <div className="col-span-2 hidden md:block">
                                    {song.sub_category && (
                                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-github-border text-github-text">
                                            {song.sub_category}
                                        </span>
                                    )}
                                </div>

                                {/* Link Icon */}
                                <div className="col-span-2 text-right">
                                    <span className="text-github-accent-text text-xs hover:underline hidden sm:inline">View</span>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Archive;
