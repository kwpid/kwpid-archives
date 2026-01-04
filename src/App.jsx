import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import MainLayout from './layouts/MainLayout';
import Home from './pages/Home';
import Archive from './pages/Archive';
import SongDetail from './pages/SongDetail';
import Login from './pages/Login';
import SignUp from './pages/SignUp';
import AdminUpload from './pages/AdminUpload';
import AdminEdit from './pages/AdminEdit';
import Settings from './pages/Settings';
import Albums from './pages/Albums';
import AlbumDetail from './pages/AlbumDetail';
import { AuthProvider } from './contexts/AuthProvider';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<MainLayout />}>
            <Route index element={<Home />} />
            <Route path="archive/:category" element={<Archive />} />
            <Route path="song/:id" element={<SongDetail />} />
            <Route path="login" element={<Login />} />
            <Route path="signup" element={<SignUp />} />
            <Route path="upload" element={<AdminUpload />} />
            <Route path="edit/:id" element={<AdminEdit />} />
            <Route path="settings" element={<Settings />} />
            <Route path="albums" element={<Albums />} />
            <Route path="album/:id" element={<AlbumDetail />} />

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
