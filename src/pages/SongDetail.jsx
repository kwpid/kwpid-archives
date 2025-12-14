import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Calendar, Clock, Disc, FileText, Music, Play, ExternalLink, Edit } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthProvider';

const formatDate = (dateString) => {
    if (!dateString) return 'Unknown Date';
    return new Date(dateString).toLocaleDateString('en-US', {
        month: '2-digit',
        day: '2-digit',
        year: 'numeric'
    });
};

const SongDetail = () => {
    const { id } = useParams();
    const { isAdmin } = useAuth();
    const [song, setSong] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchSong = async () => {
            setLoading(true);
            const { data, error } = await supabase
                .from('songs')
                .select('*')
                .eq('id', id)
                .single();

            if (error) {
                console.error('Error fetching song:', error);
            } else if (data) {
                setSong(data);
            }
            setLoading(false);
        };

        if (id) {
            fetchSong();
        }
    }, [id]);

    if (loading) return <div className="p-8 text-center text-github-text-secondary">Loading song details...</div>;
    if (!song) return <div className="p-8 text-center text-github-text-secondary">Song not found.</div>;

    return (
        <div>
            {/* Header / Hero */}
            <div className="relative mb-8">
                <div className="flex flex-col md:flex-row gap-6 items-end">
                    <div className="w-48 h-48 bg-github-bg-secondary border border-github-border rounded-lg shadow-lg flex-shrink-0 flex items-center justify-center overflow-hidden">
                        {song.image_url ? (
                            <img src={song.image_url} alt={song.title} className="w-full h-full object-cover" />
                        ) : (
                            <Music className="w-16 h-16 text-github-text-secondary" />
                        )}
                    </div>
                    <div className="flex-grow pb-2">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 mb-2">
                                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-github-accent text-white uppercase tracking-wider">{song.sub_category || song.category}</span>
                                {song.version_number && <span className="text-xs text-github-text-secondary">v{song.version_number}</span>}
                            </div>
                            {isAdmin && (
                                <Link to={`/edit/${id}`} className="flex items-center gap-2 px-3 py-1 bg-github-bg border border-github-border text-github-text rounded hover:bg-github-border transition-colors text-sm">
                                    <Edit className="w-4 h-4" /> Edit Song
                                </Link>
                            )}
                        </div>

                        <h1 className="text-4xl md:text-5xl font-extrabold text-github-text tracking-tight mb-2">{song.title}</h1>
                        <p className="text-github-text-secondary text-lg">{song.description}</p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column: Lyrics */}
                <div className="lg:col-span-2">
                    <h2 className="text-xl font-bold text-github-text mb-4 flex items-center gap-2">
                        <FileText className="w-5 h-5" /> Lyrics
                    </h2>
                    <div className="prose prose-invert max-w-none whitespace-pre-wrap text-github-text leading-relaxed p-6 bg-github-bg-secondary border border-github-border rounded-lg font-mono text-sm">
                        {song.lyrics || "No lyrics available."}
                    </div>
                </div>

                {/* Right Column: Info */}
                <div className="space-y-6">
                    <div className="bg-github-bg-secondary border border-github-border rounded-lg p-5">
                        <h3 className="text-sm font-bold text-github-text-secondary uppercase tracking-wider mb-4">Track Info</h3>
                        <ul className="space-y-4">
                            <li className="flex items-center gap-3 text-github-text">
                                <Calendar className="w-4 h-4 text-github-accent-text" />
                                <div>
                                    <p className="text-xs text-github-text-secondary">Date Written</p>
                                    <p className="text-sm font-medium">{formatDate(song.date_written)}</p>
                                </div>
                            </li>
                            {song.time_taken && (
                                <li className="flex items-center gap-3 text-github-text">
                                    <Clock className="w-4 h-4 text-github-accent-text" />
                                    <div>
                                        <p className="text-xs text-github-text-secondary">Time Taken</p>
                                        <p className="text-sm font-medium">{song.time_taken}</p>
                                    </div>
                                </li>
                            )}
                            {song.beat_link && (
                                <li className="flex items-center gap-3 text-github-text">
                                    <Play className="w-4 h-4 text-github-accent-text" />
                                    <div>
                                        <p className="text-xs text-github-text-secondary">Beat / Instrumental</p>
                                        <a href={song.beat_link} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-github-accent-text hover:underline flex items-center gap-1">
                                            Listen to Beat <ExternalLink className="w-3 h-3" />
                                        </a>
                                    </div>
                                </li>
                            )}
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SongDetail;
