import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthProvider';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';

const AdminUpload = () => {
    const { isAdmin } = useAuth();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const [loading, setLoading] = useState(false);
    const [imageFile, setImageFile] = useState(null);
    const [audioFile, setAudioFile] = useState(null);

    // Check if we are in "Create Session" mode
    const mode = searchParams.get('mode'); // 'session'
    const sourceId = searchParams.get('source');

    const [formData, setFormData] = useState({
        title: '',
        category: 'Full',
        sub_category: 'Throwaway Track (Complete)',
        alt_type: '', // New field for alternate types
        is_released: false,
        lyrics: '',
        date_written: '',
        version_number: '1.0',
        beat_link: '',
        description: '',
        alt_names: '', // Comma-separated string for input
        time_taken: '',
        producer: '',
        parent_id: null,
        image_url: '' // To hold the parent image URL if copying
    });

    // Fetch parent song data if in session/alt mode
    useEffect(() => {
        const fetchParent = async () => {
            if ((mode === 'session' || mode === 'alt') && sourceId) {
                setLoading(true);
                const { data, error } = await supabase.from('songs').select('*').eq('id', sourceId).single();
                if (data) {
                    setFormData(prev => ({
                        ...prev,
                        title: `${data.title} (Alt)`,
                        category: data.category,
                        sub_category: 'Sessions', // Default for now, can be changed
                        alt_type: 'Session File', // Default alt type
                        lyrics: data.lyrics,
                        date_written: data.date_written,
                        version_number: data.version_number,
                        beat_link: data.beat_link,
                        description: `Alternate version of ${data.title}`,
                        time_taken: data.time_taken,
                        alt_names: (data.alt_names || []).join(', '),
                        parent_id: data.id,
                        image_url: data.image_url
                    }));
                }
                setLoading(false);
            }
        };
        fetchParent();
    }, [mode, sourceId]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleFileChange = (e) => {
        if (e.target.files && e.target.files[0]) {
            setImageFile(e.target.files[0]);
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

    const uploadAudio = async (file) => {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const filePath = `${fileName}`;

        const { error: uploadError } = await supabase.storage
            .from('song-files')
            .upload(filePath, file);

        if (uploadError) {
            throw uploadError;
        }

        const { data } = supabase.storage
            .from('song-files')
            .getPublicUrl(filePath);

        return data.publicUrl;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            let imageUrl = formData.image_url;

            if (imageFile) {
                imageUrl = await uploadImage(imageFile);
            }

            let audioUrl = null;
            if (audioFile) {
                audioUrl = await uploadAudio(audioFile);
            }

            // Prepare data for insertion (convert empty strings to null where necessary)
            const songData = {
                ...formData,
                date_written: formData.date_written || null,
                image_url: imageUrl || null,
                audio_url: audioUrl || null,
                alt_names: formData.alt_names ? formData.alt_names.split(',').map(s => s.trim()).filter(Boolean) : null,
                alt_names: formData.alt_names ? formData.alt_names.split(',').map(s => s.trim()).filter(Boolean) : null,
                sub_category: formData.alt_type || formData.sub_category
            };

            // Ensure sub_category is a valid value for the database constraint
            // The database might still have the old constraint if migration failed
            // We'll map the new types to 'Sessions' if they are alt files to avoid constraint errors
            if (isAltMode) {
                // If it's an alt file, we use 'Sessions' as the database value 
                // to satisfy the old constraint while keeping the UI descriptive
                songData.sub_category = 'Sessions';
                // Store the descriptive type in description if needed, or just rely on parent_id
                songData.description = `[${formData.alt_type || 'Alt'}] ${songData.description}`;
            }

            // Remove alt_type before sending to Supabase if the column doesn't exist
            delete songData.alt_type;

            const { error } = await supabase
                .from('songs')
                .insert([songData]);

            if (error) throw error;

            alert('Song uploaded successfully!');
            if ((mode === 'session' || mode === 'alt') && sourceId) {
                navigate(`/song/${sourceId}`); // Go back to parent
            } else {
                navigate('/');
            }
        } catch (error) {
            alert('Error uploading song: ' + error.message);
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

    const isAltMode = mode === 'session' || mode === 'alt';

    return (
        <div className="max-w-2xl mx-auto">
            <h1 className="text-2xl font-bold text-github-text mb-6">
                {isAltMode ? 'Create Alt. File' : 'Upload New Song'}
            </h1>
            <form onSubmit={handleSubmit} className="space-y-6 bg-github-bg-secondary border border-github-border p-6 rounded-lg">

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-github-text-secondary mb-1">Title</label>
                        <input name="title" required value={formData.title} onChange={handleChange} className="w-full bg-github-bg border border-github-border rounded px-3 py-2 text-github-text" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-github-text-secondary mb-1">Version</label>
                        <input name="version_number" value={formData.version_number} onChange={handleChange} className="w-full bg-github-bg border border-github-border rounded px-3 py-2 text-github-text" />
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-github-text-secondary mb-1">Category</label>
                        <select name="category" value={formData.category} onChange={handleChange} className="w-full bg-github-bg border border-github-border rounded px-3 py-2 text-github-text">
                            <option value="Full">Full Song</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-github-text-secondary mb-1">Type</label>
                        {isAltMode ? (
                            <select name="alt_type" value={formData.alt_type} onChange={handleChange} className="w-full bg-github-bg border border-github-border rounded px-3 py-2 text-github-text">
                                <option value="Session File">Session File</option>
                                <option value="Alt. Mix">Alt. Mix</option>
                                <option value="Alt. Beat">Alt. Beat</option>
                                <option value="Alt. Lyrics">Alt. Lyrics</option>
                            </select>
                        ) : (
                            <select name="sub_category" value={formData.sub_category} onChange={handleChange} className="w-full bg-github-bg border border-github-border rounded px-3 py-2 text-github-text">
                                <option value="Throwaway Track (Complete)">Throwaway Track (Complete)</option>
                                <option value="Throwaway Track (Demo / Incomplete)">Throwaway Track (Demo / Incomplete)</option>
                                <option value="Released">Released</option>
                                <option value="Snippet">Snippet</option>
                            </select>
                        )}
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <input
                        type="checkbox"
                        name="is_released"
                        id="is_released"
                        checked={formData.is_released}
                        onChange={(e) => setFormData(prev => ({ ...prev, is_released: e.target.checked }))}
                        className="w-4 h-4 rounded border-github-border bg-github-bg text-github-accent focus:ring-github-accent"
                    />
                    <label htmlFor="is_released" className="text-sm font-medium text-github-text">Mark as Released (Publicly available)</label>
                </div>

                <div>
                    <label className="block text-sm font-medium text-github-text-secondary mb-1">Description</label>
                    <input name="description" value={formData.description} onChange={handleChange} className="w-full bg-github-bg border border-github-border rounded px-3 py-2 text-github-text" />
                </div>

                <div>
                    <label className="block text-sm font-medium text-github-text-secondary mb-1">Lyrics</label>
                    <textarea name="lyrics" rows={10} value={formData.lyrics} onChange={handleChange} className="w-full bg-github-bg border border-github-border rounded px-3 py-2 text-github-text font-mono text-sm" placeholder="[Verse 1]..." />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-github-text-secondary mb-1">Date Written</label>
                        <input type="date" name="date_written" value={formData.date_written} onChange={handleChange} className="w-full bg-github-bg border border-github-border rounded px-3 py-2 text-github-text" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-github-text-secondary mb-1">Time Taken</label>
                        <input name="time_taken" value={formData.time_taken} onChange={handleChange} placeholder="e.g. 2 hours" className="w-full bg-github-bg border border-github-border rounded px-3 py-2 text-github-text" />
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-github-text-secondary mb-1">Beat Link (URL)</label>
                    <input name="beat_link" value={formData.beat_link} onChange={handleChange} className="w-full bg-github-bg border border-github-border rounded px-3 py-2 text-github-text" />
                </div>

                <div>
                    <label className="block text-sm font-medium text-github-text-secondary mb-1">Producer</label>
                    <input name="producer" value={formData.producer} onChange={handleChange} placeholder="e.g. aura" className="w-full bg-github-bg border border-github-border rounded px-3 py-2 text-github-text" />
                    <p className="mt-1 text-xs text-github-text-secondary">Will be formatted as "prod. [name]" in displays</p>
                </div>

                <div>
                    <label className="block text-sm font-medium text-github-text-secondary mb-1">Alternate Names</label>
                    <input name="alt_names" value={formData.alt_names} onChange={handleChange} placeholder="e.g. Project X, The Lost Song" className="w-full bg-github-bg border border-github-border rounded px-3 py-2 text-github-text" />
                    <p className="mt-1 text-xs text-github-text-secondary">Comma-separated list of other names this song is known by.</p>
                </div>

                <div>
                    <label className="block text-sm font-medium text-github-text-secondary mb-1">Cover Image</label>
                    {isAltMode && formData.image_url && (
                        <div className="mb-2">
                            <span className="text-xs text-github-text-secondary">Inherited from parent (optional to change)</span>
                        </div>
                    )}
                    <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileChange}
                        className="w-full bg-github-bg border border-github-border rounded px-3 py-2 text-github-text file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-github-accent file:text-white hover:file:bg-github-accent-hover"
                    />
                    <p className="mt-1 text-xs text-github-text-secondary">Upload an image for the song cover.</p>
                </div>

                <div>
                    <label className="block text-sm font-medium text-github-text-secondary mb-1">Audio File (Legit File)</label>
                    <input
                        type="file"
                        accept=".mp3,.wav"
                        onChange={(e) => {
                            if (e.target.files && e.target.files[0]) {
                                setAudioFile(e.target.files[0]);
                            }
                        }}
                        className="w-full bg-github-bg border border-github-border rounded px-3 py-2 text-github-text file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-github-accent file:text-white hover:file:bg-github-accent-hover"
                    />
                    <p className="mt-1 text-xs text-github-text-secondary">Upload an MP3 or WAV file for playback.</p>
                </div>

                <div className="pt-4">
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-github-accent hover:bg-github-accent-hover disabled:bg-opacity-50 text-white font-bold py-2 px-4 rounded transition-colors"
                    >
                        {loading ? 'Uploading...' : 'Upload Song'}
                    </button>
                </div>

            </form>
        </div>
    );
};

export default AdminUpload;
