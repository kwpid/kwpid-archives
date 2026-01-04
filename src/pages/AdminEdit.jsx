import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthProvider';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';

const AdminEdit = () => {
    const { isAdmin } = useAuth();
    const navigate = useNavigate();
    const { id } = useParams();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [imageFile, setImageFile] = useState(null);

    const [formData, setFormData] = useState({
        title: '',
        category: 'Full',
        sub_category: 'Released',
        lyrics: '',
        date_written: '',
        version_number: '',
        beat_link: '',
        description: '',
        time_taken: '',
        producer: '',
        image_url: ''
    });

    useEffect(() => {
        const fetchSong = async () => {
            if (!id) return;

            const { data, error } = await supabase
                .from('songs')
                .select('*')
                .eq('id', id)
                .single();

            if (error) {
                alert('Error fetching song: ' + error.message);
                navigate('/');
            } else {
                setFormData({
                    title: data.title || '',
                    category: data.category || 'Full',
                    sub_category: data.sub_category || 'Released',
                    lyrics: data.lyrics || '',
                    date_written: data.date_written || '',
                    version_number: data.version_number || '',
                    beat_link: data.beat_link || '',
                    description: data.description || '',
                    time_taken: data.time_taken || '',
                    producer: data.producer || '',
                    image_url: data.image_url || ''
                });
            }
            setLoading(false);
        };

        fetchSong();
    }, [id, navigate]);

    // Enforce Written -> Demo logic
    useEffect(() => {
        if (formData.category === 'Written') {
            const currentSub = formData.sub_category;
            if (currentSub !== 'Demos') {
                setFormData(prev => ({ ...prev, sub_category: 'Demos' }));
            }
        }
    }, [formData.category, formData.sub_category]);

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

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);

        try {
            let imageUrl = formData.image_url;

            if (imageFile) {
                imageUrl = await uploadImage(imageFile);
            }

            // Prepare data for insertion (convert empty date strings to null)
            const songData = {
                ...formData,
                date_written: formData.date_written || null,
                image_url: imageUrl || null
            };

            const { error } = await supabase
                .from('songs')
                .update(songData)
                .eq('id', id);

            if (error) throw error;

            alert('Song updated successfully!');
            navigate(`/song/${id}`);
        } catch (error) {
            alert('Error updating song: ' + error.message);
            console.error(error);
        } finally {
            setSaving(false);
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

    if (loading) return <div className="text-center py-10">Loading song data...</div>;

    const isWritten = formData.category === 'Written';

    return (
        <div className="max-w-2xl mx-auto">
            <h1 className="text-2xl font-bold text-github-text mb-6">Edit Song</h1>
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
                            <option value="Written">Written</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-github-text-secondary mb-1">Sub Category</label>
                        {isWritten ? (
                            <input
                                value="Demos (Auto)"
                                disabled
                                className="w-full bg-github-bg border border-github-border rounded px-3 py-2 text-github-text-secondary opacity-70 cursor-not-allowed"
                            />
                        ) : (
                            <select name="sub_category" value={formData.sub_category} onChange={handleChange} className="w-full bg-github-bg border border-github-border rounded px-3 py-2 text-github-text">
                                <option value="Released">Released</option>
                                <option value="Unreleased">Unreleased</option>
                                <option value="Demos">Demos</option>
                                <option value="Sessions">Sessions</option>
                            </select>
                        )}
                        {isWritten && <p className="text-xs text-github-text-secondary mt-1">Written songs are automatically categorized as Demos.</p>}
                    </div>
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
                        <label className="block text-sm font-medium text-github-text-secondary mb-1">Date Written {isWritten && <span className="text-xs">(Optional)</span>}</label>
                        <input type="date" name="date_written" value={formData.date_written} onChange={handleChange} className="w-full bg-github-bg border border-github-border rounded px-3 py-2 text-github-text" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-github-text-secondary mb-1">Time Taken</label>
                        <input name="time_taken" value={formData.time_taken} onChange={handleChange} placeholder="e.g. 2 hours" className="w-full bg-github-bg border border-github-border rounded px-3 py-2 text-github-text" />
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-github-text-secondary mb-1">Beat Link (URL) {isWritten && <span className="text-xs">(Optional)</span>}</label>
                    <input name="beat_link" value={formData.beat_link} onChange={handleChange} className="w-full bg-github-bg border border-github-border rounded px-3 py-2 text-github-text" />
                </div>

                <div>
                    <label className="block text-sm font-medium text-github-text-secondary mb-1">Producer {isWritten && <span className="text-xs">(Optional)</span>}</label>
                    <input name="producer" value={formData.producer} onChange={handleChange} placeholder="e.g. aura" className="w-full bg-github-bg border border-github-border rounded px-3 py-2 text-github-text" />
                    <p className="mt-1 text-xs text-github-text-secondary">Will be formatted as "prod. [name]" in displays</p>
                </div>

                <div>
                    <label className="block text-sm font-medium text-github-text-secondary mb-1">Cover Image {isWritten && <span className="text-xs">(Optional)</span>}</label>
                    {formData.image_url && !imageFile && (
                        <div className="mb-2">
                            <img src={formData.image_url} alt="Current" className="h-20 w-20 object-cover rounded border border-github-border" />
                            <p className="text-xs text-github-text-secondary">Current Image</p>
                        </div>
                    )}
                    <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileChange}
                        className="w-full bg-github-bg border border-github-border rounded px-3 py-2 text-github-text file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-github-accent file:text-white hover:file:bg-github-accent-hover"
                    />
                </div>

                <div className="pt-4 flex gap-4">
                    <button
                        type="button"
                        onClick={() => navigate(`/song/${id}`)}
                        className="flex-1 bg-github-border hover:bg-gray-700 text-github-text font-bold py-2 px-4 rounded transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={saving}
                        className="flex-1 bg-github-accent hover:bg-github-accent-hover disabled:bg-opacity-50 text-white font-bold py-2 px-4 rounded transition-colors"
                    >
                        {saving ? 'Saving...' : 'Update Song'}
                    </button>
                </div>

            </form>
        </div>
    );
};

export default AdminEdit;
