import React from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { Music, FileText, Menu, X, User, Upload, LogOut, Disc } from 'lucide-react';
import { useState } from 'react';
import clsx from 'clsx';
import { useAuth } from '../contexts/AuthProvider';

const MainLayout = () => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const location = useLocation();
    const { user, isAdmin, signOut } = useAuth();

    const toggleMenu = () => setIsMenuOpen(!isMenuOpen);

    const isActive = (path) => location.pathname === path;

    return (
        <div className="min-h-screen bg-github-bg text-github-text flex flex-col font-sans">
            {/* Navbar */}
            <header className="bg-github-bg-secondary border-b border-github-border sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16">

                        {/* Logo */}
                        <div className="flex-shrink-0">
                            <Link to="/" className="text-github-text font-bold text-xl flex items-center gap-2 hover:text-github-accent-text transition-colors">
                                <Music className="w-6 h-6 text-github-accent" />
                                Kwpid Archives
                            </Link>
                        </div>

                        {/* Desktop Nav */}
                        <div className="hidden md:flex items-center space-x-4">
                            <NavLink to="/" active={isActive('/')}>Dashboard</NavLink>
                            <NavLink to="/archive/full" active={isActive('/archive/full')}>Files</NavLink>
                            <NavLink to="/albums" active={isActive('/albums')}>
                                <Disc className="w-4 h-4 inline-block mr-1" /> Albums
                            </NavLink>
                            <NavLink to="/settings" active={isActive('/settings')}>Settings</NavLink>

                            {isAdmin && (
                                <Link
                                    to="/upload"
                                    className={clsx(
                                        "flex items-center gap-1 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                                        isActive('/upload') ? "bg-github-accent text-white" : "text-github-accent-text hover:bg-github-border"
                                    )}
                                >
                                    <Upload className="w-4 h-4" /> Upload
                                </Link>
                            )}

                            {user ? (
                                <button
                                    onClick={signOut}
                                    className="flex items-center gap-1 px-3 py-2 rounded-md text-sm font-medium text-github-text-secondary hover:text-red-400 transition-colors"
                                    title="Sign Out"
                                >
                                    <LogOut className="w-4 h-4" />
                                </button>
                            ) : (
                                <NavLink to="/login" active={isActive('/login')}>Login</NavLink>
                            )}
                        </div>

                        {/* Mobile menu button */}
                        <div className="md:hidden">
                            <button
                                onClick={toggleMenu}
                                className="inline-flex items-center justify-center p-2 rounded-md text-github-text hover:text-white hover:bg-github-border focus:outline-none"
                            >
                                {isMenuOpen ? <X className="block h-6 w-6" /> : <Menu className="block h-6 w-6" />}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Mobile Menu */}
                {isMenuOpen && (
                    <div className="md:hidden bg-github-bg-secondary border-b border-github-border">
                        <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
                            <MobileNavLink to="/" onClick={toggleMenu}>Dashboard</MobileNavLink>
                            <MobileNavLink to="/archive/full" onClick={toggleMenu}>Files</MobileNavLink>
                            <MobileNavLink to="/albums" onClick={toggleMenu}>Albums</MobileNavLink>
                            <MobileNavLink to="/settings" onClick={toggleMenu}>Settings</MobileNavLink>

                            {isAdmin && (
                                <MobileNavLink to="/upload" onClick={toggleMenu} className="text-github-accent-text">
                                    + Upload Song
                                </MobileNavLink>
                            )}

                            {user ? (
                                <button
                                    onClick={() => { signOut(); toggleMenu(); }}
                                    className="block w-full text-left px-3 py-2 rounded-md text-base font-medium text-red-400 hover:bg-github-border"
                                >
                                    Sign Out
                                </button>
                            ) : (
                                <MobileNavLink to="/login" onClick={toggleMenu}>Login</MobileNavLink>
                            )}
                        </div>
                    </div>
                )}
            </header>

            {/* Content */}
            <main className="flex-grow max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
                <Outlet />
            </main>

            {/* Footer */}
            <footer className="bg-github-bg-secondary border-t border-github-border py-6 mt-auto">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-xs text-github-text-secondary">
                    <p>&copy; {new Date().getFullYear()} Kwpid Archives. All rights reserved.</p>
                </div>
            </footer>
        </div>
    );
};

const NavLink = ({ to, active, children }) => (
    <Link
        to={to}
        className={clsx(
            "px-3 py-2 rounded-md text-sm font-medium transition-colors",
            active
                ? "bg-github-border text-white"
                : "text-github-text-secondary hover:text-github-text hover:bg-github-border"
        )}
    >
        {children}
    </Link>
);

const MobileNavLink = ({ to, onClick, children, className }) => (
    <Link
        to={to}
        onClick={onClick}
        className={clsx(
            "block px-3 py-2 rounded-md text-base font-medium text-github-text hover:text-white hover:bg-github-border",
            className
        )}
    >
        {children}
    </Link>
);

export default MainLayout;
