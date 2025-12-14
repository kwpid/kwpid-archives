import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthProvider';
import { useNavigate, Link } from 'react-router-dom';

const Login = () => {
    const { signIn } = useAuth();
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        const { error } = await signIn(email, password);
        if (error) {
            setError(error.message);
            setLoading(false);
        } else {
            navigate('/upload'); // Redirect to upload or home
        }
    };

    return (
        <div className="max-w-md mx-auto mt-10 p-6 bg-github-bg-secondary border border-github-border rounded-lg">
            <h2 className="text-2xl font-bold text-github-text mb-6 text-center">Admin Login</h2>
            {error && <div className="mb-4 p-3 bg-red-900/30 border border-red-800 text-red-200 text-sm rounded">{error}</div>}
            <form onSubmit={handleLogin} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-github-text-secondary mb-1">Email</label>
                    <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full bg-github-bg border border-github-border rounded-md px-3 py-2 text-github-text focus:outline-none focus:border-github-accent"
                        placeholder="admin@example.com"
                        required
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-github-text-secondary mb-1">Password</label>
                    <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full bg-github-bg border border-github-border rounded-md px-3 py-2 text-github-text focus:outline-none focus:border-github-accent"
                        placeholder="••••••••"
                        required
                    />
                </div>
                <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-2 px-4 bg-github-accent hover:bg-github-accent-hover disabled:bg-opacity-50 text-white font-medium rounded-md transition-colors"
                >
                    {loading ? 'Signing In...' : 'Sign In'}
                </button>
            </form>
            <div className="mt-6 text-center text-sm text-github-text-secondary">
                Don't have an account?{' '}
                <Link to="/signup" className="text-github-accent-text hover:underline">
                    Sign up
                </Link>
            </div>
        </div>
    );
};

export default Login;
