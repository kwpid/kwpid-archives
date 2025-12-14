import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthProvider';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

const AdminUpload = () => {
    const { isAdmin } = useAuth();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [imageFile, setImageFile] = useState(null);

    const [formData, setFormData] = useState({
        title: '',
        category: 'Full',
        sub_category: 'Released',
        lyrics: '',
        date_written: '',
        version_number: '1.0',
        beat_link: '',
        description: '',
        time_taken: '',
    });

    // Enforce Written -> Demo logic
    useEffect(() => {
        if (formData.category === 'Written') {
            setFormData(prev => ({ ...prev, sub_category: 'Demos' }));
        }
    }, [formData.category]);

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
        setLoading(true);

        try {
            let imageUrl = '';

            if (imageFile) {
                imageUrl = await uploadImage(imageFile);
            }

            // Prepare data for insertion (convert empty strings to null where necessary)
            const songData = {
                ...formData,
                date_written: formData.date_written || null,
                image_url: imageUrl || null
            };

            const { error } = await supabase
                .from('songs')
                .insert([songData]);

            if (error) throw error;

            alert('Song uploaded successfully!');
            navigate('/');
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

    const isWritten = formData.category === 'Written';

    return (
        <div className="max-w-2xl mx-auto">
            <h1 className="text-2xl font-bold text-github-text mb-6">Upload New Song</h1>
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
                    <label className="block text-sm font-medium text-github-text-secondary mb-1">Cover Image {isWritten && <span className="text-xs">(Optional)</span>}</label>
                    <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileChange}
                        className="w-full bg-github-bg border border-github-border rounded px-3 py-2 text-github-text file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-github-accent file:text-white hover:file:bg-github-accent-hover"
                    />
                    <p className="mt-1 text-xs text-github-text-secondary">Upload an image for the song cover.</p>
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
