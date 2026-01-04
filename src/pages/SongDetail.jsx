import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Calendar, Clock, Disc, FileText, Music, Play, ExternalLink, Edit, Trash2, GitBranch, ArrowLeft, HelpCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthProvider';

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

const SongDetail = () => {
    const { id } = useParams();
    const { isAdmin } = useAuth();
    const navigate = useNavigate();
    const [song, setSong] = useState(null);
    const [loading, setLoading] = useState(true);
    const [sessionFile, setSessionFile] = useState(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [album, setAlbum] = useState(null);

    useEffect(() => {
        const fetchSong = async () => {
            setLoading(true);
            setSessionFile(null); // Reset session file

            // 1. Fetch current song
            const { data: currentSong, error } = await supabase
                .from('songs')
                .select('*')
                .eq('id', id)
                .single();

            if (error) {
                console.error('Error fetching song:', error);
            } else if (currentSong) {
                setSong(currentSong);

                // 2. Logic to find related session file
                // If this is a parent, find its child session
                // If this is a session, currentSong.parent_id will exist (handled in render)

                // Try to find a child session file
                const { data: childSession } = await supabase
                    .from('songs')
                    .select('*')
                    .eq('parent_id', currentSong.id)
                    .eq('sub_category', 'Sessions') // ensure it's a session
                    .limit(1)
                    .single();

                if (childSession) {
                    setSessionFile(childSession);
                }

                // Fetch album information if this song is on an album
                const { data: albumTrack } = await supabase
                    .from('album_tracks')
                    .select('album_id')
                    .eq('song_id', currentSong.id)
                    .limit(1)
                    .single();

                if (albumTrack) {
                    const { data: albumData } = await supabase
                        .from('albums')
                        .select('*')
                        .eq('id', albumTrack.album_id)
                        .single();

                    if (albumData) {
                        setAlbum(albumData);
                    }
                }
            }
            setLoading(false);
        };

        if (id) {
            fetchSong();
        }
    }, [id]);

    const handleDelete = async () => {
        if (!confirm('Are you sure you want to DELETE this song? This action cannot be undone.')) return;

        setIsDeleting(true);
        const { error } = await supabase.from('songs').delete().eq('id', id);

        if (error) {
            alert('Error deleting song: ' + error.message);
            setIsDeleting(false);
        } else {
            alert('Song deleted.');
            navigate('/');
        }
    };

    if (loading) return <div className="p-8 text-center text-github-text-secondary">Loading song details...</div>;
    if (!song) return <div className="p-8 text-center text-github-text-secondary">Song not found.</div>;

    const isSession = song.sub_category === 'Sessions';

    return (
        <div>
            {/* Header / Hero */}
            <div className="relative mb-8">
                {/* Back Link for Session Files */}
                {isSession && song.parent_id && (
                    <div className="mb-4">
                        <Link to={`/song/${song.parent_id}`} className="inline-flex items-center gap-2 text-github-text-secondary hover:text-github-accent-text text-sm mb-2">
                            <ArrowLeft className="w-4 h-4" /> Back to Original Song
                        </Link>
                    </div>
                )}

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
                                <span className={`text-xs font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${isSession ? 'bg-purple-600 text-white' : 'bg-github-accent text-white'}`}>
                                    {song.sub_category || song.category}
                                </span>
                                {song.version_number && <span className="text-xs text-github-text-secondary">v{song.version_number}</span>}
                            </div>

                            {/* Admin Controls */}
                            {isAdmin && (
                                <div className="flex gap-2">
                                    {!isSession && !sessionFile && (
                                        <Link to={`/upload?mode=session&source=${id}`} className="flex items-center gap-2 px-3 py-1 bg-github-bg border border-github-border text-github-text rounded hover:bg-github-border transition-colors text-sm" title="Create Session File">
                                            <GitBranch className="w-4 h-4" /> <span className="hidden sm:inline">Create Session</span>
                                        </Link>
                                    )}
                                    <Link to={`/edit/${id}`} className="flex items-center gap-2 px-3 py-1 bg-github-bg border border-github-border text-github-text rounded hover:bg-github-border transition-colors text-sm">
                                        <Edit className="w-4 h-4" /> <span className="hidden sm:inline">Edit</span>
                                    </Link>
                                    <button
                                        onClick={handleDelete}
                                        disabled={isDeleting}
                                        className="flex items-center gap-2 px-3 py-1 bg-red-900/30 border border-red-900/50 text-red-500 rounded hover:bg-red-900/50 transition-colors text-sm"
                                    >
                                        <Trash2 className="w-4 h-4" /> <span className="hidden sm:inline">Delete</span>
                                    </button>
                                </div>
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
                            {/* Session File Link */}
                            {sessionFile && (
                                <li className="flex items-center gap-3 text-github-text bg-github-bg p-3 rounded border border-github-border/50">
                                    <GitBranch className="w-4 h-4 text-purple-400" />
                                    <div className="flex-grow">
                                        <div className="flex items-center gap-2">
                                            <p className="text-xs text-github-text-secondary">Session File Available</p>
                                            <div className="group relative">
                                                <HelpCircle className="w-3 h-3 text-github-text-secondary hover:text-github-text cursor-help" />
                                                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-64 p-2 bg-github-bg-secondary border border-github-border text-xs text-github-text rounded shadow-xl hidden group-hover:block z-10 pointer-events-none group-hover:pointer-events-auto">
                                                    Session files are longer versions of final tracks; usually having verses, hooks, bridges etc that didnt make the final cut.
                                                </div>
                                            </div>
                                        </div>
                                        <Link to={`/song/${sessionFile.id}`} className="text-sm font-bold text-github-accent-text hover:underline">
                                            View Session File
                                        </Link>
                                    </div>
                                </li>
                            )}

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
                            {song.producer && (
                                <li className="flex items-center gap-3 text-github-text">
                                    <Music className="w-4 h-4 text-github-accent-text" />
                                    <div>
                                        <p className="text-xs text-github-text-secondary">Producer</p>
                                        <p className="text-sm font-medium">prod. {song.producer}</p>
                                    </div>
                                </li>
                            )}
                            {album && (
                                <li className="flex items-center gap-3 text-github-text">
                                    <Disc className="w-4 h-4 text-github-accent-text" />
                                    <div>
                                        <p className="text-xs text-github-text-secondary">Album</p>
                                        <p className="text-sm font-medium">{album.name}</p>
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
