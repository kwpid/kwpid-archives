import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Disc, Music } from 'lucide-react';
import { supabase } from '../lib/supabase';

const formatDate = (dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('en-US', {
        month: '2-digit',
        day: '2-digit',
        year: 'numeric'
    });
};

const Home = () => {
    const [latestReleases, setLatestReleases] = useState([]);
    const [counts, setCounts] = useState({ full: 0, written: 0 });

    useEffect(() => {
        const fetchData = async () => {
            // Fetch latest 3 songs
            const { data: latestData } = await supabase
                .from('songs')
                .select('*')
                .neq('category', 'Written')
                .order('created_at', { ascending: false })
                .limit(3);

            if (latestData) {
                setLatestReleases(latestData);
            }

            // Fetch counts (approximate)
            const { count: fullCount } = await supabase.from('songs').select('*', { count: 'exact', head: true }).eq('category', 'Full');
            const { count: writtenCount } = await supabase.from('songs').select('*', { count: 'exact', head: true }).eq('category', 'Written');

            setCounts({
                full: fullCount || 0,
                written: writtenCount || 0
            });
        };

        fetchData();
    }, []);

    return (
        <div className="space-y-8">
            {/* Hero / Welcome */}
            <div className="bg-github-bg-secondary border border-github-border rounded-lg p-8 text-center">
                <h1 className="text-3xl font-bold text-github-text mb-4">Welcome to Kwpid Archives</h1>
                <p className="text-github-text-secondary max-w-2xl mx-auto mb-6">
                    A collection of my musical works, including fully produced tracks and written lyrics.
                </p>
                <div className="flex justify-center gap-4">
                    <Link to="/archive/full" className="px-5 py-2 bg-github-accent hover:bg-github-accent-hover text-white rounded-md font-medium transition-colors">
                        Browse Full Songs
                    </Link>
                    <Link to="/archive/written" className="px-5 py-2 bg-github-border hover:bg-gray-700 text-github-text rounded-md font-medium transition-colors">
                        View Written Works
                    </Link>
                </div>
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                {/* Latest Releases Section */}
                <div className="bg-github-bg-secondary border border-github-border rounded-lg p-6 flex flex-col">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-xl font-semibold text-github-text flex items-center gap-2">
                            <Disc className="w-5 h-5 text-github-accent" />
                            Latest Releases
                        </h2>
                    </div>

                    <div className="flex-grow space-y-3">
                        {latestReleases.length > 0 ? (
                            latestReleases.map(song => (
                                <Link
                                    key={song.id}
                                    to={`/song/${song.id}`}
                                    className="block bg-github-bg border border-github-border rounded-md p-3 hover:border-github-accent-text transition-colors group"
                                >
                                    <div className="flex gap-3 items-center">
                                        <div className="w-12 h-12 bg-github-bg-secondary flex-shrink-0 rounded overflow-hidden border border-github-border flex items-center justify-center">
                                            {song.image_url ? (
                                                <img src={song.image_url} alt={song.title} className="w-full h-full object-cover" />
                                            ) : (
                                                <Music className="w-6 h-6 text-github-text-secondary opacity-50" />
                                            )}
                                        </div>
                                        <div className="flex-grow min-w-0">
                                            <h3 className="font-bold text-github-text text-sm truncate group-hover:text-github-accent-text">{song.title}</h3>
                                            <div className="flex items-center gap-2 text-xs text-github-text-secondary">
                                                <span>{song.sub_category || song.category}</span>
                                                <span>•</span>
                                                <span>{formatDate(song.date_written) || formatDate(song.created_at)}</span>
                                            </div>
                                        </div>
                                        <ArrowRight className="w-4 h-4 text-github-text-secondary opacity-0 group-hover:opacity-100 transition-opacity" />
                                    </div>
                                </Link>
                            ))
                        ) : (
                            <div className="p-4 bg-github-bg border border-github-border rounded-md flex-grow flex items-center justify-center h-full">
                                <p className="text-github-text-secondary text-center italic">No releases found yet.</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Categories Section */}
                <div className="bg-github-bg-secondary border border-github-border rounded-lg p-6">
                    <h2 className="text-xl font-semibold text-github-text mb-4">Categories</h2>
                    <div className="space-y-3">
                        <CategoryCard title="Full Songs" count={counts.full} desc="Freestyled or written over a beat" to="/archive/full" />
                        <CategoryCard title="Written" count={counts.written} desc="Lyrics written with melody in mind" to="/archive/written" />
                    </div>
                </div>
            </div>
        </div>
    );
};

const CategoryCard = ({ title, count, desc, to }) => (
    <Link to={to} className="block p-4 bg-github-bg border border-github-border rounded-md hover:border-github-accent-text transition-colors group">
        <div className="flex justify-between items-center mb-1">
            <h3 className="text-github-text font-medium group-hover:text-github-accent-text">{title}</h3>
            <span className="bg-github-border text-xs px-2 py-1 rounded-full text-github-text-secondary">{count}</span>
        </div>
        <p className="text-sm text-github-text-secondary">{desc}</p>
    </Link>
);

export default Home;
