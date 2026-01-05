import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthProvider';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Plus, Edit, Trash2, Music, X, Check, Disc, Sparkles, Gift } from 'lucide-react';
import { Link } from 'react-router-dom';

const Albums = () => {
    const { isAdmin } = useAuth();
    const navigate = useNavigate();
    const [albums, setAlbums] = useState([]);
    const [songs, setSongs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showAssignModal, setShowAssignModal] = useState(false);
    const [showCreateVersionModal, setShowCreateVersionModal] = useState(false);
    const [selectedAlbum, setSelectedAlbum] = useState(null);
    const [imageFile, setImageFile] = useState(null);

    const [formData, setFormData] = useState({
        name: '',
        release_date: '',
        cover_image_url: '',
        album_type: 'standard',
        parent_album_id: null,
        status: 'Unreleased',
        selectedSongs: []
    });

    useEffect(() => {
        if (!isAdmin) return;
        fetchAlbums();
        fetchSongs();
    }, [isAdmin]);

    const fetchAlbums = async () => {
        const { data, error } = await supabase
            .from('albums')
            .select('*, parent_album:parent_album_id(name)')
            .order('release_date', { ascending: false });

        if (error) {
            console.error('Error fetching albums:', error);
        } else {
            setAlbums(data || []);
        }
        setLoading(false);
    };

    const fetchSongs = async () => {
        const { data, error } = await supabase
            .from('songs')
            .select('*')
            .eq('category', 'Full')
            .neq('sub_category', 'Sessions')
            .order('date_written', { ascending: true });

        if (error) {
            console.error('Error fetching songs:', error);
        } else {
            setSongs(data || []);
        }
    };

    const uploadImage = async (file) => {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const filePath = `${fileName}`;

        const { error: uploadError } = await supabase.storage
            .from('song-images')
            .upload(filePath, file);

        if (uploadError) {
            throw uploadError;
        }

        const { data } = supabase.storage
            .from('song-images')
            .getPublicUrl(filePath);

        return data.publicUrl;
    };

    const handleCreateAlbum = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            let imageUrl = formData.cover_image_url;

            if (imageFile) {
                imageUrl = await uploadImage(imageFile);
            }

            const { data: insertedData, error } = await supabase
                .from('albums')
                .insert([{
                    name: formData.name,
                    release_date: formData.release_date,
                    cover_image_url: imageUrl || null,
                    album_type: formData.album_type,
                    parent_album_id: formData.parent_album_id || null,
                    status: formData.status || 'Unreleased'
                }])
                .select()
                .single();

            if (error) throw error;

            const newAlbumId = insertedData?.id;
            
            // If this is a deluxe/anniversary version, copy tracks from parent album
            let finalTracks = [];
            if (formData.parent_album_id && newAlbumId) {
                const { data: parentTracks } = await supabase
                    .from('album_tracks')
                    .select('song_id, track_number')
                    .eq('album_id', formData.parent_album_id);

                if (parentTracks && parentTracks.length > 0) {
                    finalTracks = parentTracks.map(track => ({
                        album_id: newAlbumId,
                        song_id: track.song_id,
                        track_number: track.track_number
                    }));
                }
            }

            // Add manually selected tracks
            if (formData.selectedSongs && formData.selectedSongs.length > 0) {
                const startNum = finalTracks.length + 1;
                formData.selectedSongs.forEach((songId, index) => {
                    // Avoid duplicates if already copied from parent
                    if (!finalTracks.some(t => t.song_id === songId)) {
                        finalTracks.push({
                            album_id: newAlbumId,
                            song_id: songId,
                            track_number: startNum + index
                        });
                    }
                });
            }

            if (finalTracks.length > 0) {
                await supabase
                    .from('album_tracks')
                    .insert(finalTracks);
            }

            alert('Album created successfully!');
            setShowCreateModal(false);
            setShowCreateVersionModal(false);
            setFormData({ name: '', release_date: '', cover_image_url: '', album_type: 'standard', parent_album_id: null, status: 'Unreleased', selectedSongs: [] });
            setImageFile(null);
            setSelectedAlbum(null);
            fetchAlbums();
        } catch (error) {
            alert('Error creating album: ' + error.message);
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleEditAlbum = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            let imageUrl = formData.cover_image_url;

            if (imageFile) {
                imageUrl = await uploadImage(imageFile);
            } else {
                imageUrl = formData.cover_image_url;
            }

            const { error } = await supabase
                .from('albums')
                .update({
                    name: formData.name,
                    release_date: formData.release_date,
                    cover_image_url: imageUrl || null,
                    album_type: formData.album_type,
                    parent_album_id: formData.parent_album_id || null,
                    status: formData.status || 'Unreleased'
                })
                .eq('id', selectedAlbum.id);

            // Update album tracks
            await supabase
                .from('album_tracks')
                .delete()
                .eq('album_id', selectedAlbum.id);

            if (formData.selectedSongs && formData.selectedSongs.length > 0) {
                const tracks = formData.selectedSongs.map((songId, index) => ({
                    album_id: selectedAlbum.id,
                    song_id: songId,
                    track_number: index + 1
                }));

                await supabase
                    .from('album_tracks')
                    .insert(tracks);
            }

            // If album status changed to "Released", update all songs in the album
            if (formData.status === 'Released' && selectedAlbum.status !== 'Released') {
                if (formData.selectedSongs && formData.selectedSongs.length > 0) {
                    await supabase
                        .from('songs')
                        .update({ sub_category: 'Released' })
                        .in('id', formData.selectedSongs);
                }
            }

            if (error) throw error;

            alert('Album updated successfully!');
            setShowEditModal(false);
            setSelectedAlbum(null);
            setFormData({ name: '', release_date: '', cover_image_url: '', album_type: 'standard', parent_album_id: null, status: 'Unreleased', selectedSongs: [] });
            setImageFile(null);
            fetchAlbums();
        } catch (error) {
            alert('Error updating album: ' + error.message);
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteAlbum = async (albumId) => {
        if (!confirm('Are you sure you want to delete this album? This will remove all track assignments.')) return;

        const { error } = await supabase
            .from('albums')
            .delete()
            .eq('id', albumId);

        if (error) {
            alert('Error deleting album: ' + error.message);
        } else {
            alert('Album deleted.');
            fetchAlbums();
        }
    };

    const openEditModal = async (album) => {
        setSelectedAlbum(album);
        
        // Fetch current tracks
        const { data: trackData } = await supabase
            .from('album_tracks')
            .select('song_id')
            .eq('album_id', album.id)
            .order('track_number', { ascending: true });

        const selectedSongs = trackData ? trackData.map(t => t.song_id) : [];

        setFormData({
            name: album.name,
            release_date: album.release_date,
            cover_image_url: album.cover_image_url || '',
            album_type: album.album_type || 'standard',
            parent_album_id: album.parent_album_id || null,
            status: album.status || 'Unreleased',
            selectedSongs: selectedSongs
        });
        setImageFile(null);
        setShowEditModal(true);
    };

    const openCreateVersionModal = (album, versionType) => {
        setSelectedAlbum(album);
        const versionName = versionType === 'deluxe' 
            ? `${album.name} (Deluxe)` 
            : `${album.name} (Anniversary Edition)`;
        
        setFormData({
            name: versionName,
            release_date: '',
            cover_image_url: album.cover_image_url || '',
            album_type: versionType,
            parent_album_id: album.id,
            status: 'Unreleased',
            selectedSongs: []
        });
        setImageFile(null);
        setShowCreateVersionModal(true);
    };

    const openAssignModal = (album) => {
        setSelectedAlbum(album);
        setShowAssignModal(true);
    };

    const handleAssignTracks = async (selectedSongIds) => {
        if (!selectedAlbum) return;

        setLoading(true);

        try {
            // First, remove all existing tracks for this album
            await supabase
                .from('album_tracks')
                .delete()
                .eq('album_id', selectedAlbum.id);

            // Then, insert new track assignments
            if (selectedSongIds.length > 0) {
                const tracks = selectedSongIds.map((songId, index) => ({
                    album_id: selectedAlbum.id,
                    song_id: songId,
                    track_number: index + 1
                }));

                const { error } = await supabase
                    .from('album_tracks')
                    .insert(tracks);

                if (error) throw error;
            }

            alert('Tracks assigned successfully!');
            setShowAssignModal(false);
            setSelectedAlbum(null);
            fetchAlbums();
        } catch (error) {
            alert('Error assigning tracks: ' + error.message);
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    if (!isAdmin) {
        return (
            <div className="text-center py-10">
                <p className="text-red-500">Access Denied. You must be an admin to view this page.</p>
                <button onClick={() => navigate('/')} className="mt-4 px-4 py-2 bg-github-border rounded text-github-text">Go Home</button>
            </div>
        );
    }

    if (loading && albums.length === 0) {
        return <div className="p-8 text-center text-github-text-secondary">Loading albums...</div>;
    }

    return (
        <div>
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-github-text flex items-center gap-2">
                        <Disc className="w-6 h-6 text-github-accent" />
                        Album Releases
                    </h1>
                    <p className="text-github-text-secondary text-sm mt-1">
                        Create and manage albums, assign tracks from your archive
                    </p>
                </div>
                <button
                    onClick={() => {
                        setFormData({ name: '', release_date: '', cover_image_url: '' });
                        setImageFile(null);
                        setShowCreateModal(true);
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-github-accent text-white rounded-md hover:bg-github-accent/90 transition-colors"
                >
                    <Plus className="w-4 h-4" />
                    Create Album
                </button>
            </div>

            {albums.length === 0 ? (
                <div className="bg-github-bg-secondary border border-github-border rounded-lg p-12 text-center">
                    <Disc className="w-16 h-16 text-github-text-secondary mx-auto mb-4 opacity-50" />
                    <p className="text-github-text-secondary mb-4">No albums created yet.</p>
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="px-4 py-2 bg-github-accent text-white rounded-md hover:bg-github-accent/90 transition-colors"
                    >
                        Create Your First Album
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {albums.map(album => (
                        <AlbumCard
                            key={album.id}
                            album={album}
                            onCreateDeluxe={() => openCreateVersionModal(album, 'deluxe')}
                            onCreateAnniversary={() => openCreateVersionModal(album, 'anniversary')}
                        />
                    ))}
                </div>
            )}

            {/* Create Modal */}
            {showCreateModal && (
                <AlbumModal
                    title="Create Album"
                    formData={formData}
                    setFormData={setFormData}
                    imageFile={imageFile}
                    setImageFile={setImageFile}
                    onSubmit={handleCreateAlbum}
                    onClose={() => {
                        setShowCreateModal(false);
                        setFormData({ name: '', release_date: '', cover_image_url: '', album_type: 'standard', parent_album_id: null, status: 'Unreleased', selectedSongs: [] });
                        setImageFile(null);
                    }}
                    isCreateVersion={false}
                    albums={albums}
                    loading={loading}
                    selectedAlbumId={null}
                    songs={songs}
                />
            )}

            {/* Edit Modal */}
            {showEditModal && selectedAlbum && (
                <AlbumModal
                    title="Edit Album"
                    formData={formData}
                    setFormData={setFormData}
                    imageFile={imageFile}
                    setImageFile={setImageFile}
                    onSubmit={handleEditAlbum}
                    onClose={() => {
                        setShowEditModal(false);
                        setSelectedAlbum(null);
                        setFormData({ name: '', release_date: '', cover_image_url: '', album_type: 'standard', parent_album_id: null, status: 'Unreleased', selectedSongs: [] });
                        setImageFile(null);
                    }}
                    loading={loading}
                    existingImageUrl={selectedAlbum.cover_image_url}
                    isCreateVersion={false}
                    albums={albums}
                    selectedAlbumId={selectedAlbum?.id || null}
                    songs={songs}
                />
            )}

            {/* Create Version Modal (Deluxe/Anniversary) */}
            {showCreateVersionModal && selectedAlbum && (
                <AlbumModal
                    title={`Create ${formData.album_type === 'deluxe' ? 'Deluxe' : 'Anniversary'} Version`}
                    formData={formData}
                    setFormData={setFormData}
                    imageFile={imageFile}
                    setImageFile={setImageFile}
                    onSubmit={handleCreateAlbum}
                    onClose={() => {
                        setShowCreateVersionModal(false);
                        setSelectedAlbum(null);
                        setFormData({ name: '', release_date: '', cover_image_url: '', album_type: 'standard', parent_album_id: null, status: 'Unreleased', selectedSongs: [] });
                        setImageFile(null);
                    }}
                    loading={loading}
                    existingImageUrl={selectedAlbum.cover_image_url}
                    isCreateVersion={true}
                    albums={albums}
                    selectedAlbumId={null}
                    songs={songs}
                />
            )}

            {/* Assign Tracks Modal */}
            {showAssignModal && selectedAlbum && (
                <AssignTracksModal
                    album={selectedAlbum}
                    songs={songs}
                    onAssign={handleAssignTracks}
                    onClose={() => {
                        setShowAssignModal(false);
                        setSelectedAlbum(null);
                    }}
                    loading={loading}
                />
            )}
        </div>
    );
};

const AlbumCard = ({ album, onCreateDeluxe, onCreateAnniversary }) => {
    const isStandard = album.album_type === 'standard' || !album.album_type;
    const isDeluxe = album.album_type === 'deluxe';
    const isAnniversary = album.album_type === 'anniversary';

    return (
        <div className="group relative">
            <Link
                to={`/album/${album.id}`}
                className="block aspect-square bg-github-bg-secondary border border-github-border rounded-lg overflow-hidden hover:border-github-accent transition-colors relative"
            >
                {album.cover_image_url ? (
                    <img src={album.cover_image_url} alt={album.name} className="w-full h-full object-cover" />
                ) : (
                    <div className="w-full h-full flex items-center justify-center">
                        <Disc className="w-16 h-16 text-github-text-secondary opacity-50" />
                    </div>
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
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                    <h3 className="text-white font-bold text-lg opacity-0 group-hover:opacity-100 transition-opacity text-center px-4">
                        {album.name}
                    </h3>
                </div>
            </Link>
            <div className="mt-2 flex flex-col gap-2">
                <div className="flex gap-2">
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            openEditModal(album);
                        }}
                        className="flex-1 px-2 py-1 text-xs bg-github-bg border border-github-border text-github-text rounded hover:bg-github-border transition-colors flex items-center justify-center gap-1"
                    >
                        <Edit className="w-3 h-3" />
                        Edit
                    </button>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteAlbum(album.id);
                        }}
                        className="px-2 py-1 text-xs bg-red-900/20 border border-red-900/50 text-red-500 rounded hover:bg-red-900/30 transition-colors flex items-center justify-center"
                    >
                        <Trash2 className="w-3 h-3" />
                    </button>
                </div>
                {isStandard && (
                    <div className="flex gap-2">
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onCreateDeluxe();
                            }}
                            className="flex-1 px-2 py-1 text-xs bg-purple-600/20 border border-purple-600/50 text-purple-400 rounded hover:bg-purple-600/30 transition-colors flex items-center justify-center gap-1"
                        >
                            <Sparkles className="w-3 h-3" />
                            Deluxe
                        </button>
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onCreateAnniversary();
                            }}
                            className="flex-1 px-2 py-1 text-xs bg-yellow-600/20 border border-yellow-600/50 text-yellow-400 rounded hover:bg-yellow-600/30 transition-colors flex items-center justify-center gap-1"
                        >
                            <Gift className="w-3 h-3" />
                            Anniversary
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

const AlbumModal = ({ title, formData, setFormData, imageFile, setImageFile, onSubmit, onClose, loading, existingImageUrl, isCreateVersion = false, albums = [], selectedAlbumId = null, songs = [] }) => {
    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleFileChange = (e) => {
        if (e.target.files && e.target.files[0]) {
            setImageFile(e.target.files[0]);
        }
    };

    const toggleSong = (songId) => {
        setFormData(prev => {
            const selectedSongs = prev.selectedSongs || [];
            return {
                ...prev,
                selectedSongs: selectedSongs.includes(songId)
                    ? selectedSongs.filter(id => id !== songId)
                    : [...selectedSongs, songId]
            };
        });
    };

    const moveTrack = (index, direction) => {
        const newSongs = [...(formData.selectedSongs || [])];
        const newIndex = index + direction;
        if (newIndex >= 0 && newIndex < newSongs.length) {
            const temp = newSongs[index];
            newSongs[index] = newSongs[newIndex];
            newSongs[newIndex] = temp;
            setFormData(prev => ({ ...prev, selectedSongs: newSongs }));
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-github-bg-secondary border border-github-border rounded-lg p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-bold text-github-text">{title}</h2>
                    <button onClick={onClose} className="text-github-text-secondary hover:text-github-text">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={onSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className="space-y-4">
                            {/* ... (existing inputs) */}
                            <div>
                                <label className="block text-sm font-medium text-github-text-secondary mb-1">Album Name</label>
                                <input
                                    name="name"
                                    required
                                    value={formData.name}
                                    onChange={handleChange}
                                    className="w-full bg-github-bg border border-github-border rounded px-3 py-2 text-github-text"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-github-text-secondary mb-1">Release Date</label>
                                    <input
                                        type="date"
                                        name="release_date"
                                        required
                                        value={formData.release_date}
                                        onChange={handleChange}
                                        className="w-full bg-github-bg border border-github-border rounded px-3 py-2 text-github-text"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-github-text-secondary mb-1">Status</label>
                                    <select
                                        name="status"
                                        value={formData.status || 'Unreleased'}
                                        onChange={handleChange}
                                        className="w-full bg-github-bg border border-github-border rounded px-3 py-2 text-github-text"
                                    >
                                        <option value="Unreleased">Unreleased</option>
                                        <option value="Released">Released</option>
                                    </select>
                                </div>
                            </div>

                            {!isCreateVersion && (
                                <>
                                    <div>
                                        <label className="block text-sm font-medium text-github-text-secondary mb-1">Album Type</label>
                                        <select
                                            name="album_type"
                                            value={formData.album_type || 'standard'}
                                            onChange={handleChange}
                                            className="w-full bg-github-bg border border-github-border rounded px-3 py-2 text-github-text"
                                        >
                                            <option value="standard">Standard</option>
                                            <option value="deluxe">Deluxe</option>
                                            <option value="anniversary">Anniversary</option>
                                        </select>
                                    </div>

                                    {formData.album_type !== 'standard' && (
                                        <div>
                                            <label className="block text-sm font-medium text-github-text-secondary mb-1">Based On Album</label>
                                            <select
                                                name="parent_album_id"
                                                value={formData.parent_album_id || ''}
                                                onChange={handleChange}
                                                className="w-full bg-github-bg border border-github-border rounded px-3 py-2 text-github-text"
                                            >
                                                <option value="">Select parent album...</option>
                                                {albums.filter(a => (a.album_type === 'standard' || !a.album_type) && a.id !== selectedAlbumId).map(album => (
                                                    <option key={album.id} value={album.id}>{album.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                    )}
                                </>
                            )}

                            <div>
                                <label className="block text-sm font-medium text-github-text-secondary mb-1">Cover Image</label>
                                {existingImageUrl && !imageFile && (
                                    <div className="mb-2">
                                        <img src={existingImageUrl} alt="Current" className="h-20 w-20 object-cover rounded border border-github-border" />
                                    </div>
                                )}
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={handleFileChange}
                                    className="w-full bg-github-bg border border-github-border rounded px-3 py-2 text-github-text file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-github-accent file:text-white"
                                />
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-github-text-secondary mb-2">Tracklist Order</label>
                                <div className="bg-github-bg border border-github-border rounded p-2 h-[200px] overflow-y-auto space-y-1">
                                    {(formData.selectedSongs || []).map((songId, index) => {
                                        const song = songs.find(s => s.id === songId);
                                        return (
                                            <div key={songId} className="flex items-center gap-2 p-2 bg-github-bg-secondary border border-github-border rounded text-xs">
                                                <span className="w-4 font-mono text-github-text-secondary">{index + 1}</span>
                                                <span className="flex-1 text-github-text truncate">{song?.title || 'Unknown Song'}</span>
                                                <div className="flex gap-1">
                                                    <button type="button" onClick={() => moveTrack(index, -1)} disabled={index === 0} className="p-1 hover:bg-github-border rounded disabled:opacity-30">
                                                        <ArrowUp className="w-3 h-3" />
                                                    </button>
                                                    <button type="button" onClick={() => moveTrack(index, 1)} disabled={index === (formData.selectedSongs?.length || 0) - 1} className="p-1 hover:bg-github-border rounded disabled:opacity-30">
                                                        <ArrowDown className="w-3 h-3" />
                                                    </button>
                                                    <button type="button" onClick={() => toggleSong(songId)} className="p-1 hover:bg-red-900/30 text-red-500 rounded">
                                                        <X className="w-3 h-3" />
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                    {(formData.selectedSongs || []).length === 0 && (
                                        <p className="text-center py-4 text-github-text-secondary text-xs italic">No tracks selected</p>
                                    )}
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-github-text-secondary mb-2">Archive Songs</label>
                                <div className="bg-github-bg border border-github-border rounded p-2 h-[200px] overflow-y-auto space-y-1">
                                    {songs.map(song => {
                                        const isSelected = (formData.selectedSongs || []).includes(song.id);
                                        return (
                                            <div
                                                key={song.id}
                                                onClick={() => toggleSong(song.id)}
                                                className={`flex items-center gap-2 p-2 rounded cursor-pointer hover:bg-github-border/30 transition-colors ${
                                                    isSelected ? 'bg-github-accent/10 border-github-accent/30' : 'border-transparent'
                                                } border text-xs`}
                                            >
                                                <div className={`w-3 h-3 rounded-full border flex items-center justify-center ${
                                                    isSelected ? 'bg-github-accent border-github-accent' : 'border-github-border'
                                                }`}>
                                                    {isSelected && <Check className="w-2 h-2 text-white" />}
                                                </div>
                                                <span className="text-github-text truncate">{song.title}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-3 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-2 bg-github-border hover:bg-gray-700 text-github-text rounded transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-1 px-4 py-2 bg-github-accent hover:bg-github-accent-hover disabled:bg-opacity-50 text-white rounded transition-colors"
                        >
                            {loading ? 'Saving...' : 'Save Album'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const AssignTracksModal = ({ album, songs, onAssign, onClose, loading }) => {
    const [selectedSongs, setSelectedSongs] = useState([]);
    const [albumTracks, setAlbumTracks] = useState([]);

    useEffect(() => {
        const fetchAlbumTracks = async () => {
            const { data } = await supabase
                .from('album_tracks')
                .select('song_id')
                .eq('album_id', album.id);

            if (data) {
                const trackIds = data.map(t => t.song_id);
                setSelectedSongs(trackIds);
                setAlbumTracks(trackIds);
            }
        };
        fetchAlbumTracks();
    }, [album.id]);

    const toggleSong = (songId) => {
        setSelectedSongs(prev =>
            prev.includes(songId)
                ? prev.filter(id => id !== songId)
                : [...prev, songId]
        );
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        onAssign(selectedSongs);
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-github-bg-secondary border border-github-border rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-bold text-github-text">Assign Tracks to {album.name}</h2>
                    <button onClick={onClose} className="text-github-text-secondary hover:text-github-text">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="bg-github-bg border border-github-border rounded p-4 max-h-96 overflow-y-auto">
                        <div className="space-y-2">
                            {songs.map(song => {
                                const isSelected = selectedSongs.includes(song.id);
                                return (
                                    <label
                                        key={song.id}
                                        className={`flex items-center gap-3 p-2 rounded cursor-pointer hover:bg-github-border/30 ${
                                            isSelected ? 'bg-github-accent/20' : ''
                                        }`}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={isSelected}
                                            onChange={() => toggleSong(song.id)}
                                            className="w-4 h-4"
                                        />
                                        <Music className="w-4 h-4 text-github-text-secondary" />
                                        <span className="flex-1 text-github-text text-sm">{song.title}</span>
                                        <span className="text-xs text-github-text-secondary">
                                            {song.date_written || song.created_at?.split('T')[0]}
                                        </span>
                                    </label>
                                );
                            })}
                        </div>
                    </div>

                    <p className="text-xs text-github-text-secondary">
                        {selectedSongs.length} track{selectedSongs.length !== 1 ? 's' : ''} selected
                    </p>

                    <div className="flex gap-3 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-2 bg-github-border hover:bg-gray-700 text-github-text rounded transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-1 px-4 py-2 bg-github-accent hover:bg-github-accent-hover disabled:bg-opacity-50 text-white rounded transition-colors"
                        >
                            {loading ? 'Saving...' : 'Assign Tracks'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default Albums;

