# Kwpid Archives

## Overview
A React-based song archive application that displays and manages a collection of songs. Built with React, Vite, and Supabase for backend data storage.

## Project Structure
- `src/` - React source code
  - `pages/` - Page components (Home, AlbumDetail, SongDetail, AdminUpload, etc.)
  - `contexts/` - React contexts (AuthProvider)
  - `layouts/` - Layout components (MainLayout)
  - `lib/` - Utility libraries (supabase client, eraUtils, songImageUtils)
- `public/` - Static assets
- `index.html` - Entry HTML file

## Tech Stack
- React 19 with Vite 7
- Tailwind CSS for styling
- Supabase for backend (database & storage)
- React Router for navigation

## Environment Variables
The app requires the following Supabase environment variables:
- `VITE_SUPABASE_URL` - Supabase project URL
- `VITE_SUPABASE_ANON_KEY` - Supabase anonymous key

## Development
- Run `npm run dev` to start the development server on port 5000
- Run `npm run build` to build for production

## Deployment
Configured for static deployment, builds to `dist/` directory.
