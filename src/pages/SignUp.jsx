import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthProvider';
import { useNavigate, Link } from 'react-router-dom';

const SignUp = () => {
    const { signUp } = useAuth();
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [username, setUsername] = useState('');
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSignUp = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setMessage('');

        if (username.length < 3) {
            setError('Username must be at least 3 characters.');
            setLoading(false);
            return;
        }

        const { data, error } = await signUp(email, password, username);

        if (error) {
            setError(error.message);
        } else {
            // Check if email confirmation is required by Supabase settings
            if (data?.user && !data.session) {
                setMessage('Account created! Please check your email to confirm your account.');
            } else {
                navigate('/'); // Auto logged in (if email confirmation is off)
            }
        }
        setLoading(false);
    };

    return (
        <div className="max-w-md mx-auto mt-10 p-6 bg-github-bg-secondary border border-github-border rounded-lg">
            <h2 className="text-2xl font-bold text-github-text mb-6 text-center">Create Account</h2>

            {error && <div className="mb-4 p-3 bg-red-900/30 border border-red-800 text-red-200 text-sm rounded">{error}</div>}
            {message && <div className="mb-4 p-3 bg-green-900/30 border border-green-800 text-green-200 text-sm rounded">{message}</div>}

            <form onSubmit={handleSignUp} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-github-text-secondary mb-1">Username</label>
                    <input
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        className="w-full bg-github-bg border border-github-border rounded-md px-3 py-2 text-github-text focus:outline-none focus:border-github-accent"
                        placeholder="Username"
                        required
                        minLength={3}
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-github-text-secondary mb-1">Email</label>
                    <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full bg-github-bg border border-github-border rounded-md px-3 py-2 text-github-text focus:outline-none focus:border-github-accent"
                        placeholder="you@example.com"
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
                        minLength={6}
                    />
                </div>

                <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-2 px-4 bg-github-accent hover:bg-github-accent-hover disabled:bg-opacity-50 text-white font-medium rounded-md transition-colors"
                >
                    {loading ? 'Creating Account...' : 'Sign Up'}
                </button>
            </form>

            <div className="mt-6 text-center text-sm text-github-text-secondary">
                Already have an account?{' '}
                <Link to="/login" className="text-github-accent-text hover:underline">
                    Log in
                </Link>
            </div>
        </div>
    );
};

export default SignUp;
