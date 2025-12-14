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
    const [loading, setLoading] = useState(true);

    // States for feedback
    const [copiedFull, setCopiedFull] = useState(false);
    const [copiedWritten, setCopiedWritten] = useState(false);
    const [copiedLyrics, setCopiedLyrics] = useState(false);

    useEffect(() => {
        const fetchSongs = async () => {
            setLoading(true);
            const { data, error } = await supabase
                .from('songs')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) {
                console.error('Error fetching songs:', error);
            } else {
                setSongs(data || []);
            }
            setLoading(false);
        };

        fetchSongs();
    }, []);

    const generateSimpleList = (filterCategory) => {
        // 1. Group by parent/child and filter by Category (Full vs Written)
        const mainSongs = songs.filter(s =>
            s.sub_category !== 'Sessions' &&
            s.category === filterCategory
        );

        // We still need to know about all sessions for counting, even if we are only listing one category?
        // Sessions usually belong to a parent song. If the parent is in "Written", the session is likely related.
        // I'll filter sessions from the global list to count them properly.
        const sessions = songs.filter(s => s.sub_category === 'Sessions');

        // Map parent_id -> count of sessions
        const sessionCounts = {};
        sessions.forEach(session => {
            if (session.parent_id) {
                sessionCounts[session.parent_id] = (sessionCounts[session.parent_id] || 0) + 1;
            }
        });

        // 2. Format
        let result = '';
        mainSongs.forEach((song, index) => {
            const date = formatDate(song.date_written || song.created_at);
            const sessionCount = sessionCounts[song.id] || 0;
            const category = song.sub_category || 'Unknown';
            const sessionText = sessionCount > 0 ? ` (+${sessionCount} Session${sessionCount > 1 ? 's' : ''})` : '';

            // Format: 1. Title (Date) - Category (+Session)
            result += `${index + 1}. ${song.title} (${date}) - ${category}${sessionText}\n`;
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
