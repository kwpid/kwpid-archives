import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Calendar, Clock, Disc, FileText, Music, Play, ExternalLink, Edit, Trash2, GitBranch, ArrowLeft, HelpCircle, Sparkles } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthProvider';
import { getSongEra } from '../lib/eraUtils';

const formatDate = (dateString) => {
    if (!dateString) return 'Unknown Date';
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
    const [altFiles, setAltFiles] = useState([]);
    const [activeTab, setActiveTab] = useState('lyrics');
    const [isDeleting, setIsDeleting] = useState(false);
    const [album, setAlbum] = useState(null);
    const [albums, setAlbums] = useState([]);
    const [era, setEra] = useState(null);
    const [displayImage, setDisplayImage] = useState(null);

    useEffect(() => {
        const fetchSong = async () => {
            setLoading(true);
            setAltFiles([]);

            const { data: currentSong, error } = await supabase
                .from('songs')
                .select('*')
                .eq('id', id)
                .single();

            if (error) {
                console.error('Error fetching song:', error);
            } else if (currentSong) {
                setSong(currentSong);

                const { data: relatedFiles } = await supabase
                    .from('songs')
                    .select('*')
                    .eq('parent_id', currentSong.id)
                    .order('date_written', { ascending: false });

                if (relatedFiles) {
                    setAltFiles(relatedFiles);
                }

                const { data: albumsData } = await supabase
                    .from('albums')
                    .select('*');

                if (albumsData) {
                    setAlbums(albumsData || []);
                    if (currentSong.category === 'Full') {
                        setEra(getSongEra(currentSong, albumsData));
                    }
                }

                const { data: albumTrack } = await supabase
                    .from('album_tracks')
                    .select('album_id, albums(id, cover_image_url, name)')
                    .eq('song_id', currentSong.id)
                    .limit(1)
                    .maybeSingle();

                if (albumTrack && albumTrack.albums) {
                    const albumData = albumTrack.albums;
                    setAlbum({ id: albumData.id, name: albumData.name, cover_image_url: albumData.cover_image_url });
                    setDisplayImage(albumData.cover_image_url || currentSong.image_url);
                } else {
                    setDisplayImage(currentSong.image_url);
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

    return (
        <div>
            <div className="relative mb-8">
                {song.parent_id && (
                    <div className="mb-4">
                        <Link to={`/song/${song.parent_id}`} className="inline-flex items-center gap-2 text-github-text-secondary hover:text-github-accent-text text-sm mb-2">
                            <ArrowLeft className="w-4 h-4" /> Back to Original Song
                        </Link>
                    </div>
                )}

                <div className="flex flex-col md:flex-row gap-6 items-end">
                    <div className="w-48 h-48 bg-github-bg-secondary border border-github-border rounded-lg shadow-lg flex-shrink-0 flex items-center justify-center overflow-hidden">
                        {displayImage ? (
                            <img src={displayImage} alt={song.title} className="w-full h-full object-cover" />
                        ) : (
                            <Music className="w-16 h-16 text-github-text-secondary" />
                        )}
                    </div>
                    <div className="flex-grow pb-2">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 mb-2">
                                <span className={`text-xs font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${song.parent_id ? 'bg-purple-600 text-white' : 'bg-github-accent text-white'}`}>
                                    {song.sub_category || song.category}
                                </span>
                                {song.version_number && <span className="text-xs text-github-text-secondary">v{song.version_number}</span>}
                            </div>

                            {isAdmin && (
                                <div className="flex gap-2">
                                    {!song.parent_id && (
                                        <Link to={`/upload?mode=alt&source=${id}`} className="flex items-center gap-2 px-3 py-1 bg-github-bg border border-github-border text-github-text rounded hover:bg-github-border transition-colors text-sm" title="Create Alt. File">
                                            <GitBranch className="w-4 h-4" /> <span className="hidden sm:inline">Create Alt.</span>
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
                        {song.alt_names && song.alt_names.length > 0 && (
                            <p className="text-github-text-secondary text-sm mb-2 italic">
                                Also known as: {song.alt_names.join(', ')}
                            </p>
                        )}
                        <p className="text-github-text-secondary text-lg">{song.description}</p>
                    </div>
                </div>
            </div>

            <div className="flex border-b border-github-border mb-6">
                <button
                    onClick={() => setActiveTab('lyrics')}
                    className={`px-6 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'lyrics' ? 'border-github-accent text-github-accent' : 'border-transparent text-github-text-secondary hover:text-github-text'}`}
                >
                    Lyrics
                </button>
                <button
                    onClick={() => setActiveTab('files')}
                    className={`px-6 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'files' ? 'border-github-accent text-github-accent' : 'border-transparent text-github-text-secondary hover:text-github-text'}`}
                >
                    Other Files ({altFiles.length})
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2">
                    {activeTab === 'lyrics' ? (
                        <div>
                            <h2 className="text-xl font-bold text-github-text mb-4 flex items-center gap-2">
                                <FileText className="w-5 h-5" /> Lyrics
                            </h2>
                            <div className="prose prose-invert max-w-none whitespace-pre-wrap text-github-text leading-relaxed p-6 bg-github-bg-secondary border border-github-border rounded-lg font-mono text-sm">
                                {song.lyrics || "No lyrics available."}
                            </div>
                        </div>
                    ) : (
                        <div>
                            <h2 className="text-xl font-bold text-github-text mb-4 flex items-center gap-2">
                                <GitBranch className="w-5 h-5" /> Other Files
                            </h2>
                            {altFiles.length === 0 ? (
                                <div className="p-8 text-center text-github-text-secondary italic bg-github-bg-secondary border border-github-border rounded-lg">
                                    No other files found.
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    {altFiles.map(file => (
                                        <Link
                                            to={`/song/${file.id}`}
                                            key={file.id}
                                            className="p-4 bg-github-bg-secondary border border-github-border rounded-lg hover:bg-github-border transition-colors group flex gap-4"
                                        >
                                            <div className="w-16 h-16 bg-github-bg border border-github-border rounded flex-shrink-0 flex items-center justify-center overflow-hidden">
                                                {file.image_url ? (
                                                    <img src={file.image_url} alt="" className="w-full h-full object-cover" />
                                                ) : (
                                                    <Music className="w-6 h-6 text-github-text-secondary" />
                                                )}
                                            </div>
                                            <div className="flex-grow min-w-0">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="text-[10px] font-bold px-1.5 py-0.5 bg-purple-600 text-white rounded uppercase whitespace-nowrap">
                                                        {file.sub_category}
                                                    </span>
                                                    <span className="text-[10px] text-github-text-secondary">{formatDate(file.date_written)}</span>
                                                </div>
                                                <h3 className="font-bold text-github-text group-hover:text-github-accent-text truncate text-sm">{file.title}</h3>
                                                {file.description && <p className="text-[11px] text-github-text-secondary mt-0.5 truncate">{file.description}</p>}
                                            </div>
                                        </Link>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <div className="space-y-6">
                    <div className="bg-github-bg-secondary border border-github-border rounded-lg p-5">
                        <h3 className="text-sm font-bold text-github-text-secondary uppercase tracking-wider mb-4">Track Info</h3>
                        <ul className="space-y-4">
                            <li className="flex items-center gap-3 text-github-text">
                                <FileText className="w-4 h-4 text-github-accent-text" />
                                <div>
                                    <p className="text-xs text-github-text-secondary">Track Type</p>
                                    <p className="text-sm font-medium">{song.sub_category || 'Throwaway Track (Complete)'}</p>
                                </div>
                            </li>
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
                            {song.category === 'Full' && era && (
                                <li className="flex items-center gap-3 text-github-text">
                                    <Sparkles className="w-4 h-4 text-github-accent-text" />
                                    <div>
                                        <p className="text-xs text-github-text-secondary">Era</p>
                                        <p className="text-sm font-medium">{era}</p>
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
