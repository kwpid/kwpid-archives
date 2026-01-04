import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthProvider';
import { Disc, Calendar, Music, Edit, Trash2, ArrowLeft } from 'lucide-react';

const formatDate = (dateString) => {
    if (!dateString) return 'Unknown Date';
    const date = new Date(`${dateString}T12:00:00`);
    return date.toLocaleDateString('en-US', {
        month: '2-digit',
        day: '2-digit',
        year: 'numeric'
    });
};

const AlbumDetail = () => {
    const { id } = useParams();
    const { isAdmin } = useAuth();
    const navigate = useNavigate();
    const [album, setAlbum] = useState(null);
    const [tracks, setTracks] = useState([]);
    const [parentAlbum, setParentAlbum] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isDeleting, setIsDeleting] = useState(false);

    useEffect(() => {
        const fetchAlbum = async () => {
            setLoading(true);
            
            // Fetch album
            const { data: albumData, error } = await supabase
                .from('albums')
                .select('*')
                .eq('id', id)
                .single();

            if (error) {
                console.error('Error fetching album:', error);
                setLoading(false);
                return;
            }

            setAlbum(albumData);

            // Fetch parent album if this is a deluxe/anniversary version
            if (albumData.parent_album_id) {
                const { data: parentData } = await supabase
                    .from('albums')
                    .select('*')
                    .eq('id', albumData.parent_album_id)
                    .single();

                if (parentData) {
                    setParentAlbum(parentData);
                }
            }

            // Fetch tracks
            const { data: tracksData } = await supabase
                .from('album_tracks')
                .select('*, songs(*)')
                .eq('album_id', id)
                .order('track_number', { ascending: true });

            if (tracksData) {
                setTracks(tracksData);
            }

            setLoading(false);
        };

        if (id) {
            fetchAlbum();
        }
    }, [id]);

    const handleDelete = async () => {
        if (!confirm('Are you sure you want to delete this album? This will remove all track assignments.')) return;

        setIsDeleting(true);
        const { error } = await supabase.from('albums').delete().eq('id', id);

        if (error) {
            alert('Error deleting album: ' + error.message);
            setIsDeleting(false);
        } else {
            alert('Album deleted.');
            navigate('/albums');
        }
    };

    if (loading) return <div className="p-8 text-center text-github-text-secondary">Loading album...</div>;
    if (!album) return <div className="p-8 text-center text-github-text-secondary">Album not found.</div>;

    const isDeluxe = album.album_type === 'deluxe';
    const isAnniversary = album.album_type === 'anniversary';

    return (
        <div>
            {/* Back Link */}
            <div className="mb-4">
                <Link to="/albums" className="inline-flex items-center gap-2 text-github-text-secondary hover:text-github-accent-text text-sm">
                    <ArrowLeft className="w-4 h-4" /> Back to Albums
                </Link>
            </div>

            {/* Header */}
            <div className="flex flex-col md:flex-row gap-6 items-end mb-8">
                <div className="w-48 h-48 bg-github-bg-secondary border border-github-border rounded-lg shadow-lg flex-shrink-0 flex items-center justify-center overflow-hidden relative">
                    {album.cover_image_url ? (
                        <img src={album.cover_image_url} alt={album.name} className="w-full h-full object-cover" />
                    ) : (
                        <Disc className="w-16 h-16 text-github-text-secondary" />
                    )}
                    {(isDeluxe || isAnniversary) && (
                        <div className="absolute top-2 right-2">
                            <span className={`px-2 py-1 text-xs font-bold rounded-full ${
                                isDeluxe ? 'bg-purple-600 text-white' : 'bg-yellow-600 text-white'
                            }`}>
                                {isDeluxe ? 'Deluxe' : 'Anniversary'}
                            </span>
                        </div>
                    )}
                </div>
                <div className="flex-grow pb-2">
                    <div className="flex items-center justify-between">
                        <div>
                            {parentAlbum && (
                                <p className="text-sm text-github-text-secondary mb-1">
                                    Based on: <Link to={`/album/${parentAlbum.id}`} className="text-github-accent-text hover:underline">{parentAlbum.name}</Link>
                                </p>
                            )}
                            <h1 className="text-4xl md:text-5xl font-extrabold text-github-text tracking-tight mb-2">{album.name}</h1>
                            <div className="flex items-center gap-3">
                                <p className="text-github-text-secondary">
                                    Release Date: {formatDate(album.release_date)}
                                </p>
                                {album.status && (
                                    <span className={`px-2 py-1 text-xs font-bold rounded-full ${
                                        album.status === 'Released' 
                                            ? 'bg-green-600 text-white' 
                                            : 'bg-github-border text-github-text-secondary'
                                    }`}>
                                        {album.status}
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Admin Controls */}
                        {isAdmin && (
                            <div className="flex gap-2">
                                <Link to={`/albums`} className="flex items-center gap-2 px-3 py-1 bg-github-bg border border-github-border text-github-text rounded hover:bg-github-border transition-colors text-sm">
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
                </div>
            </div>

            {/* Track List */}
            <div className="bg-github-bg-secondary border border-github-border rounded-lg overflow-hidden">
                <div className="p-4 border-b border-github-border bg-github-bg">
                    <h2 className="text-lg font-bold text-github-text flex items-center gap-2">
                        <Music className="w-5 h-5 text-github-accent" />
                        Track List ({tracks.length})
                    </h2>
                </div>

                {tracks.length === 0 ? (
                    <div className="p-8 text-center text-github-text-secondary">
                        No tracks assigned to this album yet.
                        {isAdmin && (
                            <p className="mt-2">
                                <Link to="/albums" className="text-github-accent-text hover:underline">
                                    Go to Albums to assign tracks
                                </Link>
                            </p>
                        )}
                    </div>
                ) : (
                    <div className="divide-y divide-github-border">
                        {tracks.map((track, index) => (
                            <Link
                                key={track.id}
                                to={`/song/${track.songs.id}`}
                                className="flex items-center gap-4 p-4 hover:bg-github-border/30 transition-colors group"
                            >
                                <div className="w-8 text-center text-github-text-secondary font-mono text-sm">
                                    {track.track_number || index + 1}
                                </div>
                                <div className="flex-1">
                                    <h3 className="font-medium text-github-text group-hover:text-github-accent-text group-hover:underline">
                                        {track.songs.title}
                                    </h3>
                                    {track.songs.producer && (
                                        <p className="text-xs text-github-text-secondary mt-1">
                                            prod. {track.songs.producer}
                                        </p>
                                    )}
                                </div>
                                <div className="text-xs text-github-text-secondary">
                                    {formatDate(track.songs.date_written || track.songs.created_at)}
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default AlbumDetail;

